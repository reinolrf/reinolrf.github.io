import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search, Plus, Trash2, Pencil, FileText, Paperclip, X, Download,
  BookOpen, ArrowLeft, Image as ImageIcon, Loader2, Inbox, Tag,
  Lock, Globe, Users, User, LogOut, Eye, EyeOff, ShieldCheck
} from "lucide-react";

/* ============================ almacenamiento ============================ */
const SESSION_KEY = "auth:session";          // personal: recuerda quién entró aquí
const userKey = (u) => `auth:user:${u}`;       // compartido
const privPrefix = (uid) => `u:${uid}:item:`;
const privItemKey = (uid, id) => `u:${uid}:item:${id}`;
const privFilesKey = (uid, id) => `u:${uid}:files:${id}`;
const pubItemKey = (id) => `pub:item:${id}`;
const pubFilesKey = (id) => `pub:files:${id}`;
const PUB_PREFIX = "pub:item:";

async function listByPrefix(prefix, shared) {
  try {
    const r = await window.storage.list(prefix, shared);
    const keys = (r?.keys || []).map((k) => (typeof k === "string" ? k : k.key)).filter(Boolean);
    const out = [];
    for (const k of keys) {
      try { const v = await window.storage.get(k, shared); if (v?.value) out.push(JSON.parse(v.value)); } catch {}
    }
    return out;
  } catch { return []; }
}

const store = {
  // sesión local
  async getSession() { try { const r = await window.storage.get(SESSION_KEY); return r?.value ? JSON.parse(r.value) : null; } catch { return null; } },
  setSession: (s) => window.storage.set(SESSION_KEY, JSON.stringify(s)),
  delSession: async () => { try { await window.storage.delete(SESSION_KEY); } catch {} },
  // cuentas
  async getUser(u) { try { const r = await window.storage.get(userKey(u), true); return r?.value ? JSON.parse(r.value) : null; } catch { return null; } },
  setUser: (u, d) => window.storage.set(userKey(u), JSON.stringify(d), true),
  // apuntes privados (compartido, con espacio por usuario)
  listPriv: (uid) => listByPrefix(privPrefix(uid), true),
  setPriv: (uid, id, m) => window.storage.set(privItemKey(uid, id), JSON.stringify(m), true),
  delPriv: async (uid, id) => { try { await window.storage.delete(privItemKey(uid, id), true); } catch {} },
  async getPrivFiles(uid, id) { try { const r = await window.storage.get(privFilesKey(uid, id), true); return r?.value ? JSON.parse(r.value).adjuntos : []; } catch { return []; } },
  setPrivFiles: (uid, id, a) => window.storage.set(privFilesKey(uid, id), JSON.stringify({ adjuntos: a }), true),
  delPrivFiles: async (uid, id) => { try { await window.storage.delete(privFilesKey(uid, id), true); } catch {} },
  // apuntes públicos
  listPublic: () => listByPrefix(PUB_PREFIX, true),
  setPublic: (id, m) => window.storage.set(pubItemKey(id), JSON.stringify(m), true),
  delPublic: async (id) => { try { await window.storage.delete(pubItemKey(id), true); } catch {} },
  async getPublicFiles(id) { try { const r = await window.storage.get(pubFilesKey(id), true); return r?.value ? JSON.parse(r.value).adjuntos : []; } catch { return []; } },
  setPublicFiles: (id, a) => window.storage.set(pubFilesKey(id), JSON.stringify({ adjuntos: a }), true),
  delPublicFiles: async (id) => { try { await window.storage.delete(pubFilesKey(id), true); } catch {} },
};

