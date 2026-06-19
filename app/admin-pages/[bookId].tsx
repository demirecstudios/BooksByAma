import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { supabase } from "../../supabase";

type BookPage = {
  id: string;
  page_number: number;
  text: string | null;
  image_url: string | null;
};

export default function PageEditorScreen() {
  const router = useRouter();
  const { bookId, bookTitle } = useLocalSearchParams<{
    bookId: string;
    bookTitle: string;
  }>();

  const [pages, setPages] = useState<BookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingPage, setEditingPage] = useState<BookPage | null>(null);
  const [pageText, setPageText] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [removedImage, setRemovedImage] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  async function fetchPages() {
    setLoading(true);
    const { data, error } = await supabase
      .from("book_pages")
      .select("*")
      .eq("book_id", bookId)
      .order("page_number", { ascending: true });

    if (!error && data) setPages(data);
    setLoading(false);
  }

  function isLocalUri(uri: string) {
    return (
      uri.startsWith("file://") ||
      uri.startsWith("content://") ||
      uri.startsWith("ph://")
    );
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [3, 4],
      quality: 0.9,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      if (editingPage) {
        setNewImageUri(uri);
        setRemovedImage(false);
      }
    }
  }

  function handleRemoveImage() {
    setImageUri(null);
    if (editingPage) {
      setNewImageUri(null);
      setRemovedImage(true);
    }
  }

  async function uploadPageImage(uri: string): Promise<string | null> {
    try {
      const fileName = `page_${bookId}_${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
      const { error } = await supabase.storage
        .from("book-pages")
        .upload(fileName, arrayBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });
      if (error) throw error;
      const { data } = supabase.storage
        .from("book-pages")
        .getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err: any) {
      Alert.alert("Upload Error", err.message);
      return null;
    }
  }

  async function handleAddPage() {
    if (!pageText.trim() && !imageUri) {
      Alert.alert("Empty Page", "Please add some text or an image.");
      return;
    }
    setSaving(true);

    let image_url: string | null = null;
    if (imageUri && isLocalUri(imageUri)) {
      image_url = await uploadPageImage(imageUri);
    }

    const nextPageNumber =
      pages.length > 0 ? Math.max(...pages.map((p) => p.page_number)) + 1 : 1;

    const { data, error } = await supabase
      .from("book_pages")
      .insert([
        {
          book_id: bookId,
          page_number: nextPageNumber,
          text: pageText.trim() || null,
          image_url,
        },
      ])
      .select();

    if (error) {
      Alert.alert("Error", error.message);
      setSaving(false);
      return;
    }
    const inserted = data?.[0];
    if (!inserted) {
      Alert.alert("Error", "Page saved but could not retrieve it.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setPages((prev) => [...prev, inserted]);
    resetForm();
  }

  async function handleUpdatePage() {
    if (!editingPage) return;
    if (!pageText.trim() && !imageUri) {
      Alert.alert("Empty Page", "Please add some text or an image.");
      return;
    }
    setSaving(true);

    let image_url: string | null = editingPage.image_url;
    if (newImageUri && isLocalUri(newImageUri)) {
      const uploaded = await uploadPageImage(newImageUri);
      if (uploaded) image_url = uploaded;
    } else if (removedImage) {
      image_url = null;
    }

    const { data, error } = await supabase
      .from("book_pages")
      .update({
        text: pageText.trim() || null,
        image_url,
      })
      .eq("id", editingPage.id)
      .select()
      .single();

    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setPages((prev) => prev.map((p) => (p.id === data.id ? data : p)));
    resetForm();
  }

  async function handleDeletePage(page: BookPage) {
    Alert.alert("Delete Page", `Delete page ${page.page_number}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("book_pages")
            .delete()
            .eq("id", page.id);
          if (error) {
            Alert.alert("Error", error.message);
            return;
          }
          const remaining = pages.filter((p) => p.id !== page.id);
          const renumbered = remaining.map((p, i) => ({
            ...p,
            page_number: i + 1,
          }));
          await Promise.all(
            renumbered.map((p) =>
              supabase
                .from("book_pages")
                .update({ page_number: p.page_number })
                .eq("id", p.id),
            ),
          );
          setPages(renumbered);
          if (editingPage?.id === page.id) resetForm();
        },
      },
    ]);
  }

  async function handleDragEnd({ data }: { data: BookPage[] }) {
    const renumbered = data.map((p, i) => ({ ...p, page_number: i + 1 }));
    setPages(renumbered);
    await Promise.all(
      renumbered.map((p) =>
        supabase
          .from("book_pages")
          .update({ page_number: p.page_number })
          .eq("id", p.id),
      ),
    );
  }

  function startEditing(page: BookPage) {
    setEditingPage(page);
    setPageText(page.text || "");
    setImageUri(page.image_url);
    setNewImageUri(null);
    setRemovedImage(false);
  }

  function resetForm() {
    setEditingPage(null);
    setPageText("");
    setImageUri(null);
    setNewImageUri(null);
    setRemovedImage(false);
  }

  const isEditing = !!editingPage;

  const renderPageItem = ({
    item: page,
    drag,
    isActive,
  }: RenderItemParams<BookPage>) => {
    return (
      <ScaleDecorator>
        <View
          style={[
            styles.pageRow,
            editingPage?.id === page.id && styles.pageRowActive,
            isActive && styles.pageRowDragging,
          ]}
        >
          {/* Drag handle — long press to drag */}
          <TouchableOpacity
            onLongPress={drag}
            disabled={isActive}
            style={styles.dragHandle}
          >
            <Text style={styles.dragHandleText}>☰</Text>
          </TouchableOpacity>

          <View style={styles.pageNumBox}>
            <Text style={styles.pageNum}>{page.page_number}</Text>
          </View>

          {page.image_url ? (
            <Image
              source={{ uri: page.image_url }}
              style={styles.pageThumb}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.pageThumbEmpty}>
              <Text style={{ fontSize: 16 }}>📝</Text>
            </View>
          )}

          <View style={styles.pageInfo}>
            {page.text ? (
              <Text style={styles.pagePreview} numberOfLines={2}>
                {page.text}
              </Text>
            ) : (
              <Text style={styles.pagePreviewEmpty}>Image only</Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              editingPage?.id === page.id && styles.actionBtnActive,
            ]}
            onPress={() =>
              editingPage?.id === page.id ? resetForm() : startEditing(page)
            }
          >
            <Text style={styles.actionBtnText}>
              {editingPage?.id === page.id ? "✕" : "✏️"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeletePage(page)}
          >
            <Text style={styles.deleteBtnText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Pages Editor
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {bookTitle || "Book"}
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{pages.length} pages</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── ADD / EDIT PAGE FORM ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>
                {isEditing
                  ? `EDIT PAGE ${editingPage.page_number}`
                  : "ADD NEW PAGE"}
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
                  ✏️ Editing page {editingPage.page_number}
                </Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Page Image (optional)</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderEmoji}>🖼️</Text>
                  <Text style={styles.imagePlaceholderText}>
                    Tap to {isEditing ? "replace" : "add"} page image
                  </Text>
                  <Text style={styles.imagePlaceholderHint}>
                    Portrait format (3×4)
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            {imageUri && (
              <TouchableOpacity
                onPress={handleRemoveImage}
                style={styles.removeImageBtn}
              >
                <Text style={styles.removeImageText}>✕ Remove image</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.fieldLabel}>Page Text (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Type the story text for this page..."
              placeholderTextColor="#334"
              value={pageText}
              onChangeText={setPageText}
              multiline
              numberOfLines={5}
            />

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
                  onPress={handleUpdatePage}
                  disabled={saving}
                >
                  <Text style={styles.saveBtnText}>
                    {saving ? "Saving..." : "💾 Save Page"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.addBtn, saving && { opacity: 0.5 }]}
                onPress={handleAddPage}
                disabled={saving}
              >
                <Text style={styles.addBtnText}>
                  {saving ? "Saving..." : `＋ Add Page ${pages.length + 1}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── PAGE LIST ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>
                ALL PAGES ({pages.length})
              </Text>
              <TouchableOpacity onPress={fetchPages}>
                <Text style={styles.refreshText}>↻ Refresh</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <Text style={styles.loadingText}>Loading pages...</Text>
            ) : pages.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>📄</Text>
                <Text style={styles.emptyText}>No pages yet.</Text>
                <Text style={styles.emptyHint}>Add your first page above!</Text>
              </View>
            ) : (
              <DraggableFlatList
                data={pages}
                keyExtractor={(item) => item.id}
                onDragEnd={handleDragEnd}
                renderItem={renderPageItem}
                scrollEnabled={false}
              />
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </GestureHandlerRootView>
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
  },
  imagePicker: {
    height: 280,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1A1A28",
  },
  imagePreview: { width: "100%", height: "100%" },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: "#12121A",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imagePlaceholderEmoji: { fontSize: 32 },
  imagePlaceholderText: { color: "#445566", fontSize: 13, fontWeight: "600" },
  imagePlaceholderHint: { color: "#2E86AB", fontSize: 11, fontWeight: "500" },
  removeImageBtn: { marginBottom: 14 },
  removeImageText: { color: "#FF6B6B", fontSize: 12, fontWeight: "600" },
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
  inputMulti: { height: 120, textAlignVertical: "top" },
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
  pageRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12121A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A28",
    padding: 10,
    marginBottom: 10,
    gap: 10,
  },
  pageRowActive: { borderColor: "#2E86AB", backgroundColor: "#0D1E2B" },
  pageRowDragging: {
    borderColor: "#2E86AB",
    backgroundColor: "#0D1E2B",
    shadowColor: "#2E86AB",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  dragHandle: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  dragHandleText: {
    color: "#445566",
    fontSize: 16,
  },
  pageNumBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#0D2233",
    alignItems: "center",
    justifyContent: "center",
  },
  pageNum: { color: "#2E86AB", fontSize: 12, fontWeight: "800" },
  pageThumb: { width: 36, height: 48, borderRadius: 6 },
  pageThumbEmpty: {
    width: 36,
    height: 48,
    borderRadius: 6,
    backgroundColor: "#1A1A28",
    alignItems: "center",
    justifyContent: "center",
  },
  pageInfo: { flex: 1 },
  pagePreview: { fontSize: 12, color: "#8899BB", lineHeight: 18 },
  pagePreviewEmpty: { fontSize: 12, color: "#334455", fontStyle: "italic" },
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
