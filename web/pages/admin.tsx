import { useEffect, useState } from "react";
import Head from "next/head";

const API = process.env.NEXT_PUBLIC_API_URL || "https://backendbooksbyama.up.railway.app";

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState("overview");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ books: 0, cats: 0, orders: 0, revenue: 0, users: 0 });
  const [bookModal, setBookModal] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [editBook, setEditBook] = useState<any>(null);
  const [editCat, setEditCat] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    const t = localStorage.getItem("admin_token");
    const u = localStorage.getItem("admin_user");
    if (t && u) { setToken(t); setUser(JSON.parse(u)); }
  }, []);

  useEffect(() => { if (token) { loadAll(); } }, [token]);

  async function req(path: string, method = "GET", body?: any) {
    const r = await fetch(API + path, {
      method, headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Error");
    return d;
  }

  async function login() {
    setLoginErr("");
    try {
      const r = await fetch(API + "/api/auth/signin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (!d.user.is_admin) throw new Error("Admin access only");
      setToken(d.token); setUser(d.user);
      localStorage.setItem("admin_token", d.token);
      localStorage.setItem("admin_user", JSON.stringify(d.user));
    } catch (e: any) { setLoginErr(e.message); }
  }

  async function loadAll() {
    try {
      const [b, c, o, u] = await Promise.all([
        req("/api/books"), req("/api/categories"), req("/api/orders"), req("/api/users")
      ]);
      setBooks(b); setCategories(c); setOrders(o); setUsers(u);
      const rev = o.reduce((s: number, x: any) => s + parseFloat(x.total || 0), 0);
      setStats({ books: b.length, cats: c.length, orders: o.length, revenue: rev, users: u.length });
    } catch (e) {}
  }

  async function saveBook() {
    try {
      if (editBook?.id) await req("/api/books/" + editBook.id, "PUT", form);
      else await req("/api/books", "POST", form);
      setBookModal(false); setForm({}); setEditBook(null); loadAll();
    } catch (e: any) { alert(e.message); }
  }

  async function deleteBook(id: number) {
    if (!confirm("Delete this book?")) return;
    await req("/api/books/" + id, "DELETE"); loadAll();
  }

  async function saveCat() {
    try {
      if (editCat?.id) await req("/api/categories/" + editCat.id, "PUT", form);
      else await req("/api/categories", "POST", form);
      setCatModal(false); setForm({}); setEditCat(null); loadAll();
    } catch (e: any) { alert(e.message); }
  }

  async function deleteCat(id: number) {
    if (!confirm("Delete this category?")) return;
    await req("/api/categories/" + id, "DELETE"); loadAll();
  }

  async function updateOrder(id: number, status: string) {
    await req("/api/orders/" + id, "PUT", { status }); loadAll();
  }

  function logout() {
    setToken(""); setUser(null);
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
  }

  function openBookModal(book?: any) {
    setEditBook(book || null);
    setForm(book ? { ...book } : {});
    setBookModal(true);
  }

  function openCatModal(cat?: any) {
    setEditCat(cat || null);
    setForm(cat ? { ...cat } : {});
    setCatModal(true);
  }

  if (!token) return (
    <div style={s.page}>
      <Head><title>Admin — Books By AMA</title></Head>
      <div style={s.loginWrap}>
        <div style={s.loginCard}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
          <h1 style={s.loginTitle}>Admin Panel</h1>
          <p style={s.muted}>Books By AMA</p>
          <label style={s.label}>Email</label>
          <input style={s.input} value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@booksbyama.com" type="email" />
          <label style={s.label}>Password</label>
          <input style={s.input} value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" type="password" onKeyDown={e => e.key === "Enter" && login()} />
          {loginErr && <div style={s.errBox}>{loginErr}</div>}
          <button style={s.btnPrimary} onClick={login}>Sign In</button>
        </div>
      </div>
    </div>
  );

  const TABS = [
    { key: "overview", label: "📊 Overview" },
    { key: "books", label: "📚 Books" },
    { key: "categories", label: "🗂 Categories" },
    { key: "orders", label: "🛍️ Orders" },
    { key: "users", label: "👤 Users" },
  ];

  return (
    <div style={s.page}>
      <Head><title>Admin — Books By AMA</title></Head>

      {/* Header */}
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={s.logo}>Books<span style={{ color: "#2E86AB" }}>ByAMA</span></span>
          <span style={s.badge}>⚙️ Admin</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={s.muted}>{user?.email}</span>
          <button style={s.btnOutline} onClick={logout}>Sign out</button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={s.tabBar}>
        {TABS.map(t => (
          <button key={t.key} style={tab === t.key ? s.tabActive : s.tab} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={s.main}>
        {/* OVERVIEW */}
        {tab === "overview" && (
          <>
            <div style={s.statsGrid}>
              {[
                { e: "📚", n: stats.books, l: "Books" },
                { e: "🗂", n: stats.cats, l: "Categories" },
                { e: "🛍️", n: stats.orders, l: "Orders" },
                { e: "💰", n: "₦" + stats.revenue.toLocaleString(), l: "Revenue" },
                { e: "👤", n: stats.users, l: "Users" },
              ].map((x, i) => (
                <div key={i} style={s.statCard}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{x.e}</div>
                  <div style={s.statNum}>{x.n}</div>
                  <div style={s.statLabel}>{x.l}</div>
                </div>
              ))}
            </div>
            <div style={s.sectionTitle}>RECENT ORDERS</div>
            <div style={s.card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["ID","User","Total","Status","Date"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {orders.slice(0, 5).map((o: any) => (
                    <tr key={o.id}>
                      <td style={s.td}>#{o.id}</td>
                      <td style={{ ...s.td, color: "#445566" }}>{o.user_id?.toString().slice(0, 8)}...</td>
                      <td style={{ ...s.td, color: "#2E86AB", fontWeight: 700 }}>₦{parseFloat(o.total).toLocaleString()}</td>
                      <td style={s.td}><span style={statusStyle(o.status)}>{o.status}</span></td>
                      <td style={{ ...s.td, color: "#445566" }}>{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#445566" }}>No orders yet</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* BOOKS */}
        {tab === "books" && (
          <>
            <div style={s.actionsRow}>
              <div style={s.sectionTitle}>ALL BOOKS</div>
              <button style={s.btnPrimary} onClick={() => openBookModal()}>+ Add Book</button>
            </div>
            <div style={s.card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Cover","Title","Author","Category","Price","Actions"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {books.map((b: any) => (
                    <tr key={b.id}>
                      <td style={s.td}>{b.cover_image ? <img src={b.cover_image} style={{ width: 36, height: 48, borderRadius: 4, objectFit: "cover" }} /> : <span style={{ fontSize: 24 }}>📖</span>}</td>
                      <td style={{ ...s.td, fontWeight: 600 }}>{b.title}</td>
                      <td style={{ ...s.td, color: "#445566" }}>{b.author || "—"}</td>
                      <td style={s.td}><span style={s.catBadge}>{b.category || "—"}</span></td>
                      <td style={{ ...s.td, color: "#2E86AB", fontWeight: 700 }}>₦{parseFloat(b.price).toLocaleString()}</td>
                      <td style={s.td}>
                        <button style={{ ...s.btnSm, marginRight: 6 }} onClick={() => openBookModal(b)}>Edit</button>
                        <button style={{ ...s.btnSm, ...s.btnDanger }} onClick={() => deleteBook(b.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {books.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#445566" }}>No books yet</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* CATEGORIES */}
        {tab === "categories" && (
          <>
            <div style={s.actionsRow}>
              <div style={s.sectionTitle}>ALL CATEGORIES</div>
              <button style={s.btnPrimary} onClick={() => openCatModal()}>+ Add Category</button>
            </div>
            <div style={s.card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Name","Cover URL","Actions"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {categories.map((c: any) => (
                    <tr key={c.id}>
                      <td style={{ ...s.td, fontWeight: 600 }}>{c.name}</td>
                      <td style={{ ...s.td, color: "#445566", fontSize: 12 }}>{c.cover_url || "No image"}</td>
                      <td style={s.td}>
                        <button style={{ ...s.btnSm, marginRight: 6 }} onClick={() => openCatModal(c)}>Edit</button>
                        <button style={{ ...s.btnSm, ...s.btnDanger }} onClick={() => deleteCat(c.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && <tr><td colSpan={3} style={{ textAlign: "center", padding: 24, color: "#445566" }}>No categories yet</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ORDERS */}
        {tab === "orders" && (
          <>
            <div style={s.sectionTitle}>ALL ORDERS</div>
            <div style={s.card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["ID","User","Total","Status","Date","Update"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {orders.map((o: any) => (
                    <tr key={o.id}>
                      <td style={s.td}>#{o.id}</td>
                      <td style={{ ...s.td, color: "#445566" }}>{o.user_id?.toString().slice(0, 10)}...</td>
                      <td style={{ ...s.td, color: "#2E86AB", fontWeight: 700 }}>₦{parseFloat(o.total).toLocaleString()}</td>
                      <td style={s.td}><span style={statusStyle(o.status)}>{o.status}</span></td>
                      <td style={{ ...s.td, color: "#445566" }}>{new Date(o.created_at).toLocaleDateString()}</td>
                      <td style={s.td}>
                        <select style={s.select} value={o.status} onChange={e => updateOrder(o.id, e.target.value)}>
                          <option value="pending">Pending</option>
                          <option value="fulfilled">Fulfilled</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#445566" }}>No orders yet</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* USERS */}
        {tab === "users" && (
          <>
            <div style={s.sectionTitle}>ALL USERS</div>
            <div style={s.card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["ID","Email","Name","Role","Joined"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id}>
                      <td style={{ ...s.td, color: "#445566" }}>#{u.id}</td>
                      <td style={s.td}>{u.email}</td>
                      <td style={s.td}>{u.full_name || "—"}</td>
                      <td style={s.td}><span style={u.is_admin ? s.adminBadge : s.catBadge}>{u.is_admin ? "Admin" : "User"}</span></td>
                      <td style={{ ...s.td, color: "#445566" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#445566" }}>No users yet</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* BOOK MODAL */}
      {bookModal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setBookModal(false)}>
          <div style={s.modal}>
            <div style={s.modalHandle} />
            <h2 style={s.modalTitle}>{editBook ? "Edit Book" : "Add Book"}</h2>
            <div style={s.formGrid}>
              {[["Title *","title","text"],["Author","author","text"],["Price (₦) *","price","number"],["Age Range","age","text"],["Color","color","text"]].map(([l,k,t]) => (
                <div key={k}><label style={s.label}>{l}</label><input style={s.input} type={t} value={form[k]||""} onChange={e => setForm({...form,[k]:e.target.value})} /></div>
              ))}
              <div>
                <label style={s.label}>Category</label>
                <select style={s.input} value={form.category||""} onChange={e => setForm({...form,category:e.target.value})}>
                  <option value="">Select</option>
                  {categories.map((c:any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <label style={s.label}>Cover Image URL</label>
            <input style={s.input} value={form.cover_image||""} onChange={e => setForm({...form,cover_image:e.target.value})} placeholder="https://..." />
            <label style={s.label}>Description</label>
            <textarea style={s.textarea} value={form.description||""} onChange={e => setForm({...form,description:e.target.value})} />
            <div style={s.modalActions}>
              <button style={s.btnOutline} onClick={() => setBookModal(false)}>Cancel</button>
              <button style={s.btnPrimary} onClick={saveBook}>Save Book</button>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {catModal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setCatModal(false)}>
          <div style={s.modal}>
            <div style={s.modalHandle} />
            <h2 style={s.modalTitle}>{editCat ? "Edit Category" : "Add Category"}</h2>
            <label style={s.label}>Name *</label>
            <input style={s.input} value={form.name||""} onChange={e => setForm({...form,name:e.target.value})} />
            <label style={s.label}>Cover Image URL</label>
            <input style={s.input} value={form.cover_url||""} onChange={e => setForm({...form,cover_url:e.target.value})} placeholder="https://..." />
            <div style={s.modalActions}>
              <button style={s.btnOutline} onClick={() => setCatModal(false)}>Cancel</button>
              <button style={s.btnPrimary} onClick={saveCat}>Save Category</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function statusStyle(status: string) {
  const base = { padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, border: "1px solid" };
  if (status === "fulfilled") return { ...base, background: "#0A1A0A", borderColor: "#1A6B3A", color: "#22BFA0" };
  if (status === "refunded") return { ...base, background: "#1A0A0A", borderColor: "#6B1A1A", color: "#FF6B6B" };
  return { ...base, background: "#1A1200", borderColor: "#3B2A0A", color: "#F5A623" };
}

const s: any = {
  page: { background: "#0A0A0F", minHeight: "100vh", color: "#E8E8FF", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" },
  loginWrap: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24 },
  loginCard: { background: "#12121A", border: "1px solid #1E1E30", borderRadius: 20, padding: 40, width: "100%", maxWidth: 400 },
  loginTitle: { fontSize: 24, fontWeight: 800, marginBottom: 6 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", background: "#12121A", borderBottom: "1px solid #1E1E30", position: "sticky" as any, top: 0, zIndex: 100 },
  logo: { fontSize: 18, fontWeight: 800 },
  badge: { background: "#0D2233", border: "1px solid #2E86AB", color: "#2E86AB", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 },
  tabBar: { display: "flex", background: "#0D0D14", borderBottom: "1px solid #1E1E30", padding: "0 16px", overflowX: "auto" as any },
  tab: { padding: "12px 16px", background: "transparent", border: "none", color: "#445566", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as any },
  tabActive: { padding: "12px 16px", background: "transparent", border: "none", borderBottom: "2px solid #2E86AB", color: "#2E86AB", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as any },
  main: { padding: 24, maxWidth: 1100, margin: "0 auto" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 24 },
  statCard: { background: "#12121A", border: "1px solid #1E1E30", borderRadius: 16, padding: 20, textAlign: "center" as any },
  statNum: { fontSize: 22, fontWeight: 800, color: "#E8E8FF", marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#445566", fontWeight: 600 },
  sectionTitle: { fontSize: 10, fontWeight: 700, color: "#2E86AB", letterSpacing: "1.5px", marginBottom: 12, textTransform: "uppercase" as any },
  card: { background: "#12121A", border: "1px solid #1E1E30", borderRadius: 14, overflow: "hidden", marginBottom: 16 },
  th: { textAlign: "left" as any, fontSize: 11, fontWeight: 700, color: "#445566", textTransform: "uppercase" as any, letterSpacing: "0.6px", padding: "10px 12px", borderBottom: "1px solid #1E1E30" },
  td: { padding: "10px 12px", fontSize: 14, borderBottom: "1px solid #1E1E30", color: "#E8E8FF" },
  actionsRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  catBadge: { background: "#1A1A28", border: "1px solid #1E1E30", color: "#445566", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 },
  adminBadge: { background: "#0D2233", border: "1px solid #2E86AB", color: "#2E86AB", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 },
  btnPrimary: { background: "#2E86AB", border: "none", borderRadius: 10, padding: "10px 20px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  btnOutline: { background: "transparent", border: "1px solid #1E1E30", borderRadius: 10, padding: "10px 20px", color: "#445566", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnSm: { background: "transparent", border: "1px solid #1E1E30", borderRadius: 8, padding: "5px 10px", color: "#445566", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  btnDanger: { border: "1px solid #3A1A1A", color: "#FF6B6B" },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#445566", textTransform: "uppercase" as any, letterSpacing: "0.6px", marginBottom: 6, marginTop: 14 },
  input: { width: "100%", background: "#0A0A0F", border: "1px solid #1E1E30", borderRadius: 10, padding: "11px 14px", color: "#E8E8FF", fontSize: 15, outline: "none", boxSizing: "border-box" as any },
  textarea: { width: "100%", background: "#0A0A0F", border: "1px solid #1E1E30", borderRadius: 10, padding: "11px 14px", color: "#E8E8FF", fontSize: 15, outline: "none", minHeight: 80, resize: "vertical" as any, fontFamily: "inherit", boxSizing: "border-box" as any },
  select: { background: "#0A0A0F", border: "1px solid #1E1E30", borderRadius: 8, padding: "5px 8px", color: "#E8E8FF", fontSize: 12 },
  muted: { color: "#445566", fontSize: 13 },
  errBox: { background: "#1A0A0A", border: "1px solid #3A1A1A", borderRadius: 8, padding: 10, color: "#FF6B6B", fontSize: 13, marginTop: 10 },
  overlay: { position: "fixed" as any, inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 },
  modal: { background: "#13131C", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto" as any },
  modalHandle: { width: 36, height: 4, background: "#2A2A3A", borderRadius: 2, margin: "0 auto 16px" },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 16 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  modalActions: { display: "flex", gap: 10, marginTop: 20 },
};