/* ============================== seguridad =============================== */
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
function randSalt() { const a = new Uint8Array(16); crypto.getRandomValues(a); return toHex(a); }
async function hashPw(password, salt) {
  const data = new TextEncoder().encode(salt + ":" + password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return toHex(buf);
}

/* ============================== utilidades ============================== */
const PALETTE = [
  { name: "rosa", ink: "#D4356B", soft: "#FCE7EF", tab: "#F2547D" },
  { name: "ambar", ink: "#B5751A", soft: "#FCEFD6", tab: "#F4A52E" },
  { name: "verde", ink: "#1B8A56", soft: "#DCF4E8", tab: "#2BB673" },
  { name: "azul", ink: "#2378BD", soft: "#DEEEFB", tab: "#3B9EEA" },
  { name: "violeta", ink: "#6D40C9", soft: "#ECE4FB", tab: "#8B5CF6" },
  { name: "coral", ink: "#C93B3B", soft: "#FBE2E2", tab: "#EF5B5B" },
  { name: "teal", ink: "#0E8F86", soft: "#D6F3F0", tab: "#14B8A6" },
];
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const colorFor = (s, subs) => { const i = subs.indexOf(s); return PALETTE[(i < 0 ? hash(s || "x") : i) % PALETTE.length]; };
const avatarColor = (id) => PALETTE[hash(id || "x") % PALETTE.length];
const initials = (n) => (n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
const fmtDate = (ts) => { try { return new Date(ts).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; } };
const fmtSize = (b) => b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(0) + " KB" : (b / 1048576).toFixed(1) + " MB";
const readAsDataURL = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(); r.readAsDataURL(f); });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ================================== APP ================================== */
export default function App() {
  const [auth, setAuth] = useState(null);     // {userId, username}
  const [booting, setBooting] = useState(true);
  const [priv, setPriv] = useState([]);
  const [pub, setPub] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [view, setView] = useState("mias");
  const [query, setQuery] = useState("");
  const [activeSubject, setActiveSubject] = useState(null);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [toast, setToast] = useState(null);

  const flash = useCallback((m) => { setToast(m); setTimeout(() => setToast(null), 3400); }, []);

  useEffect(() => { (async () => {
    const s = await store.getSession();
    if (s?.username) {
      const u = await store.getUser(s.username.toLowerCase());
      if (u) setAuth({ userId: u.userId, username: u.username });
      else await store.delSession();
    }
    setBooting(false);
  })(); }, []);

  const reloadNotes = useCallback(async () => {
    if (!auth) return;
    setLoadingNotes(true);
    const [p, q] = await Promise.all([store.listPriv(auth.userId), store.listPublic()]);
    setPriv(p.sort((a, b) => b.fecha - a.fecha));
    setPub(q.sort((a, b) => b.fecha - a.fecha));
    setLoadingNotes(false);
  }, [auth]);

  useEffect(() => { if (auth) reloadNotes(); }, [auth, reloadNotes]);

  const items = useMemo(() => {
    if (!auth) return [];
    if (view === "comunidad")
      return pub.map((n) => ({ ...n, visibilidad: "publico", mine: n.autorId === auth.userId }));
    const misPriv = priv.map((n) => ({ ...n, visibilidad: "privado", mine: true, autor: auth.username, autorId: auth.userId }));
    const misPub = pub.filter((n) => n.autorId === auth.userId).map((n) => ({ ...n, visibilidad: "publico", mine: true }));
    return [...misPriv, ...misPub].sort((a, b) => b.fecha - a.fecha);
  }, [view, priv, pub, auth]);

  const subjects = useMemo(() => {
    const s = [...new Set(items.map((n) => n.asignatura).filter(Boolean))];
    return s.sort((a, b) => a.localeCompare(b, "es"));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((n) => {
      if (activeSubject && n.asignatura !== activeSubject) return false;
      if (!q) return true;
      return [n.titulo, n.contenido, n.asignatura, n.autor].some((f) => (f || "").toLowerCase().includes(q));
    });
  }, [items, query, activeSubject]);

  useEffect(() => { setActiveSubject(null); }, [view]);

  async function saveNote(draft) {
    const id = draft.id || uid();
    const adjuntos = draft.adjuntos || [];
    const adjuntosMeta = adjuntos.map((a) => ({ nombre: a.nombre, tipo: a.tipo, tamano: a.tamano }));
    const base = { id, titulo: draft.titulo.trim() || "Sin título", asignatura: draft.asignatura.trim() || "General",
      contenido: draft.contenido || "", fecha: draft.fecha || Date.now(), adjuntosMeta };
    const wasPub = draft.visibilidadOriginal === "publico";
    const isPub = draft.visibilidad === "publico";
    try {
      if (draft.id && wasPub && !isPub) { await store.delPublic(id); await store.delPublicFiles(id); }
      if (draft.id && !wasPub && isPub) { await store.delPriv(auth.userId, id); await store.delPrivFiles(auth.userId, id); }
      if (isPub) {
        if (adjuntos.length) await store.setPublicFiles(id, adjuntos); else await store.delPublicFiles(id);
        await store.setPublic(id, { ...base, autor: auth.username, autorId: auth.userId });
      } else {
        if (adjuntos.length) await store.setPrivFiles(auth.userId, id, adjuntos); else await store.delPrivFiles(auth.userId, id);
        const ok = await store.setPriv(auth.userId, id, base);
        if (!ok) throw new Error();
      }
      setEditing(null); await reloadNotes();
      flash(draft.id ? "Apunte actualizado" : isPub ? "Publicado en la comunidad" : "Guardado en privado");
    } catch {
      flash("No se pudo guardar. Puede que los archivos superen el límite (~5 MB).");
      setEditing(null); await reloadNotes();
    }
  }

  async function deleteNote(item) {
    if (item.visibilidad === "publico") {
      if (item.autorId !== auth.userId) { flash("Solo puedes eliminar tus propios apuntes."); return; }
      await store.delPublic(item.id); await store.delPublicFiles(item.id);
    } else { await store.delPriv(auth.userId, item.id); await store.delPrivFiles(auth.userId, item.id); }
    setViewing(null); setEditing(null); await reloadNotes(); flash("Apunte eliminado");
  }

  async function openNote(item) {
    const adjuntos = item.adjuntosMeta?.length
      ? (item.visibilidad === "publico" ? await store.getPublicFiles(item.id) : await store.getPrivFiles(auth.userId, item.id))
      : [];
    setViewing({ ...item, adjuntos });
  }

  async function logout() { await store.delSession(); setAuth(null); setPriv([]); setPub([]); setView("mias"); }

  if (booting) return <div className="ap-root ap-center"><Style /><Loader2 className="ap-spin" size={28} /></div>;
  if (!auth) return <><Style /><Auth onAuthed={async (a) => { await store.setSession({ username: a.username }); setAuth(a); }} /></>;

  const ac = avatarColor(auth.userId);

  return (
    <div className="ap-root">
      <Style />
      <header className="ap-header">
        <div className="ap-brand">
          <span className="ap-mark"><BookOpen size={20} strokeWidth={2.4} /></span>
          <div><h1>Archivador</h1><p>Apuntes de la carrera, tuyos y compartidos</p></div>
        </div>
        <div className="ap-search">
          <Search size={17} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar apuntes…" aria-label="Buscar" />
          {query && <button className="ap-clear" onClick={() => setQuery("")} aria-label="Limpiar"><X size={15} /></button>}
        </div>
        <div className="ap-me">
          <span className="ap-avatar" style={{ "--c": ac.tab }}>{initials(auth.username)}</span>
          <span className="ap-me-name">{auth.username}</span>
          <button className="ap-icon-btn" title="Cerrar sesión" onClick={logout} aria-label="Cerrar sesión"><LogOut size={16} /></button>
        </div>
      </header>

      <div className="ap-segment">
        <button className={view === "mias" ? "is-on" : ""} onClick={() => setView("mias")}><User size={15} /> Mis apuntes</button>
        <button className={view === "comunidad" ? "is-on" : ""} onClick={() => setView("comunidad")}><Users size={15} /> Comunidad</button>
      </div>

      <div className="ap-body">
        <Sidebar subjects={subjects} items={items} active={activeSubject} onPick={setActiveSubject} total={items.length} />
        <main className="ap-main">
          <div className="ap-main-top">
            <h2>{activeSubject || (view === "comunidad" ? "Apuntes públicos" : "Todos tus apuntes")}<span className="ap-count">{filtered.length}</span></h2>
            {view === "mias" && <button className="ap-new" onClick={() => setEditing({})}><Plus size={17} strokeWidth={2.6} /> Nuevo apunte</button>}
          </div>
          {loadingNotes ? (
            <div className="ap-empty"><Loader2 className="ap-spin" size={26} /><p>Cargando…</p></div>
          ) : filtered.length === 0 ? (
            <Empty view={view} hasAny={items.length > 0} searching={!!query} onNew={() => setEditing({ asignatura: activeSubject || "" })} />
          ) : (
            <div className="ap-grid">
              {filtered.map((n) => (
                <NoteCard key={n.id + n.visibilidad} note={n} showAuthor={view === "comunidad"}
                  color={colorFor(n.asignatura, subjects)} onOpen={() => openNote(n)} />
              ))}
            </div>
          )}
        </main>
      </div>

      {editing !== null && (
        <Editor initial={editing} subjects={subjects} flash={flash} onClose={() => setEditing(null)}
          onSave={saveNote} onDelete={editing.id ? () => deleteNote(editing) : null} />
      )}
      {viewing && (
        <Viewer note={viewing} color={colorFor(viewing.asignatura, subjects)} onClose={() => setViewing(null)}
          onEdit={viewing.mine ? () => { setEditing(viewing); setViewing(null); } : null}
          onDelete={viewing.mine ? () => deleteNote(viewing) : null} />
      )}
      {toast && <div className="ap-toast" role="status">{toast}</div>}
    </div>
  );
}

