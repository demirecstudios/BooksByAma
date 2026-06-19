import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
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
  publisher: string | null;
};

type Category = {
  id: string;
  name: string;
  cover_url: string | null;
};

type Props = {
  categories: Category[];
  loadingCategories: boolean;
  books: Book[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setTotalCategories: React.Dispatch<React.SetStateAction<number>>;
};

export default function CategoriesTab({
  categories,
  loadingCategories,
  books,
  setCategories,
  setTotalCategories,
}: Props) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryCoverUri, setCategoryCoverUri] = useState<string | null>(null);

  function isLocalUri(uri: string): boolean {
    return (
      uri.startsWith("file://") ||
      uri.startsWith("content://") ||
      uri.startsWith("ph://")
    );
  }

  async function pickCategoryImage() {
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
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setCategoryCoverUri(result.assets[0].uri);
  }

  async function uploadCategoryCover(
    uri: string,
    categoryId: string,
  ): Promise<string | null> {
    try {
      const fileName = `category_${categoryId}_${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
      const { error } = await supabase.storage
        .from("category-covers")
        .upload(fileName, arrayBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });
      if (error) throw error;
      const { data } = supabase.storage
        .from("category-covers")
        .getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err: any) {
      Alert.alert("Upload Error", err.message);
      return null;
    }
  }

  async function handleUpdateCategoryCover(cat: Category) {
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
      allowsEditing: false,
      aspect: [4, 5],
      quality: 0.8,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    const cover_url = await uploadCategoryCover(uri, cat.id);
    if (!cover_url) return;
    const { error } = await supabase
      .from("categories")
      .update({ cover_url })
      .eq("id", cat.id);
    if (error) {
      Alert.alert("Error", "Failed to update cover: " + error.message);
      return;
    }
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, cover_url } : c)),
    );
  }

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      Alert.alert("Missing Name", "Please enter a category name.");
      return;
    }
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert("Duplicate", `"${name}" already exists.`);
      return;
    }
    setSavingCategory(true);
    const { data, error } = await supabase
      .from("categories")
      .insert([{ name }])
      .select()
      .single();
    if (error) {
      Alert.alert("Error", "Failed to add category: " + error.message);
      setSavingCategory(false);
      return;
    }
    let cover_url: string | null = null;
    if (categoryCoverUri && isLocalUri(categoryCoverUri)) {
      cover_url = await uploadCategoryCover(categoryCoverUri, data.id);
      if (cover_url)
        await supabase
          .from("categories")
          .update({ cover_url })
          .eq("id", data.id);
    }
    setCategories((prev) =>
      [...prev, { ...data, cover_url }].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
    setNewCategoryName("");
    setCategoryCoverUri(null);
    setSavingCategory(false);
    setTotalCategories((n) => n + 1);
  }

  async function handleDeleteCategory(cat: Category) {
    const inUse = books.filter((b) => b.category === cat.name).length;
    const msg =
      inUse > 0
        ? `"${cat.name}" is used by ${inUse} book${inUse > 1 ? "s" : ""}. Delete anyway?`
        : `Delete category "${cat.name}"?`;
    Alert.alert("Delete Category", msg, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("categories")
            .delete()
            .eq("id", cat.id);
          if (error) {
            Alert.alert("Error", "Failed to delete: " + error.message);
            return;
          }
          setCategories((prev) => prev.filter((c) => c.id !== cat.id));
          setTotalCategories((n) => Math.max(0, n - 1));
        },
      },
    ]);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>MANAGE CATEGORIES</Text>

        <View style={styles.categoryInputRow}>
          <TextInput
            style={styles.categoryInput}
            placeholder="New category name"
            placeholderTextColor="#334"
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            onSubmitEditing={handleAddCategory}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.categoryAddBtn, savingCategory && { opacity: 0.6 }]}
            onPress={handleAddCategory}
            disabled={savingCategory}
          >
            <Text style={styles.categoryAddBtnText}>
              {savingCategory ? "…" : "＋"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>Cover Image for New Category</Text>
        <TouchableOpacity
          style={styles.imagePicker}
          onPress={pickCategoryImage}
        >
          {categoryCoverUri ? (
            <Image
              source={{ uri: categoryCoverUri }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderEmoji}>🖼️</Text>
              <Text style={styles.imagePlaceholderText}>
                Tap to pick category cover
              </Text>
            </View>
          )}
        </TouchableOpacity>
        {categoryCoverUri && (
          <TouchableOpacity
            onPress={() => setCategoryCoverUri(null)}
            style={styles.removeImageBtn}
          >
            <Text style={styles.removeImageText}>✕ Remove image</Text>
          </TouchableOpacity>
        )}

        {loadingCategories ? (
          <Text style={styles.loadingText}>Loading categories...</Text>
        ) : categories.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              No categories yet. Add one above.
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
              Tap thumbnail to update cover
            </Text>
            <View style={styles.categoryChips}>
              {categories.map((cat) => {
                const usageCount = books.filter(
                  (b) => b.category === cat.name,
                ).length;
                return (
                  <View key={cat.id} style={styles.categoryChip}>
                    <TouchableOpacity
                      onPress={() => handleUpdateCategoryCover(cat)}
                      style={styles.chipThumbWrapper}
                    >
                      {cat.cover_url ? (
                        <Image
                          source={{ uri: cat.cover_url }}
                          style={styles.chipThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.chipThumbPlaceholder}>
                          <Text style={{ fontSize: 10 }}>📁</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <Text style={styles.categoryChipName}>{cat.name}</Text>
                    {usageCount > 0 && (
                      <View style={styles.usageBadge}>
                        <Text style={styles.usageBadgeText}>{usageCount}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => handleDeleteCategory(cat)}
                      style={styles.categoryChipDelete}
                    >
                      <Text style={styles.categoryChipDeleteText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20 },
  section: { marginBottom: 32 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2E86AB",
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    color: "#445566",
    fontWeight: "600",
    marginBottom: 8,
  },
  loadingText: { color: "#445566", fontSize: 14, textAlign: "center" },
  categoryInputRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  categoryInput: {
    flex: 1,
    backgroundColor: "#12121A",
    borderWidth: 1,
    borderColor: "#1A1A28",
    borderRadius: 12,
    padding: 14,
    color: "#E8E8FF",
    fontSize: 14,
  },
  categoryAddBtn: {
    backgroundColor: "#2E86AB",
    borderRadius: 12,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryAddBtnText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 26,
  },
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
  emptyBox: {
    padding: 24,
    alignItems: "center",
    backgroundColor: "#12121A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A28",
  },
  emptyText: { color: "#445566", fontSize: 13 },
  categoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12121A",
    borderWidth: 1,
    borderColor: "#1E1E30",
    borderRadius: 20,
    paddingLeft: 4,
    paddingRight: 4,
    paddingVertical: 6,
    gap: 6,
  },
  chipThumbWrapper: { borderRadius: 4, overflow: "hidden" },
  chipThumb: { width: 22, height: 22, borderRadius: 4 },
  chipThumbPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: "#1A1A28",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipName: { color: "#C0C0DD", fontSize: 13, fontWeight: "600" },
  usageBadge: {
    backgroundColor: "#0D2233",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  usageBadgeText: { color: "#2E86AB", fontSize: 10, fontWeight: "700" },
  categoryChipDelete: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1A1A28",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipDeleteText: { color: "#FF6B6B", fontSize: 11, fontWeight: "700" },
});
