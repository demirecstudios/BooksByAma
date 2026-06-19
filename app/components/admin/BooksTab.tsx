import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../supabase";

const COLORS = [
  "#1E3A5F",
  "#0D3B38",
  "#2D1B4E",
  "#1A3A2A",
  "#3B1A2E",
  "#3B2A0A",
];

type Book = {
  id: string;
  title: string;
  description: string;
  age: string;
  category: string;
  color: string;
  price: number;
  cover_image: string | null;
  author: string | null;
  author_id: string | null;
  publisher: string | null;
};

type Category = {
  id: string;
  name: string;
  cover_url: string | null;
};

type Author = {
  id: string;
  name: string;
};

type Props = {
  categories: Category[];
  loadingCategories: boolean;
  books: Book[];
  loadingBooks: boolean;
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  setTotalBooks: React.Dispatch<React.SetStateAction<number>>;
  fetchBooks: () => Promise<void>;
};

export default function BooksTab({
  categories,
  loadingCategories,
  books,
  loadingBooks,
  setBooks,
  setTotalBooks,
  fetchBooks,
}: Props) {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  // ─── Book form ─────────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [age, setAge] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(
    categories.length > 0 ? categories[0].name : "",
  );
  const [color, setColor] = useState(COLORS[0]);
  const [publisher, setPublisher] = useState("");
  const [authors, setAuthors] = useState<Author[]>([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ─── Multi-image page upload ───────────────────────────────────────────────
  const [selectedPageImages, setSelectedPageImages] = useState<string[]>([]);
  const [uploadingPages, setUploadingPages] = useState(false);
  const [selectedBookForPages, setSelectedBookForPages] = useState<Book | null>(
    null,
  );

  // ─── Edit mode ─────────────────────────────────────────────────────────────
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [newCoverImageUri, setNewCoverImageUri] = useState<string | null>(null);
  const [removedCover, setRemovedCover] = useState(false);

  // ─── Fetch authors on mount ────────────────────────────────────────────────
  useEffect(() => {
    fetchAuthors();
  }, []);

  function isLocalUri(uri: string): boolean {
    return (
      uri.startsWith("file://") ||
      uri.startsWith("content://") ||
      uri.startsWith("ph://")
    );
  }

  async function fetchAuthors() {
    const { data } = await supabase
      .from("authors")
      .select("id, name")
      .order("name");
    if (data) setAuthors(data);
  }

  // ─── Book cover ────────────────────────────────────────────────────────────

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow access to your photo library.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.9,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setCoverImageUri(uri);
      if (editingBook) {
        setNewCoverImageUri(uri);
        setRemovedCover(false);
      }
    }
  }

  function handleRemoveImage() {
    setCoverImageUri(null);
    if (editingBook) {
      setNewCoverImageUri(null);
      setRemovedCover(true);
    }
  }

  async function uploadCoverImage(uri: string): Promise<string | null> {
    try {
      const fileName = `cover_${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
      const { error } = await supabase.storage
        .from("book-covers")
        .upload(fileName, arrayBuffer, {
          contentType: "image/jpeg",
          upsert: false,
        });
      if (error) throw error;
      const { data } = supabase.storage
        .from("book-covers")
        .getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err: any) {
      Alert.alert("Upload Error", err.message);
      return null;
    }
  }

  // ─── Multi-image page upload ───────────────────────────────────────────────

  async function pickMultiplePageImages() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow access to your photo library.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 0.9,
      selectionLimit: 50,
    });
    if (result.canceled) return;
    const uris = result.assets.map((a) => a.uri);
    setSelectedPageImages((prev) => [...prev, ...uris]);
    Alert.alert(
      `${uris.length} image${uris.length > 1 ? "s" : ""} added`,
      `Total: ${selectedPageImages.length + uris.length} selected. Add more or tap Upload.`,
      [
        { text: "Done", style: "cancel" },
        { text: "Add More", onPress: pickMultiplePageImages },
      ],
    );
  }

  function removePageImage(index: number) {
    setSelectedPageImages((prev) => prev.filter((_, i) => i !== index));
  }

  function clearPageImages() {
    setSelectedPageImages([]);
    setSelectedBookForPages(null);
  }

  async function uploadPageImage(
    uri: string,
    bookId: string,
    pageNumber: number,
  ): Promise<string | null> {
    try {
      const fileName = `page_${bookId}_${pageNumber}_${Date.now()}.jpg`;
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
          upsert: false,
        });
      if (error) throw error;
      const { data } = supabase.storage
        .from("book-pages")
        .getPublicUrl(fileName);
      return data.publicUrl;
    } catch {
      return null;
    }
  }

  async function handleUploadPages() {
    if (!selectedBookForPages) {
      Alert.alert(
        "No Book Selected",
        "Please select which book these pages belong to.",
      );
      return;
    }
    if (selectedPageImages.length === 0) {
      Alert.alert("No Images", "Please select at least one page image.");
      return;
    }
    setUploadingPages(true);
    const { data: existingPages } = await supabase
      .from("book_pages")
      .select("page_number")
      .eq("book_id", selectedBookForPages.id)
      .order("page_number", { ascending: false })
      .limit(1);
    let startPage =
      existingPages && existingPages.length > 0
        ? existingPages[0].page_number + 1
        : 1;
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < selectedPageImages.length; i++) {
      const uri = selectedPageImages[i];
      const pageNumber = startPage + i;
      const imageUrl = await uploadPageImage(
        uri,
        selectedBookForPages.id,
        pageNumber,
      );
      if (imageUrl) {
        const { error } = await supabase.from("book_pages").insert([
          {
            book_id: selectedBookForPages.id,
            page_number: pageNumber,
            image_url: imageUrl,
            text: null,
          },
        ]);
        if (!error) successCount++;
        else failCount++;
      } else {
        failCount++;
      }
    }
    setUploadingPages(false);
    if (failCount === 0) {
      Alert.alert(
        "✅ Done!",
        `${successCount} page${successCount > 1 ? "s" : ""} uploaded to "${selectedBookForPages.title}".`,
      );
    } else {
      Alert.alert(
        "Partial Upload",
        `${successCount} uploaded, ${failCount} failed.`,
      );
    }
    clearPageImages();
  }

  // ─── Edit helpers ──────────────────────────────────────────────────────────

  function startEditing(book: Book) {
    setEditingBook(book);
    setTitle(book.title);
    setDescription(book.description);
    setAge(book.age);
    setPrice(String(book.price));
    setPublisher(book.publisher || "");
    setSelectedAuthorId(book.author_id ?? null);
    setCategory(book.category);
    setColor(book.color);
    setCoverImageUri(book.cover_image ?? null);
    setNewCoverImageUri(null);
    setRemovedCover(false);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function cancelEdit() {
    setEditingBook(null);
    resetForm();
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setAge("");
    setPrice("");
    setPublisher("");
    setSelectedAuthorId(null);
    setCategory(categories.length > 0 ? categories[0].name : "");
    setColor(COLORS[0]);
    setCoverImageUri(null);
    setNewCoverImageUri(null);
    setRemovedCover(false);
  }

  function validateBookForm(): number | null {
    if (!title.trim() || !description.trim() || !age.trim() || !price.trim()) {
      Alert.alert(
        "Missing Fields",
        "Please fill in title, description, age range, and price.",
      );
      return null;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert("Invalid Price", "Please enter a valid price (e.g. 4.99).");
      return null;
    }
    return parsedPrice;
  }

  async function handleAddBook() {
    const parsedPrice = validateBookForm();
    if (parsedPrice === null) return;
    setSaving(true);
    let coverImageUrl: string | null = null;
    if (coverImageUri && isLocalUri(coverImageUri)) {
      coverImageUrl = await uploadCoverImage(coverImageUri);
    }
    const { data, error } = await supabase
      .from("books")
      .insert([
        {
          title: title.trim(),
          description: description.trim(),
          age: age.trim(),
          category,
          color,
          price: parsedPrice,
          cover_image: coverImageUrl,
          author_id: selectedAuthorId,
          author: authors.find((a) => a.id === selectedAuthorId)?.name || null,
          publisher: publisher.trim() || null,
        },
      ])
      .select()
      .single();
    setSaving(false);
    if (error) {
      Alert.alert("Error", "Failed to add book: " + error.message);
      return;
    }
    setBooks((prev) => [data, ...prev]);
    setTotalBooks((n) => n + 1);
    resetForm();
    Alert.alert("Success", `"${data.title}" added! 🎉`);
  }

  async function handleUpdateBook() {
    if (!editingBook) return;
    const parsedPrice = validateBookForm();
    if (parsedPrice === null) return;
    setSaving(true);
    let coverImageUrl: string | null = editingBook.cover_image;
    if (newCoverImageUri && isLocalUri(newCoverImageUri)) {
      const uploaded = await uploadCoverImage(newCoverImageUri);
      if (uploaded) coverImageUrl = uploaded;
    } else if (removedCover) {
      coverImageUrl = null;
    }
    const { data, error } = await supabase
      .from("books")
      .update({
        title: title.trim(),
        description: description.trim(),
        age: age.trim(),
        category,
        color,
        price: parsedPrice,
        cover_image: coverImageUrl,
        author_id: selectedAuthorId,
        author: authors.find((a) => a.id === selectedAuthorId)?.name || null,
        publisher: publisher.trim() || null,
      })
      .eq("id", editingBook.id)
      .select()
      .single();
    setSaving(false);
    if (error) {
      Alert.alert("Error", "Failed to update book: " + error.message);
      return;
    }
    setBooks((prev) => prev.map((b) => (b.id === data.id ? data : b)));
    setEditingBook(null);
    resetForm();
    Alert.alert("Updated", `"${data.title}" updated! ✅`);
  }

  async function handleDelete(id: string, bookTitle: string) {
    Alert.alert("Delete Book", `Remove "${bookTitle}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("books").delete().eq("id", id);
          if (error) {
            Alert.alert("Error", "Failed to delete: " + error.message);
            return;
          }
          setBooks((prev) => prev.filter((b) => b.id !== id));
          setTotalBooks((n) => Math.max(0, n - 1));
          if (editingBook?.id === id) cancelEdit();
        },
      },
    ]);
  }

  const isEditing = !!editingBook;

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ADD / EDIT BOOK */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>
            {isEditing ? "EDIT BOOK" : "ADD NEW BOOK"}
          </Text>
          {isEditing && (
            <TouchableOpacity onPress={cancelEdit}>
              <Text style={styles.cancelEditText}>✕ Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditing && (
          <View style={styles.editingBanner}>
            <Text style={styles.editingBannerText} numberOfLines={1}>
              ✏️ Editing: {editingBook.title}
            </Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Book title"
          placeholderTextColor="#334"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.inputMulti]}
          placeholder="Description"
          placeholderTextColor="#334"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />
        <TextInput
          style={styles.input}
          placeholder="Age range (e.g. 3–6)"
          placeholderTextColor="#334"
          value={age}
          onChangeText={setAge}
        />

        {/* ── Author pill selector ── */}
        <Text style={styles.fieldLabel}>Author</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
        >
          <TouchableOpacity
            style={[
              styles.pill,
              selectedAuthorId === null && styles.pillActive,
            ]}
            onPress={() => setSelectedAuthorId(null)}
          >
            <Text
              style={[
                styles.pillText,
                selectedAuthorId === null && styles.pillTextActive,
              ]}
            >
              None
            </Text>
          </TouchableOpacity>
          {authors.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[
                styles.pill,
                selectedAuthorId === a.id && styles.pillActive,
              ]}
              onPress={() => setSelectedAuthorId(a.id)}
            >
              <Text
                style={[
                  styles.pillText,
                  selectedAuthorId === a.id && styles.pillTextActive,
                ]}
              >
                {a.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TextInput
          style={styles.input}
          placeholder="Publisher (optional)"
          placeholderTextColor="#334"
          value={publisher}
          onChangeText={setPublisher}
        />
        <TextInput
          style={styles.input}
          placeholder="Price (e.g. 4.99 or 0 for free)"
          placeholderTextColor="#334"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />

        <Text style={styles.fieldLabel}>Cover Image</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {coverImageUri ? (
            <Image
              source={{ uri: coverImageUri }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderEmoji}>🖼️</Text>
              <Text style={styles.imagePlaceholderText}>
                Tap to {isEditing ? "replace" : "pick"} cover image
              </Text>
            </View>
          )}
        </TouchableOpacity>
        {coverImageUri && (
          <TouchableOpacity
            onPress={handleRemoveImage}
            style={styles.removeImageBtn}
          >
            <Text style={styles.removeImageText}>✕ Remove image</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.fieldLabel}>Category</Text>
        {loadingCategories ? (
          <Text style={[styles.loadingText, { marginBottom: 16 }]}>
            Loading categories...
          </Text>
        ) : categories.length === 0 ? (
          <View style={styles.noCategoryWarning}>
            <Text style={styles.noCategoryWarningText}>
              ⚠️ No categories yet — add one in the Categories tab first.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16 }}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.pill,
                  category === cat.name && styles.pillActive,
                ]}
                onPress={() => setCategory(cat.name)}
              >
                <Text
                  style={[
                    styles.pillText,
                    category === cat.name && styles.pillTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={styles.fieldLabel}>Cover Color</Text>
        <View style={styles.colorRow}>
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                color === c && styles.colorDotActive,
              ]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        {isEditing ? (
          <View style={styles.editBtnRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, saving && { opacity: 0.6 }]}
              onPress={cancelEdit}
              disabled={saving}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleUpdateBook}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>
                {saving ? "Saving..." : "💾 Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.addBtn,
              (saving || categories.length === 0) && { opacity: 0.5 },
            ]}
            onPress={handleAddBook}
            disabled={saving || categories.length === 0}
          >
            <Text style={styles.addBtnText}>
              {saving ? "Saving..." : "＋ Add Book"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* MULTI-IMAGE PAGE UPLOAD */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>UPLOAD BOOK PAGES (MULTI-IMAGE)</Text>

        <Text style={styles.fieldLabel}>Select Book</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 14 }}
        >
          {books.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={[
                styles.pill,
                selectedBookForPages?.id === b.id && styles.pillActive,
              ]}
              onPress={() => setSelectedBookForPages(b)}
            >
              <Text
                style={[
                  styles.pillText,
                  selectedBookForPages?.id === b.id && styles.pillTextActive,
                ]}
                numberOfLines={1}
              >
                {b.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedBookForPages && (
          <View style={styles.selectedBookBanner}>
            <Text style={styles.selectedBookText}>
              📖 {selectedBookForPages.title}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.multiPickBtn}
          onPress={pickMultiplePageImages}
        >
          <Text style={styles.multiPickBtnText}>🖼️ Select Page Images</Text>
          <Text style={styles.multiPickBtnSub}>
            Tap multiple images in order
          </Text>
        </TouchableOpacity>

        {selectedPageImages.length > 0 && (
          <>
            <View style={styles.pageImagesHeader}>
              <Text style={styles.fieldLabel}>
                {selectedPageImages.length} image
                {selectedPageImages.length > 1 ? "s" : ""} selected
              </Text>
              <TouchableOpacity onPress={() => setSelectedPageImages([])}>
                <Text style={styles.cancelEditText}>Clear all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 14 }}
            >
              {selectedPageImages.map((uri, index) => (
                <View key={index} style={styles.pageImageThumbWrap}>
                  <Image
                    source={{ uri }}
                    style={styles.pageImageThumb}
                    resizeMode="cover"
                  />
                  <View style={styles.pageImageNumber}>
                    <Text style={styles.pageImageNumberText}>{index + 1}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.pageImageRemove}
                    onPress={() => removePageImage(index)}
                  >
                    <Text style={styles.pageImageRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[
                styles.uploadPagesBtn,
                uploadingPages && { opacity: 0.6 },
              ]}
              onPress={handleUploadPages}
              disabled={uploadingPages}
            >
              <Text style={styles.uploadPagesBtnText}>
                {uploadingPages
                  ? "Uploading..."
                  : `⬆️ Upload ${selectedPageImages.length} Page${selectedPageImages.length > 1 ? "s" : ""}`}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* MANAGE BOOKS */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>MANAGE BOOKS ({books.length})</Text>
          <TouchableOpacity onPress={fetchBooks}>
            <Text style={styles.refreshText}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>

        {loadingBooks ? (
          <Text style={styles.loadingText}>Loading books...</Text>
        ) : books.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No books yet. Add one above!</Text>
          </View>
        ) : (
          books.map((book) => (
            <View
              key={book.id}
              style={[
                styles.bookRow,
                editingBook?.id === book.id && styles.bookRowActive,
              ]}
            >
              {book.cover_image ? (
                <Image
                  source={{ uri: book.cover_image }}
                  style={styles.bookThumb}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.bookThumb,
                    {
                      backgroundColor: book.color,
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Text style={{ fontSize: 16 }}>📖</Text>
                </View>
              )}
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={1}>
                  {book.title}
                </Text>
                <Text style={styles.bookMeta}>
                  {book.category} · Age {book.age} ·{" "}
                  {book.price === 0 ? "Free" : `$${book.price.toFixed(2)}`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.pagesBtn}
                onPress={() =>
                  router.push(
                    `/admin-pages/${book.id}?bookTitle=${encodeURIComponent(book.title)}`,
                  )
                }
              >
                <Text style={styles.pagesBtnText}>📄</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quizBtn}
                onPress={() =>
                  router.push(
                    `/admin-quiz/${book.id}?bookId=${book.id}&bookTitle=${encodeURIComponent(book.title)}`,
                  )
                }
              >
                <Text style={styles.pagesBtnText}>🧠</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  editingBook?.id === book.id && styles.actionBtnActive,
                ]}
                onPress={() =>
                  editingBook?.id === book.id
                    ? cancelEdit()
                    : startEditing(book)
                }
              >
                <Text style={styles.actionBtnText}>
                  {editingBook?.id === book.id ? "✕" : "✏️"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(book.id, book.title)}
              >
                <Text style={styles.deleteBtnText}>🗑</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 16,
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
  inputMulti: { height: 80, textAlignVertical: "top" },
  fieldLabel: {
    fontSize: 11,
    color: "#445566",
    fontWeight: "600",
    marginBottom: 8,
  },
  loadingText: { color: "#445566", fontSize: 14, textAlign: "center" },
  imagePicker: {
    height: 140,
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
  removeImageBtn: { marginBottom: 16 },
  removeImageText: { color: "#FF6B6B", fontSize: 12, fontWeight: "600" },
  noCategoryWarning: {
    backgroundColor: "#1A1200",
    borderWidth: 1,
    borderColor: "#3B2A0A",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  noCategoryWarningText: { color: "#B8860B", fontSize: 12, fontWeight: "600" },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#12121A",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#1E1E30",
  },
  pillActive: { backgroundColor: "#2E86AB", borderColor: "#2E86AB" },
  pillText: { fontSize: 12, fontWeight: "600", color: "#445566" },
  pillTextActive: { color: "#fff" },
  colorRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: { borderWidth: 3, borderColor: "#fff" },
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
  emptyBox: {
    padding: 24,
    alignItems: "center",
    backgroundColor: "#12121A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A28",
  },
  emptyText: { color: "#445566", fontSize: 13 },
  bookRow: {
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
  bookRowActive: { borderColor: "#2E86AB", backgroundColor: "#0D1E2B" },
  bookThumb: { width: 44, height: 52, borderRadius: 6, overflow: "hidden" },
  bookInfo: { flex: 1 },
  bookTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D0D0EE",
    marginBottom: 4,
  },
  bookMeta: { fontSize: 11, color: "#445566" },
  pagesBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#0D2233",
    borderWidth: 1,
    borderColor: "#2E86AB",
  },
  pagesBtnText: { fontSize: 14 },
  quizBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#1A0D2E",
    borderWidth: 1,
    borderColor: "#6B3FA0",
  },
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
  selectedBookBanner: {
    backgroundColor: "#0D2233",
    borderWidth: 1,
    borderColor: "#2E86AB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  selectedBookText: { color: "#2E86AB", fontSize: 13, fontWeight: "600" },
  multiPickBtn: {
    backgroundColor: "#12121A",
    borderWidth: 1,
    borderColor: "#2E86AB",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 14,
    gap: 4,
  },
  multiPickBtnText: { color: "#2E86AB", fontSize: 15, fontWeight: "800" },
  multiPickBtnSub: { color: "#445566", fontSize: 11 },
  pageImagesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pageImageThumbWrap: { position: "relative", marginRight: 10 },
  pageImageThumb: { width: 80, height: 100, borderRadius: 8 },
  pageImageNumber: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pageImageNumberText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  pageImageRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255,0,0,0.7)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pageImageRemoveText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  uploadPagesBtn: {
    backgroundColor: "#1A6B3A",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  uploadPagesBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