/* ============================ autenticación ============================= */
function Auth({ onAuthed }) {
  const [mode, setMode] = useState("login");   // login | registro
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, [mode]);

  const switchMode = (m) => { setMode(m); setErr(""); setPassword(""); setConfirm(""); };

  async function submit() {
    setErr("");
    const u = username.trim();
    const ul = u.toLowerCase();
    if (busy) return;
    if (u.length < 3) return setErr("El usuario debe tener al menos 3 caracteres.");
    if (!/^[a-z0-9._-]+$/i.test(u)) return setErr("Usa solo letras, números, puntos o guiones en el usuario.");
    if (password.length < 6) return setErr("La contraseña debe tener al menos 6 caracteres.");
    if (mode === "registro" && password !== confirm) return setErr("Las contraseñas no coinciden.");

    setBusy(true);
    try {
      const existing = await store.getUser(ul);
      if (mode === "registro") {
        if (existing) { setBusy(false); return setErr("Ese usuario ya existe. Inicia sesión o elige otro."); }
        const salt = randSalt();
        const ph = await hashPw(password, salt);
        const userId = uid();
        const ok = await store.setUser(ul, { username: u, userId, salt, hash: ph, creado: Date.now() });
        if (!ok) throw new Error();
        onAuthed({ userId, username: u });
      } else {
        if (!existing) { setBusy(false); return setErr("No existe ninguna cuenta con ese usuario."); }
        const ph = await hashPw(password, existing.salt);
        if (ph !== existing.hash) { setBusy(false); return setErr("Contraseña incorrecta."); }
        onAuthed({ userId: existing.userId, username: existing.username });
      }
    } catch {
      setBusy(false);
      setErr("No se pudo completar. Inténtalo de nuevo.");
    }
  }

  return (
    <div className="ap-root ap-welcome">
      <div className="ap-welcome-card">
        <span className="ap-mark ap-mark--lg"><BookOpen size={26} strokeWidth={2.4} /></span>
        <h1>Tu archivador de apuntes</h1>
        <p className="ap-welcome-sub">Crea tu cuenta para guardar apuntes, decidir cuáles son privados y compartir con la comunidad los que quieras.</p>

        <div className="ap-authtabs">
          <button className={mode === "login" ? "is-on" : ""} onClick={() => switchMode("login")}>Iniciar sesión</button>
          <button className={mode === "registro" ? "is-on" : ""} onClick={() => switchMode("registro")}>Crear cuenta</button>
        </div>

        <label className="ap-field"><span>Usuario</span>
          <input ref={ref} value={username} onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="tu_usuario" autoComplete="username" maxLength={24} /></label>

        <label className="ap-field"><span>Contraseña</span>
          <div className="ap-pw">
            <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} />
            <button type="button" className="ap-pw-eye" onClick={() => setShow((s) => !s)} aria-label="Mostrar contraseña">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div></label>

        {mode === "registro" && (
          <label className="ap-field"><span>Repite la contraseña</span>
            <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••••" autoComplete="new-password" /></label>
        )}

        {err && <p className="ap-err">{err}</p>}

        <button className="ap-save ap-save--block" onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="ap-spin" size={16} /> : null}{mode === "login" ? "Entrar" : "Crear cuenta"}</button>

        <p className="ap-welcome-note">
          <ShieldCheck size={13} /> Tu contraseña se guarda cifrada (hash), nunca en texto plano. Aun así, los datos viven en este artefacto y no en un servidor seguro: no reutilices una contraseña importante.
        </p>
      </div>
    </div>
  );
}

