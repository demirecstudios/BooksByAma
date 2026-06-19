// Suggested location: app/admin/quiz/[bookId].tsx
// Navigate here e.g. router.push(`/admin/quiz/${book.id}?bookTitle=${encodeURIComponent(book.title)}`)

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase";

type Option = {
  id: string;
  option_text: string;
  is_correct: boolean;
  order_number: number;
};

type Question = {
  id: string;
  question: string;
  order_number: number;
  options: Option[];
};

// Editable option row used in the add/edit form (may not have an id yet)
type DraftOption = {
  id?: string;
  option_text: string;
  is_correct: boolean;
};

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;
const OPTION_LABELS = ["A", "B", "C", "D"];

function emptyOptions(): DraftOption[] {
  return [
    { option_text: "", is_correct: true },
    { option_text: "", is_correct: false },
  ];
}

export default function QuizEditorScreen() {
  const router = useRouter();
  const { bookId, bookTitle } = useLocalSearchParams<{
    bookId: string;
    bookTitle: string;
  }>();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<DraftOption[]>(emptyOptions());

  useEffect(() => {
    fetchQuestions();
  }, []);

  // ── Fetch all questions + their options ──
  async function fetchQuestions() {
    setLoading(true);

    const { data: qData, error: qErr } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("book_id", bookId)
      .order("order_number", { ascending: true });

    if (qErr || !qData) {
      setLoading(false);
      setQuestions([]);
      return;
    }

    if (qData.length === 0) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    const questionIds = qData.map((q) => q.id);
    const { data: optData } = await supabase
      .from("quiz_options")
      .select("*")
      .in("question_id", questionIds)
      .order("order_number", { ascending: true });

    const withOptions: Question[] = qData.map((q) => ({
      ...q,
      options: (optData || []).filter((o) => o.question_id === q.id),
    }));

    setQuestions(withOptions);
    setLoading(false);
  }

  // ── Option editing helpers ──
  function handleOptionTextChange(index: number, text: string) {
    setOptions((prev) =>
      prev.map((o, i) => (i === index ? { ...o, option_text: text } : o)),
    );
  }

  function handleSetCorrect(index: number) {
    setOptions((prev) =>
      prev.map((o, i) => ({ ...o, is_correct: i === index })),
    );
  }

  function handleAddOption() {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [...prev, { option_text: "", is_correct: false }]);
  }

  function handleRemoveOption(index: number) {
    if (options.length <= MIN_OPTIONS) return;
    setOptions((prev) => {
      const removed = prev[index];
      const next = prev.filter((_, i) => i !== index);
      // If we removed the correct option, default the first remaining one to correct
      if (removed.is_correct && !next.some((o) => o.is_correct)) {
        next[0] = { ...next[0], is_correct: true };
      }
      return next;
    });
  }

  // ── Validation ──
  function validateForm(): DraftOption[] | null {
    if (!questionText.trim()) {
      Alert.alert("Missing Question", "Please enter the quiz question.");
      return null;
    }
    const filled = options.filter((o) => o.option_text.trim());
    if (filled.length < MIN_OPTIONS) {
      Alert.alert(
        "Not Enough Options",
        `Please provide at least ${MIN_OPTIONS} options.`,
      );
      return null;
    }
    if (!filled.some((o) => o.is_correct)) {
      Alert.alert(
        "No Correct Answer",
        "Please mark one option as the correct answer.",
      );
      return null;
    }
    return filled;
  }

  // ── Add a new question ──
  async function handleAddQuestion() {
    const validOptions = validateForm();
    if (!validOptions) return;

    setSaving(true);

    const nextOrderNumber =
      questions.length > 0
        ? Math.max(...questions.map((q) => q.order_number)) + 1
        : 1;

    const { data: qData, error: qErr } = await supabase
      .from("quiz_questions")
      .insert([
        {
          book_id: bookId,
          question: questionText.trim(),
          order_number: nextOrderNumber,
        },
      ])
      .select()
      .single();

    if (qErr || !qData) {
      Alert.alert("Error", qErr?.message || "Could not save question.");
      setSaving(false);
      return;
    }

    const optionRows = validOptions.map((o, i) => ({
      question_id: qData.id,
      option_text: o.option_text.trim(),
      is_correct: o.is_correct,
      order_number: i + 1,
    }));

    const { data: optData, error: optErr } = await supabase
      .from("quiz_options")
      .insert(optionRows)
      .select();

    setSaving(false);

    if (optErr) {
      Alert.alert("Error", optErr.message);
      return;
    }

    setQuestions((prev) => [...prev, { ...qData, options: optData || [] }]);
    resetForm();
  }

  // ── Update an existing question ──
  async function handleUpdateQuestion() {
    if (!editingQuestion) return;
    const validOptions = validateForm();
    if (!validOptions) return;

    setSaving(true);

    const { error: qErr } = await supabase
      .from("quiz_questions")
      .update({ question: questionText.trim() })
      .eq("id", editingQuestion.id);

    if (qErr) {
      Alert.alert("Error", qErr.message);
      setSaving(false);
      return;
    }

    // Simplest correct approach: replace all options for this question
    const { error: delErr } = await supabase
      .from("quiz_options")
      .delete()
      .eq("question_id", editingQuestion.id);

    if (delErr) {
      Alert.alert("Error", delErr.message);
      setSaving(false);
      return;
    }

    const optionRows = validOptions.map((o, i) => ({
      question_id: editingQuestion.id,
      option_text: o.option_text.trim(),
      is_correct: o.is_correct,
      order_number: i + 1,
    }));

    const { data: optData, error: optErr } = await supabase
      .from("quiz_options")
      .insert(optionRows)
      .select();

    setSaving(false);

    if (optErr) {
      Alert.alert("Error", optErr.message);
      return;
    }

    setQuestions((prev) =>
      prev.map((q) =>
        q.id === editingQuestion.id
          ? { ...q, question: questionText.trim(), options: optData || [] }
          : q,
      ),
    );
    resetForm();
  }

  // ── Delete a question ──
  async function handleDeleteQuestion(question: Question) {
    Alert.alert(
      "Delete Question",
      `Delete question ${question.order_number}? This will also remove its options.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await supabase
              .from("quiz_options")
              .delete()
              .eq("question_id", question.id);

            const { error } = await supabase
              .from("quiz_questions")
              .delete()
              .eq("id", question.id);

            if (error) {
              Alert.alert("Error", error.message);
              return;
            }

            const remaining = questions.filter((q) => q.id !== question.id);
            const renumbered = remaining.map((q, i) => ({
              ...q,
              order_number: i + 1,
            }));

            await Promise.all(
              renumbered.map((q) =>
                supabase
                  .from("quiz_questions")
                  .update({ order_number: q.order_number })
                  .eq("id", q.id),
              ),
            );

            setQuestions(renumbered);
            if (editingQuestion?.id === question.id) resetForm();
          },
        },
      ],
    );
  }

  // ── Reorder questions ──
  async function moveQuestionUp(question: Question) {
    const idx = questions.findIndex((q) => q.id === question.id);
    if (idx <= 0) return;
    const prev = questions[idx - 1];

    await Promise.all([
      supabase
        .from("quiz_questions")
        .update({ order_number: prev.order_number })
        .eq("id", question.id),
      supabase
        .from("quiz_questions")
        .update({ order_number: question.order_number })
        .eq("id", prev.id),
    ]);

    const updated = [...questions];
    updated[idx] = { ...question, order_number: prev.order_number };
    updated[idx - 1] = { ...prev, order_number: question.order_number };
    setQuestions(updated.sort((a, b) => a.order_number - b.order_number));
  }

  async function moveQuestionDown(question: Question) {
    const idx = questions.findIndex((q) => q.id === question.id);
    if (idx >= questions.length - 1) return;
    const next = questions[idx + 1];

    await Promise.all([
      supabase
        .from("quiz_questions")
        .update({ order_number: next.order_number })
        .eq("id", question.id),
      supabase
        .from("quiz_questions")
        .update({ order_number: question.order_number })
        .eq("id", next.id),
    ]);

    const updated = [...questions];
    updated[idx] = { ...question, order_number: next.order_number };
    updated[idx + 1] = { ...next, order_number: question.order_number };
    setQuestions(updated.sort((a, b) => a.order_number - b.order_number));
  }

  // ── Start editing an existing question ──
  function startEditing(question: Question) {
    setEditingQuestion(question);
    setQuestionText(question.question);
    const sortedOptions = [...question.options].sort(
      (a, b) => a.order_number - b.order_number,
    );
    setOptions(
      sortedOptions.length > 0
        ? sortedOptions.map((o) => ({
            id: o.id,
            option_text: o.option_text,
            is_correct: o.is_correct,
          }))
        : emptyOptions(),
    );
  }

  function resetForm() {
    setEditingQuestion(null);
    setQuestionText("");
    setOptions(emptyOptions());
  }

  const isEditing = !!editingQuestion;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Quiz Editor
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {bookTitle || "Book"}
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {questions.length} question{questions.length === 1 ? "" : "s"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── ADD / EDIT QUESTION FORM ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>
              {isEditing
                ? `EDIT QUESTION ${editingQuestion.order_number}`
                : "ADD NEW QUESTION"}
            </Text>
            {isEditing && (
              <TouchableOpacity onPress={resetForm}>
                <Text style={styles.cancelEditText}>✕ Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditing && (
            <View style={styles.editingBanner}>
              <Text style={styles.editingBannerText}>
                ✏️ Editing question {editingQuestion.order_number}
              </Text>
            </View>
          )}

          <Text style={styles.fieldLabel}>Question</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Type the quiz question..."
            placeholderTextColor="#334"
            value={questionText}
            onChangeText={setQuestionText}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.fieldLabel}>
            Options (tap ◯ to mark the correct answer)
          </Text>

          {options.map((option, index) => (
            <View key={index} style={styles.optionRow}>
              <TouchableOpacity
                style={styles.correctToggle}
                onPress={() => handleSetCorrect(index)}
              >
                <View
                  style={[
                    styles.radioOuter,
                    option.is_correct && styles.radioOuterActive,
                  ]}
                >
                  {option.is_correct && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>

              <Text style={styles.optionLetter}>{OPTION_LABELS[index]}</Text>

              <TextInput
                style={styles.optionInput}
                placeholder={`Option ${OPTION_LABELS[index]}`}
                placeholderTextColor="#334"
                value={option.option_text}
                onChangeText={(text) => handleOptionTextChange(index, text)}
              />

              {options.length > MIN_OPTIONS && (
                <TouchableOpacity
                  style={styles.removeOptionBtn}
                  onPress={() => handleRemoveOption(index)}
                >
                  <Text style={styles.removeOptionText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {options.length < MAX_OPTIONS && (
            <TouchableOpacity
              style={styles.addOptionBtn}
              onPress={handleAddOption}
            >
              <Text style={styles.addOptionText}>＋ Add Option</Text>
            </TouchableOpacity>
          )}

          {isEditing ? (
            <View style={styles.editBtnRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, saving && { opacity: 0.6 }]}
                onPress={resetForm}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleUpdateQuestion}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? "Saving..." : "💾 Save Question"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addBtn, saving && { opacity: 0.5 }]}
              onPress={handleAddQuestion}
              disabled={saving}
            >
              <Text style={styles.addBtnText}>
                {saving
                  ? "Saving..."
                  : `＋ Add Question ${questions.length + 1}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── QUESTION LIST ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>
              ALL QUESTIONS ({questions.length})
            </Text>
            <TouchableOpacity onPress={fetchQuestions}>
              <Text style={styles.refreshText}>↻ Refresh</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Loading questions...</Text>
          ) : questions.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>❓</Text>
              <Text style={styles.emptyText}>No questions yet.</Text>
              <Text style={styles.emptyHint}>
                Add your first question above!
              </Text>
            </View>
          ) : (
            questions.map((question, idx) => {
              const correctOption = question.options.find((o) => o.is_correct);
              return (
                <View
                  key={question.id}
                  style={[
                    styles.questionRow,
                    editingQuestion?.id === question.id &&
                      styles.questionRowActive,
                  ]}
                >
                  <View style={styles.questionRowTop}>
                    <View style={styles.questionNumBox}>
                      <Text style={styles.questionNum}>
                        {question.order_number}
                      </Text>
                    </View>
                    <Text style={styles.questionPreview} numberOfLines={2}>
                      {question.question}
                    </Text>
                  </View>

                  {correctOption ? (
                    <Text style={styles.correctPreview} numberOfLines={1}>
                      ✓ {correctOption.option_text}
                    </Text>
                  ) : (
                    <Text style={styles.noOptionsText}>
                      ⚠ No correct option set
                    </Text>
                  )}
                  <Text style={styles.optionCountText}>
                    {question.options.length} option
                    {question.options.length === 1 ? "" : "s"}
                  </Text>

                  <View style={styles.questionActionsRow}>
                    <View style={styles.reorderRow}>
                      <TouchableOpacity
                        style={[
                          styles.reorderBtn,
                          idx === 0 && { opacity: 0.3 },
                        ]}
                        onPress={() => moveQuestionUp(question)}
                        disabled={idx === 0}
                      >
                        <Text style={styles.reorderBtnText}>↑</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.reorderBtn,
                          idx === questions.length - 1 && { opacity: 0.3 },
                        ]}
                        onPress={() => moveQuestionDown(question)}
                        disabled={idx === questions.length - 1}
                      >
                        <Text style={styles.reorderBtnText}>↓</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1 }} />

                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        editingQuestion?.id === question.id &&
                          styles.actionBtnActive,
                      ]}
                      onPress={() =>
                        editingQuestion?.id === question.id
                          ? resetForm()
                          : startEditing(question)
                      }
                    >
                      <Text style={styles.actionBtnText}>
                        {editingQuestion?.id === question.id ? "✕" : "✏️"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteQuestion(question)}
                    >
                      <Text style={styles.deleteBtnText}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0F" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#12121A",
  },
  backText: { color: "#2E86AB", fontSize: 14, fontWeight: "600" },
  headerTitle: { fontSize: 15, fontWeight: "800", color: "#E8E8FF" },
  headerSub: { fontSize: 11, color: "#445566", marginTop: 2 },
  countBadge: {
    backgroundColor: "#0D2233",
    borderWidth: 1,
    borderColor: "#2E86AB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  countBadgeText: { color: "#2E86AB", fontSize: 11, fontWeight: "700" },
  scroll: { padding: 20 },
  section: { marginBottom: 32 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2E86AB",
    letterSpacing: 1.5,
  },
  refreshText: { fontSize: 12, color: "#2E86AB", fontWeight: "700" },
  cancelEditText: { fontSize: 12, color: "#FF6B6B", fontWeight: "700" },
  editingBanner: {
    backgroundColor: "#0D2233",
    borderWidth: 1,
    borderColor: "#2E86AB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  editingBannerText: { color: "#2E86AB", fontSize: 12, fontWeight: "600" },
  fieldLabel: {
    fontSize: 11,
    color: "#445566",
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#12121A",
    borderWidth: 1,
    borderColor: "#1A1A28",
    borderRadius: 12,
    padding: 14,
    color: "#E8E8FF",
    fontSize: 14,
    marginBottom: 12,
  },
  inputMulti: { height: 90, textAlignVertical: "top" },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  correctToggle: { padding: 2 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#334455",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: { borderColor: "#22BFA0" },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22BFA0",
  },
  optionLetter: {
    color: "#2E86AB",
    fontSize: 13,
    fontWeight: "800",
    width: 16,
    textAlign: "center",
  },
  optionInput: {
    flex: 1,
    backgroundColor: "#12121A",
    borderWidth: 1,
    borderColor: "#1A1A28",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#E8E8FF",
    fontSize: 14,
  },
  removeOptionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1A1A28",
    alignItems: "center",
    justifyContent: "center",
  },
  removeOptionText: { color: "#FF6B6B", fontSize: 13, fontWeight: "700" },
  addOptionBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
    marginBottom: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#0D2233",
    borderWidth: 1,
    borderColor: "#1A3A55",
  },
  addOptionText: { color: "#2E86AB", fontSize: 12, fontWeight: "700" },
  addBtn: {
    backgroundColor: "#2E86AB",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  editBtnRow: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#12121A",
    borderWidth: 1,
    borderColor: "#1A1A28",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  cancelBtnText: { color: "#E8E8FF", fontSize: 15, fontWeight: "700" },
  saveBtn: {
    flex: 2,
    backgroundColor: "#1A6B3A",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  loadingText: { color: "#445566", fontSize: 14, textAlign: "center" },
  emptyBox: {
    padding: 32,
    alignItems: "center",
    backgroundColor: "#12121A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A28",
  },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E8E8FF",
    marginBottom: 4,
  },
  emptyHint: { fontSize: 13, color: "#445566" },
  questionRow: {
    backgroundColor: "#12121A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A28",
    padding: 12,
    marginBottom: 10,
  },
  questionRowActive: { borderColor: "#2E86AB", backgroundColor: "#0D1E2B" },
  questionRowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  questionNumBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#0D2233",
    alignItems: "center",
    justifyContent: "center",
  },
  questionNum: { color: "#2E86AB", fontSize: 12, fontWeight: "800" },
  questionPreview: {
    flex: 1,
    fontSize: 13,
    color: "#D0D0EE",
    lineHeight: 18,
    fontWeight: "600",
  },
  correctPreview: {
    fontSize: 12,
    color: "#22BFA0",
    fontWeight: "600",
    marginBottom: 2,
    marginLeft: 38,
  },
  noOptionsText: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "600",
    marginBottom: 2,
    marginLeft: 38,
  },
  optionCountText: {
    fontSize: 11,
    color: "#445566",
    marginBottom: 8,
    marginLeft: 38,
  },
  questionActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reorderRow: { flexDirection: "row", gap: 6 },
  reorderBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#1A1A28",
    alignItems: "center",
    justifyContent: "center",
  },
  reorderBtnText: { color: "#E8E8FF", fontSize: 13, fontWeight: "700" },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#12121A",
    borderWidth: 1,
    borderColor: "#1A1A28",
  },
  actionBtnActive: { backgroundColor: "#0D2233", borderColor: "#2E86AB" },
  actionBtnText: { fontSize: 14 },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontSize: 18 },
});
