import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { supabase } from "../../supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type Author = {
  id: string;
  user_id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  created_at: string;
  email?: string; // joined from auth.users via RPC or stored separately
  book_count?: number;
};

type Book = {
  id: string;
  title: string;
  cover_url: string | null;
  author_id: string | null;
};

type ModalState =
  | { type: "none" }
  | { type: "add_author" }
  | { type: "assign_books"; author: Author }
  | { type: "view_author"; author: Author };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({
  url,
  name,
  size = 44,
}: {
  url: string | null;
  name: string;
  size?: number;
}) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>
        {initials(name)}
      </Text>
    </View>
  );
}

function StatBadge({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.statBadge}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Add Author Modal ─────────────────────────────────────────────────────────

function AddAuthorModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!email.trim() || !name.trim()) {
      setError("Email and name are required.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Look up user by email using the admin RPC (or auth.users via service role)
      // We call a Supabase RPC that returns user_id for an email
      const { data: userData, error: userErr } = await supabase.rpc(
        "get_user_id_by_email",
        { p_email: email.trim().toLowerCase() },
      );

      if (userErr || !userData) {
        setError(
          "No account found with that email. The user must sign up first.",
        );
        setLoading(false);
        return;
      }

      const userId = userData as string;

      // Create author row
      const { error: insertErr } = await supabase.from("authors").insert({
        user_id: userId,
        name: name.trim(),
        bio: bio.trim() || null,
      });

      if (insertErr) {
        if (insertErr.code === "23505") {
          setError("This user is already registered as an author.");
        } else {
          setError(insertErr.message);
        }
        setLoading(false);
        return;
      }

      // Update user metadata to mark as author
      // (Best done via a trigger or Edge Function in production)
      onCreated();
      onClose();
      setEmail("");
      setName("");
      setBio("");
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          <Text style={styles.modalTitle}>Add Author</Text>
          <Text style={styles.modalSubtitle}>
            The user must already have an account.
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.fieldLabel}>User Email</Text>
          <TextInput
            style={styles.input}
            placeholder="author@example.com"
            placeholderTextColor="#555"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.fieldLabel}>Display Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Author's full name"
            placeholderTextColor="#555"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.fieldLabel}>Bio (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Short author bio…"
            placeholderTextColor="#555"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
          />

          <View style={styles.modalActions}>
            <Pressable style={styles.btnOutline} onPress={onClose}>
              <Text style={styles.btnOutlineText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>Create Author</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Assign Books Modal ───────────────────────────────────────────────────────

function AssignBooksModal({
  author,
  visible,
  onClose,
  onSaved,
}: {
  author: Author;
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [books, setBooks] = useState<Book[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!visible) return;
    loadBooks();
  }, [visible]);

  async function loadBooks() {
    setLoading(true);
    const { data } = await supabase
      .from("books")
      .select("id, title, cover_url, author_id")
      .order("title");
    if (data) {
      setBooks(data);
      // Pre-select books already assigned to this author
      setSelected(
        new Set(data.filter((b) => b.author_id === author.id).map((b) => b.id)),
      );
    }
    setLoading(false);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);

    // Unassign books that were removed
    const toUnassign = books
      .filter((b) => b.author_id === author.id && !selected.has(b.id))
      .map((b) => b.id);

    // Assign newly selected books
    const toAssign = books
      .filter((b) => b.author_id !== author.id && selected.has(b.id))
      .map((b) => b.id);

    const ops: Promise<any>[] = [];

    if (toUnassign.length) {
      ops.push(
        supabase.from("books").update({ author_id: null }).in("id", toUnassign),
      );
    }
    if (toAssign.length) {
      ops.push(
        supabase
          .from("books")
          .update({ author_id: author.id })
          .in("id", toAssign),
      );
    }

    await Promise.all(ops);
    setSaving(false);
    onSaved();
    onClose();
  }

  const filtered = books.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { maxHeight: "85%" }]}>
          <View style={styles.modalHandle} />

          <Text style={styles.modalTitle}>Assign Books</Text>
          <Text style={styles.modalSubtitle}>{author.name}</Text>

          <TextInput
            style={[styles.input, { marginBottom: 12 }]}
            placeholder="Search books…"
            placeholderTextColor="#555"
            value={search}
            onChangeText={setSearch}
          />

          {loading ? (
            <ActivityIndicator color="#2E86AB" style={{ marginVertical: 24 }} />
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
            >
              {filtered.map((book) => {
                const isSelected = selected.has(book.id);
                const ownedByOther =
                  book.author_id && book.author_id !== author.id;
                return (
                  <Pressable
                    key={book.id}
                    style={[
                      styles.bookRow,
                      isSelected && styles.bookRowSelected,
                      ownedByOther && styles.bookRowDisabled,
                    ]}
                    onPress={() => !ownedByOther && toggle(book.id)}
                  >
                    <View style={styles.bookRowCheck}>
                      {isSelected && <View style={styles.checkDot} />}
                    </View>
                    {book.cover_url ? (
                      <Image
                        source={{ uri: book.cover_url }}
                        style={styles.bookCover}
                      />
                    ) : (
                      <View
                        style={[styles.bookCover, styles.bookCoverFallback]}
                      >
                        <Text style={{ color: "#555", fontSize: 10 }}>
                          No cover
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.bookTitle,
                          ownedByOther && { color: "#555" },
                        ]}
                        numberOfLines={1}
                      >
                        {book.title}
                      </Text>
                      {ownedByOther && (
                        <Text style={styles.bookOwned}>
                          Assigned to another author
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
              {filtered.length === 0 && (
                <Text style={styles.emptyText}>
                  No books match your search.
                </Text>
              )}
            </ScrollView>
          )}

          <View style={[styles.modalActions, { marginTop: 12 }]}>
            <Pressable style={styles.btnOutline} onPress={onClose}>
              <Text style={styles.btnOutlineText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btnPrimary, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>
                  Save — {selected.size} book{selected.size !== 1 ? "s" : ""}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Author Card ──────────────────────────────────────────────────────────────

function AuthorCard({
  author,
  onAssignBooks,
  onDelete,
}: {
  author: Author;
  onAssignBooks: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Avatar url={author.photo_url} name={author.name} size={48} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.authorName}>{author.name}</Text>
          {author.bio ? (
            <Text style={styles.authorBio} numberOfLines={2}>
              {author.bio}
            </Text>
          ) : (
            <Text style={styles.authorBioEmpty}>No bio yet</Text>
          )}
        </View>
      </View>

      <View style={styles.cardStats}>
        <StatBadge label="Books" value={author.book_count ?? 0} />
        <StatBadge
          label="Since"
          value={new Date(author.created_at).getFullYear()}
        />
      </View>

      <View style={styles.cardActions}>
        <Pressable style={styles.actionBtn} onPress={onAssignBooks}>
          <Text style={styles.actionBtnText}>Assign Books</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, styles.actionBtnDanger]}
          onPress={onDelete}
        >
          <Text style={[styles.actionBtnText, { color: "#FF6B6B" }]}>
            Remove
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminAuthorsScreen() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  useEffect(() => {
    fetchAuthors();
  }, []);

  async function fetchAuthors() {
    setLoading(true);

    // Fetch authors with book count
    const { data, error } = await supabase
      .from("authors")
      .select(
        `
        id,
        user_id,
        name,
        bio,
        photo_url,
        created_at,
        books(id)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching authors:", error.message);
      setLoading(false);
      return;
    }

    const enriched = (data ?? []).map((a: any) => ({
      ...a,
      book_count: Array.isArray(a.books) ? a.books.length : 0,
      books: undefined,
    }));

    setAuthors(enriched);
    setLoading(false);
  }

  async function handleDelete(author: Author) {
    Alert.alert(
      "Remove Author",
      `Remove ${author.name} as an author? Their books will become unassigned.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            // Unassign their books
            await supabase
              .from("books")
              .update({ author_id: null })
              .eq("author_id", author.id);

            // Delete author row
            const { error } = await supabase
              .from("authors")
              .delete()
              .eq("id", author.id);

            if (error) {
              Alert.alert("Error", error.message);
            } else {
              fetchAuthors();
            }
          },
        },
      ],
    );
  }

  const filtered = authors.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Authors</Text>
          <Text style={styles.headerSub}>
            {authors.length} author{authors.length !== 1 ? "s" : ""} registered
          </Text>
        </View>
        <Pressable
          style={styles.addBtn}
          onPress={() => setModal({ type: "add_author" })}
        >
          <Text style={styles.addBtnText}>+ Add Author</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search authors…"
          placeholderTextColor="#555"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator
          color="#2E86AB"
          size="large"
          style={{ marginTop: 48 }}
        />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✍️</Text>
          <Text style={styles.emptyTitle}>
            {search ? "No authors match your search" : "No authors yet"}
          </Text>
          <Text style={styles.emptyHint}>
            {search
              ? "Try a different name."
              : 'Tap "+ Add Author" to register one.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <AuthorCard
              author={item}
              onAssignBooks={() =>
                setModal({ type: "assign_books", author: item })
              }
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      {/* Modals */}
      <AddAuthorModal
        visible={modal.type === "add_author"}
        onClose={() => setModal({ type: "none" })}
        onCreated={fetchAuthors}
      />

      {modal.type === "assign_books" && (
        <AssignBooksModal
          author={modal.author}
          visible
          onClose={() => setModal({ type: "none" })}
          onSaved={fetchAuthors}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0F",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A24",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerSub: {
    color: "#555",
    fontSize: 13,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: "#2E86AB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },

  // Search
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    backgroundColor: "#13131C",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#1E1E2E",
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptyHint: {
    color: "#555",
    fontSize: 14,
    textAlign: "center",
  },
  emptyText: {
    color: "#555",
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
  },

  // Author card
  card: {
    backgroundColor: "#13131C",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1E1E2E",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  authorName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  authorBio: {
    color: "#888",
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  authorBioEmpty: {
    color: "#444",
    fontSize: 13,
    marginTop: 3,
    fontStyle: "italic",
  },
  cardStats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    marginBottom: 14,
  },
  statBadge: {
    backgroundColor: "#0A0A0F",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 64,
  },
  statValue: {
    color: "#2E86AB",
    fontSize: 16,
    fontWeight: "700",
  },
  statLabel: {
    color: "#555",
    fontSize: 11,
    marginTop: 1,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: "#1E1E2E",
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center",
  },
  actionBtnDanger: {
    backgroundColor: "#1A0A0A",
    borderWidth: 1,
    borderColor: "#3A1A1A",
  },
  actionBtnText: {
    color: "#AAAACC",
    fontSize: 13,
    fontWeight: "600",
  },

  // Avatar
  avatarFallback: {
    backgroundColor: "#1E3A4A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#2E86AB",
    fontWeight: "700",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#13131C",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#2A2A3A",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalSubtitle: {
    color: "#666",
    fontSize: 13,
    marginBottom: 16,
  },
  fieldLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#0A0A0F",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#1E1E2E",
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: "#2E86AB",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  btnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#2A2A3A",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnOutlineText: {
    color: "#888",
    fontWeight: "600",
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  errorBox: {
    backgroundColor: "#1A0A0A",
    borderWidth: 1,
    borderColor: "#3A1A1A",
    borderRadius: 8,
    padding: 10,
    marginBottom: 4,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 13,
  },

  // Book row in assign modal
  bookRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E1E2E",
    marginBottom: 8,
    backgroundColor: "#0A0A0F",
  },
  bookRowSelected: {
    borderColor: "#2E86AB",
    backgroundColor: "#0D1E27",
  },
  bookRowDisabled: {
    opacity: 0.4,
  },
  bookRowCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2E86AB",
  },
  bookCover: {
    width: 36,
    height: 48,
    borderRadius: 4,
    marginRight: 10,
  },
  bookCoverFallback: {
    backgroundColor: "#1A1A24",
    alignItems: "center",
    justifyContent: "center",
  },
  bookTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  bookOwned: {
    color: "#555",
    fontSize: 11,
    marginTop: 2,
  },
});