/* ================================ sidebar =============================== */
function Sidebar({ subjects, items, active, onPick, total }) {
  const countOf = (s) => items.filter((n) => n.asignatura === s).length;
  return (
    <aside className="ap-side">
      <p className="ap-side-label"><Tag size={13} /> Asignaturas</p>
      <button className={"ap-tab ap-tab--all" + (active === null ? " is-active" : "")} onClick={() => onPick(null)}><span>Todas</span><b>{total}</b></button>
      {subjects.length === 0 && <p className="ap-side-hint">Las asignaturas aparecerán aquí en cuanto haya apuntes.</p>}
      {subjects.map((s) => { const c = colorFor(s, subjects); return (
        <button key={s} className={"ap-tab" + (active === s ? " is-active" : "")} style={{ "--tab": c.tab, "--soft": c.soft, "--ink": c.ink }} onClick={() => onPick(s)}>
          <span className="ap-tab-dot" /><span className="ap-tab-name">{s}</span><b>{countOf(s)}</b></button>); })}
    </aside>
  );
}

/* ================================ tarjeta =============================== */
function NoteCard({ note, color, onOpen, showAuthor }) {
  const ac = avatarColor(note.autorId || "");
  return (
    <article className="ap-card" style={{ "--tab": color.tab, "--soft": color.soft, "--ink": color.ink }}
      onClick={onOpen} tabIndex={0} role="button" onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}>
      <div className="ap-card-tab" />
      <div className="ap-card-row">
        <span className="ap-card-subject">{note.asignatura}</span>
        <span className={"ap-badge " + (note.visibilidad === "publico" ? "is-pub" : "is-priv")}>
          {note.visibilidad === "publico" ? <Globe size={11} /> : <Lock size={11} />}{note.visibilidad === "publico" ? "Público" : "Privado"}</span>
      </div>
      <h3>{note.titulo}</h3>
      <p className="ap-card-text">{note.contenido || "Sin texto — solo archivos adjuntos."}</p>
      <div className="ap-card-foot">
        {showAuthor
          ? <span className="ap-card-author"><span className="ap-avatar ap-avatar--xs" style={{ "--c": ac.tab }}>{initials(note.autor)}</span>{note.mine ? "Tú" : note.autor}</span>
          : <span>{fmtDate(note.fecha)}</span>}
        {note.adjuntosMeta?.length > 0 && <span className="ap-card-clip"><Paperclip size={12} />{note.adjuntosMeta.length}</span>}
      </div>
    </article>
  );
}

/* ================================= vacío ================================ */
function Empty({ view, hasAny, searching, onNew }) {
  if (searching || hasAny) return (
    <div className="ap-empty"><span className="ap-empty-icon"><Search size={28} /></span>
      <p>Nada coincide con tu búsqueda.</p><span className="ap-empty-sub">Prueba con otras palabras o cambia de asignatura.</span></div>);
  if (view === "comunidad") return (
    <div className="ap-empty"><span className="ap-empty-icon"><Users size={28} /></span>
      <p>Aún no hay apuntes públicos.</p><span className="ap-empty-sub">Marca uno de tus apuntes como público y aparecerá aquí para todos.</span></div>);
  return (
    <div className="ap-empty"><span className="ap-empty-icon"><Inbox size={28} /></span>
      <p>Tu archivador está vacío.</p><span className="ap-empty-sub">Empieza guardando tus primeros apuntes de clase.</span>
      <button className="ap-new" onClick={onNew}><Plus size={16} strokeWidth={2.6} /> Crear el primero</button></div>);
}

