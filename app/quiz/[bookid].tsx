import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
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

export default function QuizScreen() {
  const router = useRouter();
  const { bookId, bookTitle } = useLocalSearchParams<{
    bookId: string;
    bookTitle: string;
  }>();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<
    {
      question: string;
      selected: string;
      correct: string;
      isCorrect: boolean;
    }[]
  >([]);

  useEffect(() => {
    fetchQuiz();
  }, []);

  async function fetchQuiz() {
    setLoading(true);

    const { data: questionsData, error } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("book_id", bookId)
      .order("order_number", { ascending: true });

    if (error || !questionsData || questionsData.length === 0) {
      setLoading(false);
      setQuestions([]);
      return;
    }

    // Fetch options for all questions
    const questionIds = questionsData.map((q) => q.id);
    const { data: optionsData } = await supabase
      .from("quiz_options")
      .select("*")
      .in("question_id", questionIds)
      .order("order_number", { ascending: true });

    const questionsWithOptions = questionsData.map((q) => ({
      ...q,
      options: (optionsData || []).filter((o) => o.question_id === q.id),
    }));

    setQuestions(questionsWithOptions);
    setLoading(false);
  }

  function handleSelectOption(optionId: string) {
    if (answered) return;
    setSelectedOption(optionId);
  }

  function handleConfirm() {
    if (!selectedOption) return;
    const currentQuestion = questions[currentIndex];
    const selected = currentQuestion.options.find(
      (o) => o.id === selectedOption,
    );
    const correct = currentQuestion.options.find((o) => o.is_correct);
    const isCorrect = selected?.is_correct ?? false;

    if (isCorrect) setScore((s) => s + 1);

    setAnswers((prev) => [
      ...prev,
      {
        question: currentQuestion.question,
        selected: selected?.option_text ?? "",
        correct: correct?.option_text ?? "",
        isCorrect,
      },
    ]);

    setAnswered(true);
  }

  function handleNext() {
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setAnswered(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E86AB" />
        <Text style={styles.loadingText}>Loading quiz...</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emoji}>📭</Text>
        <Text style={styles.noQuizTitle}>No Quiz Available</Text>
        <Text style={styles.noQuizSub}>
          The author hasn't added quiz questions for this book yet.
        </Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Results screen ──
  if (finished) {
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 60;

    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Quiz Results</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.resultCard}>
            <Text style={styles.resultEmoji}>{passed ? "🎉" : "📚"}</Text>
            <Text style={styles.resultScore}>
              {score} / {questions.length}
            </Text>
            <Text style={styles.resultPercent}>{percentage}%</Text>
            <Text style={styles.resultLabel}>
              {passed
                ? "Great job! You passed!"
                : "Keep reading and try again!"}
            </Text>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${percentage}%`,
                    backgroundColor: passed ? "#22BFA0" : "#FF6B6B",
                  },
                ]}
              />
            </View>
          </View>

          <Text style={styles.reviewTitle}>Answer Review</Text>
          {answers.map((a, i) => (
            <View
              key={i}
              style={[
                styles.reviewCard,
                { borderColor: a.isCorrect ? "#22BFA0" : "#FF6B6B" },
              ]}
            >
              <Text style={styles.reviewQuestion}>
                {i + 1}. {a.question}
              </Text>
              <Text
                style={[
                  styles.reviewAnswer,
                  { color: a.isCorrect ? "#22BFA0" : "#FF6B6B" },
                ]}
              >
                {a.isCorrect ? "✓" : "✗"} Your answer: {a.selected}
              </Text>
              {!a.isCorrect && (
                <Text style={styles.reviewCorrect}>✓ Correct: {a.correct}</Text>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.replace("/bookstore")}
          >
            <Text style={styles.doneBtnText}>📚 Back to Bookstore</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ── Question screen ──
  const currentQuestion = questions[currentIndex];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Exit</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {bookTitle} Quiz
        </Text>
        <Text style={styles.counter}>
          {currentIndex + 1}/{questions.length}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
              backgroundColor: "#2E86AB",
            },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.questionNumber}>
          Question {currentIndex + 1} of {questions.length}
        </Text>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>

        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option) => {
            let optionStyle = styles.option;
            let textStyle = styles.optionText;

            if (answered) {
              if (option.is_correct) {
                optionStyle = { ...styles.option, ...styles.optionCorrect };
                textStyle = { ...styles.optionText, color: "#fff" };
              } else if (option.id === selectedOption && !option.is_correct) {
                optionStyle = { ...styles.option, ...styles.optionWrong };
                textStyle = { ...styles.optionText, color: "#fff" };
              }
            } else if (option.id === selectedOption) {
              optionStyle = { ...styles.option, ...styles.optionSelected };
              textStyle = { ...styles.optionText, color: "#fff" };
            }

            return (
              <TouchableOpacity
                key={option.id}
                style={optionStyle}
                onPress={() => handleSelectOption(option.id)}
                activeOpacity={answered ? 1 : 0.7}
              >
                <Text style={textStyle}>{option.option_text}</Text>
                {answered && option.is_correct && (
                  <Text style={styles.optionIcon}>✓</Text>
                )}
                {answered &&
                  option.id === selectedOption &&
                  !option.is_correct && (
                    <Text style={styles.optionIcon}>✗</Text>
                  )}
              </TouchableOpacity>
            );
          })}
        </View>

        {!answered ? (
          <TouchableOpacity
            style={[styles.confirmBtn, !selectedOption && { opacity: 0.4 }]}
            onPress={handleConfirm}
            disabled={!selectedOption}
          >
            <Text style={styles.confirmBtnText}>Confirm Answer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>
              {currentIndex + 1 >= questions.length
                ? "See Results 🎉"
                : "Next Question →"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0F" },
  center: {
    flex: 1,
    backgroundColor: "#0A0A0F",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emoji: { fontSize: 56, marginBottom: 16 },
  loadingText: { color: "#445566", fontSize: 14, marginTop: 12 },
  noQuizTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#E8E8FF",
    marginBottom: 8,
  },
  noQuizSub: {
    fontSize: 14,
    color: "#445566",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#12121A",
  },
  backText: { color: "#2E86AB", fontSize: 14, fontWeight: "600" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#E8E8FF",
    marginHorizontal: 12,
  },
  counter: { fontSize: 12, color: "#445566", fontWeight: "600" },
  progressTrack: { height: 4, backgroundColor: "#12121A", width: "100%" },
  progressFill: { height: 4, borderRadius: 2 },
  scroll: { padding: 24 },
  questionNumber: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2E86AB",
    letterSpacing: 1.5,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  questionText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#E8E8FF",
    lineHeight: 28,
    marginBottom: 28,
  },
  optionsContainer: { gap: 12, marginBottom: 24 },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#12121A",
    borderWidth: 1,
    borderColor: "#1A1A28",
    borderRadius: 14,
    padding: 16,
  },
  optionSelected: {
    backgroundColor: "#2E86AB",
    borderColor: "#2E86AB",
  },
  optionCorrect: {
    backgroundColor: "#22BFA0",
    borderColor: "#22BFA0",
  },
  optionWrong: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF6B6B",
  },
  optionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#D0D0EE",
    flex: 1,
  },
  optionIcon: { fontSize: 16, fontWeight: "800", color: "#fff" },
  confirmBtn: {
    backgroundColor: "#2E86AB",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  nextBtn: {
    backgroundColor: "#22BFA0",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  nextBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  resultCard: {
    backgroundColor: "#12121A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1A1A28",
    padding: 24,
    alignItems: "center",
    marginBottom: 28,
  },
  resultEmoji: { fontSize: 56, marginBottom: 12 },
  resultScore: {
    fontSize: 40,
    fontWeight: "800",
    color: "#E8E8FF",
    letterSpacing: -1,
  },
  resultPercent: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2E86AB",
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 15,
    color: "#8899BB",
    marginBottom: 20,
    textAlign: "center",
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#E8E8FF",
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  reviewCard: {
    backgroundColor: "#12121A",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  reviewQuestion: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D0D0EE",
    marginBottom: 6,
    lineHeight: 18,
  },
  reviewAnswer: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  reviewCorrect: { fontSize: 12, color: "#22BFA0", fontWeight: "600" },
  doneBtn: {
    backgroundColor: "#2E86AB",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
  },
  doneBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