/* ================================= editor =============================== */
function Editor({ initial, subjects, onClose, onSave, onDelete, flash }) {
  const [titulo, setTitulo] = useState(initial.titulo || "");
  const [asignatura, setAsignatura] = useState(initial.asignatura || "");
  const [contenido, setContenido] = useState(initial.contenido || "");
  const [adjuntos, setAdjuntos] = useState(initial.adjuntos || []);
  const [visibilidad, setVisibilidad] = useState(initial.visibilidad || "privado");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null), titleRef = useRef(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  useEffect(() => { const esc = (e) => e.key === "Escape" && onClose(); window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc); }, [onClose]);

  async function addFiles(list) {
    const arr = [...list];
    const big = arr.find((f) => f.size > 4.5 * 1048576);
    if (big) flash(`"${big.name}" supera 4,5 MB y puede no guardarse.`);
    const loaded = [];
    for (const f of arr) { try { loaded.push({ nombre: f.name, tipo: f.type || "archivo", tamano: f.size, datos: await readAsDataURL(f) }); } catch {} }
    setAdjuntos((p) => [...p, ...loaded]); if (fileRef.current) fileRef.current.value = "";
  }
  function submit() { if (busy) return; setBusy(true);
    onSave({ id: initial.id, titulo, asignatura, contenido, adjuntos, visibilidad, visibilidadOriginal: initial.visibilidad, fecha: initial.fecha || Date.now() }); }

  return (
    <div className="ap-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ap-modal" role="dialog" aria-modal="true">
        <div className="ap-modal-head"><h3>{initial.id ? "Editar apunte" : "Nuevo apunte"}</h3>
          <button className="ap-icon-btn" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>
        <div className="ap-modal-scroll">
          <label className="ap-field"><span>Título</span>
            <input ref={titleRef} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="p. ej. Tema 3 — Integrales" /></label>
          <label className="ap-field"><span>Asignatura</span>
            <input value={asignatura} onChange={(e) => setAsignatura(e.target.value)} placeholder="p. ej. Cálculo I" list="ap-subjects" />
            <datalist id="ap-subjects">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
            {subjects.length > 0 && <div className="ap-chips">{subjects.map((s) => <button key={s} type="button" className="ap-chip" onClick={() => setAsignatura(s)}>{s}</button>)}</div>}</label>
          <label className="ap-field"><span>Apuntes</span>
            <textarea value={contenido} onChange={(e) => setContenido(e.target.value)} rows={8} placeholder="Escribe aquí tus apuntes…" /></label>
          <div className="ap-field"><span>Visibilidad</span>
            <div className="ap-vis">
              <button type="button" className={"ap-vis-opt" + (visibilidad === "privado" ? " is-on" : "")} onClick={() => setVisibilidad("privado")}>
                <Lock size={16} /><div><b>Privado</b><small>Solo tú lo ves</small></div></button>
              <button type="button" className={"ap-vis-opt" + (visibilidad === "publico" ? " is-on" : "")} onClick={() => setVisibilidad("publico")}>
                <Globe size={16} /><div><b>Público</b><small>Visible para la comunidad</small></div></button></div></div>
          <div className="ap-field"><span>Archivos adjuntos</span>
            <div className="ap-drop" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}>
              <Paperclip size={16} /><span>Arrastra archivos o haz clic para subir <em>(PDF, imágenes…)</em></span>
              <input ref={fileRef} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} /></div>
            {adjuntos.length > 0 && <ul className="ap-files">{adjuntos.map((a, i) => (
              <li key={i}>{a.tipo.startsWith("image/") ? <ImageIcon size={15} /> : <FileText size={15} />}
                <span className="ap-file-name">{a.nombre}</span><span className="ap-file-size">{fmtSize(a.tamano)}</span>
                <button className="ap-icon-btn ap-icon-btn--sm" aria-label="Quitar" onClick={() => setAdjuntos((p) => p.filter((_, j) => j !== i))}><X size={14} /></button></li>))}</ul>}
          </div>
        </div>
        <div className="ap-modal-foot">
          {onDelete && <button className="ap-del" onClick={onDelete}><Trash2 size={15} /> Eliminar</button>}
          <div className="ap-foot-right">
            <button className="ap-ghost" onClick={onClose}>Cancelar</button>
            <button className="ap-save" onClick={submit} disabled={busy}>{busy ? <Loader2 className="ap-spin" size={16} /> : null}{initial.id ? "Guardar cambios" : "Guardar apunte"}</button></div>
        </div>
      </div>
    </div>
  );
}

/* ================================= visor ================================ */
function Viewer({ note, color, onClose, onEdit, onDelete }) {
  useEffect(() => { const esc = (e) => e.key === "Escape" && onClose(); window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc); }, [onClose]);
  const ac = avatarColor(note.autorId || "");
  return (
    <div className="ap-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ap-modal ap-modal--view" style={{ "--tab": color.tab, "--soft": color.soft, "--ink": color.ink }} role="dialog" aria-modal="true">
        <div className="ap-view-bar">
          <button className="ap-back" onClick={onClose}><ArrowLeft size={16} /> Volver</button>
          <div className="ap-foot-right">
            {onEdit && <button className="ap-ghost ap-ghost--sm" onClick={onEdit}><Pencil size={14} /> Editar</button>}
            {onDelete && <button className="ap-del ap-del--sm" onClick={onDelete}><Trash2 size={14} /> Eliminar</button>}</div>
        </div>
        <div className="ap-modal-scroll">
          <div className="ap-card-row">
            <span className="ap-view-subject">{note.asignatura}</span>
            <span className={"ap-badge " + (note.visibilidad === "publico" ? "is-pub" : "is-priv")}>
              {note.visibilidad === "publico" ? <Globe size={11} /> : <Lock size={11} />}{note.visibilidad === "publico" ? "Público" : "Privado"}</span></div>
          <h2 className="ap-view-title">{note.titulo}</h2>
          <p className="ap-view-date">
            {note.visibilidad === "publico" && <span className="ap-card-author" style={{ marginRight: 10 }}>
              <span className="ap-avatar ap-avatar--xs" style={{ "--c": ac.tab }}>{initials(note.autor)}</span>{note.mine ? "Tú" : note.autor} · </span>}
            {fmtDate(note.fecha)}</p>
          {note.contenido ? <div className="ap-view-text">{note.contenido}</div> : <p className="ap-view-empty">Este apunte no tiene texto.</p>}
          {note.adjuntos?.length > 0 && (
            <div className="ap-view-files"><p className="ap-view-files-h"><Paperclip size={14} /> Adjuntos</p>
              {note.adjuntos.map((a, i) => (
                <div key={i} className="ap-attach">
                  {a.tipo.startsWith("image/")
                    ? <a href={a.datos} download={a.nombre} className="ap-attach-img"><img src={a.datos} alt={a.nombre} /><span><Download size={13} /> {a.nombre}</span></a>
                    : <a href={a.datos} download={a.nombre} className="ap-attach-file"><FileText size={18} /><span className="ap-file-name">{a.nombre}</span><span className="ap-file-size">{fmtSize(a.tamano)}</span><Download size={15} /></a>}
                </div>))}</div>)}
        </div>
      </div>
    </div>
  );
}

/* ================================ estilos =============================== */
function Style() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600&display=swap');
.ap-root{--bg:#F4F6FB;--surface:#FFFFFF;--ink:#191C2E;--muted:#6B7185;--line:#E5E8F1;--brand:#5B4FE8;--brand-soft:#ECEAFD;
  font-family:'Inter',system-ui,sans-serif;color:var(--ink);min-height:100vh;-webkit-font-smoothing:antialiased;
  background:radial-gradient(120% 90% at 100% 0%,#EEF0FB 0%,transparent 55%),var(--bg)}
.ap-root *{box-sizing:border-box}
.ap-root h1,.ap-root h2,.ap-root h3{font-family:'Bricolage Grotesque',system-ui,sans-serif;margin:0;letter-spacing:-.02em}
.ap-center{display:grid;place-items:center;color:var(--brand)}

.ap-welcome{display:grid;place-items:center;padding:24px}
.ap-welcome-card{background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:36px;max-width:430px;width:100%;box-shadow:0 30px 70px -30px rgba(20,22,38,.4);text-align:center}
.ap-mark{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:var(--brand);color:#fff;box-shadow:0 6px 16px -6px var(--brand);flex:none}
.ap-mark--lg{width:56px;height:56px;border-radius:16px;margin:0 auto 18px}
.ap-welcome-card h1{font-size:24px;font-weight:800}
.ap-welcome-sub{color:var(--muted);font-size:13.5px;line-height:1.55;margin:9px 0 22px}
.ap-welcome-card .ap-field{text-align:left;margin-bottom:14px}
.ap-welcome-note{display:flex;align-items:flex-start;gap:7px;text-align:left;font-size:11.5px;color:var(--muted);line-height:1.55;margin:16px 0 0;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:11px}
.ap-welcome-note svg{flex:none;margin-top:1px;color:var(--brand)}
.ap-save--block{width:100%;justify-content:center;padding:13px;margin-top:4px}
.ap-authtabs{display:flex;gap:4px;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:4px;margin-bottom:20px}
.ap-authtabs button{flex:1;border:0;background:0;font-family:inherit;font-size:13.5px;font-weight:600;color:var(--muted);padding:9px;border-radius:9px;cursor:pointer;transition:.13s}
.ap-authtabs button.is-on{background:var(--surface);color:var(--ink);box-shadow:0 2px 6px -3px rgba(25,28,46,.3)}
.ap-pw{position:relative}
.ap-pw input{padding-right:42px;width:100%}
.ap-pw-eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);border:0;background:0;cursor:pointer;color:var(--muted);display:grid;place-items:center;width:30px;height:30px;border-radius:8px}
.ap-pw-eye:hover{color:var(--ink);background:var(--bg)}
.ap-err{text-align:left;font-size:12.5px;color:#C93B3B;background:#FDF1F1;border:1px solid #F4CFCF;border-radius:10px;padding:9px 12px;margin:0 0 12px}

.ap-header{display:flex;align-items:center;gap:20px;flex-wrap:wrap;padding:18px clamp(16px,4vw,40px);border-bottom:1px solid var(--line);background:rgba(255,255,255,.7);backdrop-filter:blur(8px);position:sticky;top:0;z-index:20}
.ap-brand{display:flex;align-items:center;gap:13px;margin-right:auto}
.ap-brand h1{font-size:21px;font-weight:800}.ap-brand p{margin:1px 0 0;font-size:12.5px;color:var(--muted)}
.ap-search{display:flex;align-items:center;gap:9px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:0 12px;flex:1 1 220px;max-width:380px;transition:.15s}
.ap-search:focus-within{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft)}
.ap-search svg{color:var(--muted);flex:none}
.ap-search input{border:0;outline:0;background:0;padding:11px 0;font-size:14px;width:100%;color:var(--ink);font-family:inherit}
.ap-clear{border:0;background:0;cursor:pointer;color:var(--muted);display:grid;place-items:center;padding:4px}
.ap-me{display:flex;align-items:center;gap:9px}
.ap-me-name{font-size:13.5px;font-weight:600;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ap-avatar{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--c);color:#fff;font-size:13px;font-weight:700;flex:none;font-family:'Bricolage Grotesque',sans-serif}
.ap-avatar--xs{width:20px;height:20px;font-size:9px}

.ap-segment{display:flex;gap:4px;padding:14px clamp(16px,4vw,40px) 0}
.ap-segment button{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:var(--surface);color:var(--muted);font-family:inherit;font-size:13.5px;font-weight:600;padding:9px 16px;border-radius:11px;cursor:pointer;transition:.13s}
.ap-segment button:hover{color:var(--ink)}
.ap-segment button.is-on{background:var(--brand);border-color:var(--brand);color:#fff;box-shadow:0 8px 18px -10px var(--brand)}

.ap-body{display:grid;grid-template-columns:248px 1fr}
.ap-side{padding:22px 16px;position:sticky;top:81px;display:flex;flex-direction:column;gap:6px;border-right:1px solid var(--line)}
.ap-side-label{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin:0 8px 6px}
.ap-side-hint{font-size:12.5px;color:var(--muted);line-height:1.5;margin:8px;padding:12px;background:var(--surface);border:1px dashed var(--line);border-radius:11px}
.ap-tab{display:flex;align-items:center;gap:10px;width:100%;text-align:left;cursor:pointer;border:1px solid transparent;background:0;border-radius:10px;padding:9px 11px;font-size:13.5px;font-weight:500;color:var(--ink);font-family:inherit;transition:.13s}
.ap-tab b{margin-left:auto;font-size:12px;font-weight:600;color:var(--muted);background:#fff;border:1px solid var(--line);border-radius:20px;padding:1px 8px;min-width:24px;text-align:center}
.ap-tab:hover{background:var(--surface)}
.ap-tab.is-active{background:var(--surface);border-color:var(--line);box-shadow:0 2px 8px -4px rgba(25,28,46,.18)}
.ap-tab--all.is-active{background:var(--brand);color:#fff}
.ap-tab--all.is-active b{background:rgba(255,255,255,.22);border-color:transparent;color:#fff}
.ap-tab-dot{width:9px;height:9px;border-radius:3px;background:var(--tab);flex:none}
.ap-tab-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ap-tab.is-active .ap-tab-dot{box-shadow:0 0 0 3px var(--soft)}

.ap-main{padding:24px clamp(16px,4vw,40px) 60px}
.ap-main-top{display:flex;align-items:center;gap:16px;margin-bottom:22px;flex-wrap:wrap}
.ap-main-top h2{font-size:23px;font-weight:800;display:flex;align-items:center;gap:11px;margin-right:auto}
.ap-count{font-family:'Inter';font-size:12px;font-weight:600;color:var(--muted);background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:2px 9px}
.ap-new{display:inline-flex;align-items:center;gap:7px;background:var(--brand);color:#fff;border:0;border-radius:11px;padding:10px 16px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 8px 18px -8px var(--brand);transition:.12s}
.ap-new:hover{filter:brightness(1.07);transform:translateY(-1px)}

.ap-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(244px,1fr));gap:16px}
.ap-card{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px 18px 14px;cursor:pointer;overflow:hidden;transition:.14s;display:flex;flex-direction:column;min-height:166px}
.ap-card-tab{position:absolute;top:0;left:18px;width:46px;height:5px;border-radius:0 0 4px 4px;background:var(--tab)}
.ap-card:hover{transform:translateY(-3px);box-shadow:0 16px 30px -16px rgba(25,28,46,.32);border-color:transparent}
.ap-card:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.ap-card-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0 9px}
.ap-card-subject{font-size:11px;font-weight:600;color:var(--ink);background:var(--soft);padding:3px 9px;border-radius:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ap-badge{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;padding:3px 8px;border-radius:20px;flex:none}
.ap-badge.is-priv{background:#EFF1F6;color:var(--muted)}
.ap-badge.is-pub{background:var(--brand-soft);color:var(--brand)}
.ap-card h3{font-size:16px;font-weight:700;line-height:1.25;margin-bottom:7px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ap-card-text{font-size:13px;color:var(--muted);line-height:1.5;flex:1;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.ap-card-foot{display:flex;align-items:center;justify-content:space-between;margin-top:12px;font-size:11.5px;color:var(--muted)}
.ap-card-author{display:inline-flex;align-items:center;gap:6px;font-weight:600;color:var(--ink)}
.ap-card-clip{display:inline-flex;align-items:center;gap:4px;color:var(--ink);font-weight:600}

.ap-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;padding:72px 20px;color:var(--muted)}
.ap-empty-icon{display:grid;place-items:center;width:60px;height:60px;border-radius:50%;background:var(--surface);border:1px solid var(--line);color:var(--brand);margin-bottom:6px}
.ap-empty p{font-size:16px;font-weight:600;color:var(--ink);margin:0}.ap-empty-sub{font-size:13.5px;max-width:340px}
.ap-empty .ap-new{margin-top:14px}
.ap-spin{animation:ap-rot 1s linear infinite}@keyframes ap-rot{to{transform:rotate(360deg)}}

.ap-overlay{position:fixed;inset:0;background:rgba(20,22,38,.42);backdrop-filter:blur(3px);display:grid;place-items:center;padding:18px;z-index:50;animation:ap-fade .15s ease}
@keyframes ap-fade{from{opacity:0}}
.ap-modal{background:var(--surface);border-radius:18px;width:min(620px,100%);max-height:90vh;display:flex;flex-direction:column;box-shadow:0 30px 70px -20px rgba(20,22,38,.5);animation:ap-pop .18s cubic-bezier(.2,.8,.3,1)}
@keyframes ap-pop{from{transform:translateY(10px) scale(.98);opacity:0}}
.ap-modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--line)}
.ap-modal-head h3{font-size:18px;font-weight:800}
.ap-modal-scroll{padding:20px 22px;overflow-y:auto}
.ap-icon-btn{border:0;background:0;cursor:pointer;color:var(--muted);display:grid;place-items:center;width:32px;height:32px;border-radius:9px;transition:.12s}
.ap-icon-btn:hover{background:var(--bg);color:var(--ink)}.ap-icon-btn--sm{width:26px;height:26px}

.ap-field{display:block;margin-bottom:18px}
.ap-field>span{display:block;font-size:12.5px;font-weight:600;margin-bottom:7px;color:var(--ink)}
.ap-field input,.ap-field textarea{width:100%;border:1px solid var(--line);border-radius:11px;padding:11px 13px;font-size:14px;font-family:inherit;color:var(--ink);background:#FBFCFE;outline:0;transition:.14s;resize:vertical}
.ap-field input:focus,.ap-field textarea:focus{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft);background:#fff}
.ap-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
.ap-chip{border:1px solid var(--line);background:#fff;border-radius:20px;padding:4px 11px;font-size:12px;cursor:pointer;color:var(--muted);font-family:inherit;transition:.12s}
.ap-chip:hover{border-color:var(--brand);color:var(--brand)}
.ap-vis{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ap-vis-opt{display:flex;align-items:center;gap:11px;text-align:left;border:1.5px solid var(--line);background:#FBFCFE;border-radius:12px;padding:13px;cursor:pointer;font-family:inherit;color:var(--muted);transition:.13s}
.ap-vis-opt b{display:block;font-size:13.5px;color:var(--ink);font-weight:600}
.ap-vis-opt small{font-size:11.5px;color:var(--muted)}
.ap-vis-opt.is-on{border-color:var(--brand);background:var(--brand-soft);color:var(--brand)}
.ap-vis-opt.is-on b{color:var(--brand)}
.ap-drop{display:flex;align-items:center;gap:10px;border:1.5px dashed var(--line);border-radius:11px;padding:14px 15px;cursor:pointer;color:var(--muted);font-size:13px;transition:.14s;background:#FBFCFE}
.ap-drop em{font-style:normal;opacity:.7}.ap-drop:hover{border-color:var(--brand);color:var(--brand);background:var(--brand-soft)}
.ap-files{list-style:none;margin:11px 0 0;padding:0;display:flex;flex-direction:column;gap:7px}
.ap-files li{display:flex;align-items:center;gap:9px;background:var(--bg);border:1px solid var(--line);border-radius:9px;padding:8px 10px;font-size:13px}
.ap-files li svg{color:var(--brand);flex:none}
.ap-file-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ap-file-size{font-size:11.5px;color:var(--muted);flex:none}

.ap-modal-foot{display:flex;align-items:center;gap:12px;padding:16px 22px;border-top:1px solid var(--line)}
.ap-foot-right{display:flex;gap:9px;margin-left:auto}
.ap-ghost{border:1px solid var(--line);background:#fff;border-radius:10px;padding:10px 16px;font-size:13.5px;font-weight:600;cursor:pointer;color:var(--ink);font-family:inherit;transition:.12s}
.ap-ghost:hover{background:var(--bg)}.ap-ghost--sm{padding:7px 12px;font-size:12.5px;display:inline-flex;align-items:center;gap:6px}
.ap-save{display:inline-flex;align-items:center;gap:8px;border:0;background:var(--brand);color:#fff;border-radius:10px;padding:10px 18px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 8px 18px -8px var(--brand);transition:.12s}
.ap-save:hover{filter:brightness(1.07)}.ap-save:disabled{opacity:.6;cursor:default}
.ap-del{display:inline-flex;align-items:center;gap:6px;border:1px solid #F4CFCF;background:#FDF1F1;color:#C93B3B;border-radius:10px;padding:9px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:.12s}
.ap-del:hover{background:#FBE2E2}.ap-del--sm{padding:7px 12px;font-size:12.5px}

.ap-modal--view{width:min(680px,100%)}
.ap-view-bar{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--line)}
.ap-back{display:inline-flex;align-items:center;gap:7px;border:0;background:0;cursor:pointer;font-size:13.5px;font-weight:600;color:var(--muted);font-family:inherit;padding:6px 4px}
.ap-back:hover{color:var(--ink)}
.ap-view-subject{font-size:12px;font-weight:600;color:var(--ink);background:var(--soft);padding:4px 11px;border-radius:8px;border-left:3px solid var(--tab)}
.ap-view-title{font-size:26px;font-weight:800;line-height:1.2;margin:14px 0 4px}
.ap-view-date{display:flex;align-items:center;font-size:12.5px;color:var(--muted);margin:0 0 20px}
.ap-view-text{font-size:14.5px;line-height:1.7;color:#2C3045;white-space:pre-wrap;word-break:break-word}
.ap-view-empty{font-size:14px;color:var(--muted);font-style:italic}
.ap-view-files{margin-top:26px;padding-top:20px;border-top:1px solid var(--line)}
.ap-view-files-h{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:0 0 12px}
.ap-attach{margin-bottom:10px}
.ap-attach-file{display:flex;align-items:center;gap:11px;text-decoration:none;color:var(--ink);border:1px solid var(--line);border-radius:11px;padding:11px 13px;font-size:13.5px;transition:.12s}
.ap-attach-file:hover{border-color:var(--brand);background:var(--brand-soft)}.ap-attach-file>svg:first-child{color:var(--brand)}
.ap-attach-img{display:block;text-decoration:none;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.ap-attach-img img{display:block;width:100%;max-height:340px;object-fit:contain;background:var(--bg)}
.ap-attach-img span{display:flex;align-items:center;gap:7px;padding:10px 13px;font-size:13px;color:var(--ink);border-top:1px solid var(--line)}

.ap-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;padding:12px 20px;border-radius:12px;font-size:13.5px;font-weight:500;z-index:80;max-width:90vw;text-align:center;box-shadow:0 16px 32px -12px rgba(20,22,38,.6);animation:ap-up .25s ease}
@keyframes ap-up{from{transform:translate(-50%,12px);opacity:0}}

@media (max-width:760px){
  .ap-body{grid-template-columns:1fr}
  .ap-side{position:static;flex-direction:row;flex-wrap:wrap;border-right:0;border-bottom:1px solid var(--line);padding:14px clamp(16px,4vw,40px)}
  .ap-side-label,.ap-side-hint{width:100%}.ap-tab{width:auto}.ap-tab b{margin-left:6px}
  .ap-vis{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:reduce){.ap-root *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`}</style>
  );
}
