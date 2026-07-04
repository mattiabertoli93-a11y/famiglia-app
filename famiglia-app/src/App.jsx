import { useState, useEffect, useRef } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { ref, onValue, set } from "firebase/database";
import { auth, db } from "./firebase.js";

// ─── Costanti ────────────────────────────────────────────────────────────────

const MEMBERS = [
  { id: "mattia", label: "Mattia", color: "#4F6EF7", emoji: "👦", bg: "#EEF1FF" },
  { id: "silvia", label: "Silvia", color: "#F75C7E", emoji: "👩", bg: "#FFF0F3" },
];

const TYPES = [
  { id: "impegno", label: "Impegno", icon: "📅", color: "#4F6EF7", bg: "#EEF1FF" },
  { id: "faccenda", label: "Faccenda", icon: "🧹", color: "#2CC09C", bg: "#E8FAF5" },
  { id: "compito", label: "Da fare", icon: "✅", color: "#F7A230", bg: "#FFF5E6" },
];

const RECURRENCE_OPTS = [
  { id: "none", label: "Nessuna" },
  { id: "daily", label: "Ogni giorno" },
  { id: "weekly", label: "Ogni settimana" },
  { id: "monthly", label: "Ogni mese" },
];

const CATEGORIES = {
  impegno: [
    { id: "scuola", label: "Scuola", icon: "📚" },
    { id: "sport", label: "Sport", icon: "⚽" },
    { id: "medico", label: "Medico", icon: "🏥" },
    { id: "lavoro", label: "Lavoro", icon: "💼" },
    { id: "famiglia", label: "Famiglia", icon: "🏠" },
    { id: "altro", label: "Altro", icon: "📌" },
  ],
  faccenda: [
    { id: "cucina", label: "Cucina", icon: "🍳" },
    { id: "pulizie", label: "Pulizie", icon: "🧽" },
    { id: "spesa", label: "Spesa", icon: "🛒" },
    { id: "bucato", label: "Bucato", icon: "👕" },
    { id: "giardino", label: "Giardino", icon: "🌿" },
    { id: "altro", label: "Altro", icon: "📌" },
  ],
  compito: [
    { id: "ricordare", label: "Da ricordare", icon: "🔔" },
    { id: "acquistare", label: "Da acquistare", icon: "🛍️" },
    { id: "chiamare", label: "Da chiamare", icon: "📞" },
    { id: "altro", label: "Altro", icon: "📌" },
  ],
};

const EXPENSE_CATS = [
  { id: "spesa", label: "Spesa", icon: "🛒", color: "#2CC09C", bg: "#E8FAF5" },
  { id: "ristorante", label: "Ristorante", icon: "🍕", color: "#F7A230", bg: "#FFF5E6" },
  { id: "bar", label: "Bar & Caffè", icon: "☕", color: "#8B5CF6", bg: "#F3EEFF" },
  { id: "trasporti", label: "Trasporti", icon: "🚗", color: "#3B82F6", bg: "#EFF6FF" },
  { id: "casa", label: "Casa", icon: "🏠", color: "#EC4899", bg: "#FDF2F8" },
  { id: "salute", label: "Salute", icon: "💊", color: "#EF4444", bg: "#FEF2F2" },
  { id: "svago", label: "Svago", icon: "🎬", color: "#F59E0B", bg: "#FFFBEB" },
  { id: "abbigliamento", label: "Abbigliamento", icon: "👕", color: "#6366F1", bg: "#EEF2FF" },
  { id: "altro", label: "Altro", icon: "📦", color: "#9CA3AF", bg: "#F9FAFB" },
];

const DEFAULT_BUDGETS = {
  spesa: 400, ristorante: 150, bar: 60, trasporti: 100,
  casa: 200, salute: 100, svago: 150, abbigliamento: 100, altro: 100,
};

const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const DAYS_SHORT = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
const DAYS_FULL = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"];
const QUICK_ICONS = ["🍕","🎮","✈️","🐾","🎁","💄","🔧","📱","🏋️","🎵","📚","🍺","🧴","💻","🌴"];

const GRADIENT = "linear-gradient(135deg, #4F6EF7 0%, #F75C7E 100%)";
const GRADIENT_GREEN = "linear-gradient(135deg, #16A34A, #22C55E)";
const BLANK_FORM = { title: "", members: ["mattia"], type: "impegno", category: "sport", time: "", note: "", recurrence: "none" };

// ─── Helpers data ─────────────────────────────────────────────────────────────

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m) { let d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }
function toDateStr(y, m, d) { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function getWeekStart(ds) { const d = new Date(ds+"T00:00:00"); const day = d.getDay()===0?6:d.getDay()-1; const mon = new Date(d); mon.setDate(d.getDate()-day); return mon; }
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate()+n); return d; }
function datObjToStr(d) { return toDateStr(d.getFullYear(), d.getMonth(), d.getDate()); }

const todayObj = new Date();
const todayStr = toDateStr(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());

function expandItems(items, ds) {
  const result = [];
  for (const item of items) {
    if (item.date === ds) { result.push(item); continue; }
    if (!item.recurrence || item.recurrence === "none") continue;
    const base = new Date(item.date + "T00:00:00");
    const target = new Date(ds + "T00:00:00");
    if (target <= base) continue;
    const diffDays = Math.round((target - base) / 86400000);
    let matches = false;
    if (item.recurrence === "daily") matches = true;
    else if (item.recurrence === "weekly") matches = diffDays % 7 === 0;
    else if (item.recurrence === "monthly") matches = base.getDate() === target.getDate();
    if (matches) result.push({ ...item, date: ds, _recurring: true, _baseId: item.id });
  }
  return result;
}

const SAMPLE_ITEMS = [
  { id: 1, title: "Fare la spesa", date: todayStr, members: ["silvia"], type: "faccenda", category: "spesa", time: "", note: "", recurrence: "none", done: false },
  { id: 2, title: "Cena in famiglia", date: todayStr, members: ["mattia","silvia"], type: "impegno", category: "famiglia", time: "20:00", note: "Prenotare al ristorante", recurrence: "none", done: false },
];

// ─── AI ───────────────────────────────────────────────────────────────────────

async function parseExpenseWithAI(text, customCats = []) {
  const allCats = [...EXPENSE_CATS, ...customCats];
  const catList = allCats.map(c => `${c.id} (${c.label})`).join(", ");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `Analizza questa spesa descritta in italiano e restituisci SOLO un oggetto JSON valido, senza testo aggiuntivo né backtick markdown.

Testo: "${text}"

Categorie disponibili: ${catList}
Membri della famiglia: mattia, silvia

Restituisci esattamente questo JSON:
{
  "amount": <numero decimale in euro. Converti virgola in punto: 2,50 → 2.5. Se non trovato: 0>,
  "category": "<id della categoria più appropriata>",
  "description": "<descrizione breve e chiara della spesa>",
  "member": "<mattia o silvia. Se non specificato esplicitamente: mattia>"
}`
      }]
    })
  });
  const data = await response.json();
  const raw = data.content.map(i => i.text || "").join("").trim();
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError("Email o password non corretti. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:GRADIENT, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#fff", borderRadius:28, padding:32, width:"100%", maxWidth:360, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:52, marginBottom:10 }}>🏡</div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:"#1A1A2E" }}>Famiglia</h1>
          <p style={{ margin:"6px 0 0", fontSize:14, color:"#AAA" }}>Mattia & Silvia</p>
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:12, fontWeight:800, color:"#555", textTransform:"uppercase", letterSpacing:0.5 }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="la-tua-email@gmail.com"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ width:"100%", border:"2px solid #EEF1FF", borderRadius:14, padding:"12px 16px", fontSize:14, marginTop:6, boxSizing:"border-box", outline:"none", background:"#FAFBFF", fontFamily:"inherit" }} />
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12, fontWeight:800, color:"#555", textTransform:"uppercase", letterSpacing:0.5 }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ width:"100%", border:"2px solid #EEF1FF", borderRadius:14, padding:"12px 16px", fontSize:14, marginTop:6, boxSizing:"border-box", outline:"none", background:"#FAFBFF", fontFamily:"inherit" }} />
        </div>

        {error && (
          <div style={{ background:"#FEF2F2", border:"1.5px solid #FECACA", borderRadius:12, padding:"10px 14px", marginBottom:14, fontSize:13, color:"#EF4444", fontWeight:600 }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={handleLogin} disabled={loading || !email || !password} style={{
          width:"100%", border:"none", borderRadius:16, padding:"14px",
          fontSize:15, cursor: loading ? "not-allowed" : "pointer",
          background: loading ? "#E5E7EB" : GRADIENT,
          color: loading ? "#9CA3AF" : "#fff", fontWeight:900,
          boxShadow: loading ? "none" : "0 4px 20px rgba(79,110,247,0.4)"
        }}>
          {loading ? "⏳ Accesso..." : "Entra →"}
        </button>

        <p style={{ margin:"16px 0 0", fontSize:12, color:"#CCC", textAlign:"center" }}>
          Usa le credenziali create su Firebase
        </p>
      </div>
    </div>
  );
}

// ─── App principale ───────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false); });
    return unsub;
  }, []);

  if (authLoading) return (
    <div style={{ minHeight:"100vh", background:GRADIENT, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:14 }}>
      <div style={{ fontSize:44 }}>🏡</div>
      <div style={{ color:"#fff", fontWeight:800, fontSize:16 }}>Caricamento...</div>
    </div>
  );

  if (!user) return <LoginScreen />;
  return <FamilyApp user={user} />;
}

// ─── FamilyApp ────────────────────────────────────────────────────────────────

function FamilyApp({ user }) {
  const [mainSection, setMainSection] = useState("calendario");

  // Calendar state
  const [view, setView] = useState("mese");
  const [year, setYear] = useState(todayObj.getFullYear());
  const [month, setMonth] = useState(todayObj.getMonth());
  const [weekStart, setWeekStart] = useState(() => getWeekStart(todayStr));
  const [items, setItems] = useState([]);
  const [nextId, setNextId] = useState(20);
  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [moveModal, setMoveModal] = useState(null);
  const [moveTarget, setMoveTarget] = useState("");
  const [expandedNote, setExpandedNote] = useState(null);
  const [filterMember, setFilterMember] = useState("tutti");
  const [calLoaded, setCalLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Expense state
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState(DEFAULT_BUDGETS);
  const [customCats, setCustomCats] = useState([]);
  const [spesaYear, setSpesaYear] = useState(todayObj.getFullYear());
  const [spesaMonth, setSpesaMonth] = useState(todayObj.getMonth());
  const [nextExpenseId, setNextExpenseId] = useState(100);
  const [expLoaded, setExpLoaded] = useState(false);
  const [syncingExp, setSyncingExp] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);
  const [aiError, setAiError] = useState("");
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [editBudgets, setEditBudgets] = useState(DEFAULT_BUDGETS);
  const [editRemovedCats, setEditRemovedCats] = useState([]);
  const [expandedCat, setExpandedCat] = useState(null);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📌");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Ref to avoid saving on first Firebase load
  const calSaveEnabled = useRef(false);
  const expSaveEnabled = useRef(false);

  // ── Firebase: Calendar ───────────────────────────────────────────────────────
  useEffect(() => {
    const dbRef = ref(db, "calendario");
    const unsub = onValue(dbRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setItems(val.items || SAMPLE_ITEMS);
        setNextId(val.nextId || 20);
      } else {
        setItems(SAMPLE_ITEMS);
        // Prima volta: salva i sample
        set(ref(db, "calendario"), { items: SAMPLE_ITEMS, nextId: 20 });
      }
      if (!calLoaded) {
        setCalLoaded(true);
        setTimeout(() => { calSaveEnabled.current = true; }, 500);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!calSaveEnabled.current) return;
    setSyncing(true);
    const t = setTimeout(async () => {
      try { await set(ref(db, "calendario"), { items, nextId }); } catch (e) {}
      setSyncing(false);
    }, 600);
    return () => clearTimeout(t);
  }, [items, nextId]);

  // ── Firebase: Spese ──────────────────────────────────────────────────────────
  useEffect(() => {
    const dbRef = ref(db, "spese");
    const unsub = onValue(dbRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setExpenses(val.expenses || []);
        setBudgets(val.budgets || DEFAULT_BUDGETS);
        setNextExpenseId(val.nextId || 100);
        setCustomCats(val.customCats || []);
      }
      if (!expLoaded) {
        setExpLoaded(true);
        setTimeout(() => { expSaveEnabled.current = true; }, 500);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!expSaveEnabled.current) return;
    setSyncingExp(true);
    const t = setTimeout(async () => {
      try { await set(ref(db, "spese"), { expenses, budgets, nextId: nextExpenseId, customCats }); } catch (e) {}
      setSyncingExp(false);
    }, 600);
    return () => clearTimeout(t);
  }, [expenses, budgets, nextExpenseId, customCats]);

  // ── Calendar helpers ─────────────────────────────────────────────────────────
  const memberOf = id => MEMBERS.find(m => m.id === id);
  const categoryOf = (type, cat) => (CATEGORIES[type]||[]).find(c => c.id === cat);
  const expCatOf = id => [...EXPENSE_CATS, ...customCats].find(c => c.id === id);

  function prevMonth() { if (month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function nextMonth() { if (month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }
  function prevWeek() { setWeekStart(d=>{const n=new Date(d);n.setDate(n.getDate()-7);return n;}); }
  function nextWeek() { setWeekStart(d=>{const n=new Date(d);n.setDate(n.getDate()+7);return n;}); }

  function itemsForDate(ds) {
    const expanded = expandItems(items, ds);
    if (filterMember === "tutti") return expanded;
    return expanded.filter(e => e.members && e.members.includes(filterMember));
  }
  const selectedItems = () => itemsForDate(selectedDay);

  function openNew() { setEditingId(null); setForm({...BLANK_FORM}); setShowForm(true); }
  function openEdit(item) {
    setEditingId(item.id);
    setForm({ title:item.title, members:item.members||["mattia"], type:item.type, category:item.category, time:item.time||"", note:item.note||"", recurrence:item.recurrence||"none" });
    setShowForm(true);
  }
  function saveItem() {
    if (!form.title.trim()) return;
    const cats = CATEGORIES[form.type];
    const cat = cats.find(c => c.id === form.category) ? form.category : cats[0].id;
    if (editingId !== null) {
      setItems(prev => prev.map(e => e.id === editingId
        ? {...e, title:form.title, members:form.members, type:form.type, category:cat, time:form.time, note:form.note, recurrence:form.recurrence}
        : e));
    } else {
      setItems(prev => [...prev, { id:nextId, title:form.title, date:selectedDay, members:form.members, type:form.type, category:cat, time:form.time, note:form.note, recurrence:form.recurrence, done:false }]);
      setNextId(n => n+1);
    }
    setShowForm(false); setEditingId(null); setForm(BLANK_FORM);
  }
  function toggleDone(id) { setItems(prev => prev.map(e => e.id === id ? {...e, done:!e.done} : e)); }
  function deleteItem(id) { setItems(prev => prev.filter(e => e.id !== id)); }
  function openMove(item) { setMoveModal(item); setMoveTarget(item.date); }
  function confirmMove() { if (!moveTarget) return; setItems(prev => prev.map(e => e.id === moveModal.id ? {...e, date:moveTarget} : e)); setMoveModal(null); }
  function toggleMember(mid) {
    setForm(f => {
      const has = f.members.includes(mid);
      if (has && f.members.length === 1) return f;
      return {...f, members: has ? f.members.filter(m => m !== mid) : [...f.members, mid]};
    });
  }

  function dotsForDate(ds) {
    const all = itemsForDate(ds), seen = new Set();
    return all.map(e => e.members||[]).flat().filter(m => { if(seen.has(m)) return false; seen.add(m); return true; }).slice(0,3);
  }

  function dayLabel(ds) {
    if (ds === todayStr) return "Oggi";
    const d = new Date(ds+"T00:00:00"), dow = d.getDay()===0?6:d.getDay()-1;
    return `${DAYS_FULL[dow]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }

  function itemBg(item) {
    if (!item.members||item.members.length===0) return "#FAFAFA";
    if (item.members.length>=2) return "#F5F0FF";
    return memberOf(item.members[0])?.bg||"#FAFAFA";
  }
  function itemBorder(item) {
    if (!item.members||item.members.length===0) return "#EEE";
    if (item.members.length>=2) return "#C4B0FF44";
    return (memberOf(item.members[0])?.color||"#EEE")+"33";
  }

  const grouped = {};
  TYPES.forEach(t => { grouped[t.id] = []; });
  selectedItems().forEach(item => { if (grouped[item.type]) grouped[item.type].push(item); });
  const totalSel = selectedItems().length;
  const doneSel = selectedItems().filter(i=>i.done).length;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const weekDays = Array.from({length:7}, (_,i) => { const d = addDays(weekStart,i); return {dateObj:d, dateStr:datObjToStr(d)}; });

  // ── Expense helpers ──────────────────────────────────────────────────────────
  function getMonthExpenses() {
    return expenses.filter(e => {
      const d = new Date(e.date+"T00:00:00");
      return d.getFullYear()===spesaYear && d.getMonth()===spesaMonth;
    });
  }
  function getCatSpent(catId) { return getMonthExpenses().filter(e=>e.category===catId).reduce((s,e)=>s+e.amount,0); }
  const totalSpent = getMonthExpenses().reduce((s,e)=>s+e.amount,0);
  const totalBudget = Object.values(budgets).reduce((s,v)=>s+v,0);
  const isBudgetOver = totalSpent > totalBudget;

  function prevSpesaMonth() { if(spesaMonth===0){setSpesaMonth(11);setSpesaYear(y=>y-1);}else setSpesaMonth(m=>m-1); }
  function nextSpesaMonth() { if(spesaMonth===11){setSpesaMonth(0);setSpesaYear(y=>y+1);}else setSpesaMonth(m=>m+1); }

  async function handleAiParse() {
    if (!aiText.trim()) return;
    setAiLoading(true); setAiError(""); setAiPreview(null);
    try { setAiPreview(await parseExpenseWithAI(aiText, customCats)); }
    catch (e) { setAiError("Non ho capito la spesa. Prova es: \"cappuccino bar 1,50\" o \"spesa 87 euro Silvia\""); }
    finally { setAiLoading(false); }
  }

  function confirmExpense() {
    if (!aiPreview) return;
    setExpenses(prev => [...prev, { id:nextExpenseId, date:todayStr, amount:aiPreview.amount, category:aiPreview.category, description:aiPreview.description, member:aiPreview.member }]);
    setNextExpenseId(n => n+1);
    setAiPreview(null); setAiText("");
  }

  function deleteExpense(id) { setExpenses(prev => prev.filter(e => e.id !== id)); }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setAiError("Dettatura non supportata. Usa Chrome o Safari."); return; }
    const recognition = new SR();
    recognition.lang = "it-IT"; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => { setIsListening(false); setAiError("Dettatura non riuscita. Riprova."); };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setAiText(transcript); setAiError("");
      setTimeout(async () => {
        setAiLoading(true); setAiPreview(null);
        try { setAiPreview(await parseExpenseWithAI(transcript, customCats)); }
        catch { setAiError("Non ho capito. Riprova."); }
        finally { setAiLoading(false); }
      }, 300);
    };
    recognition.start();
  }

  function stopListening() { recognitionRef.current?.stop(); setIsListening(false); }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!calLoaded) return (
    <div style={{ minHeight:"100vh", background:GRADIENT, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:14 }}>
      <div style={{ fontSize:44 }}>🏡</div>
      <div style={{ color:"#fff", fontWeight:800, fontSize:16 }}>Caricamento famiglia...</div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", minHeight:"100vh", background:"#F2F4FF", paddingBottom:80 }}>

      {/* Move Modal */}
      {moveModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#fff", borderRadius:24, padding:24, width:"100%", maxWidth:340, boxShadow:"0 8px 40px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin:"0 0 6px", fontSize:16, fontWeight:900, color:"#1A1A2E" }}>📦 Sposta impegno</h3>
            <p style={{ margin:"0 0 14px", fontSize:13, color:"#888" }}>"{moveModal.title}"</p>
            <input type="date" value={moveTarget} onChange={e=>setMoveTarget(e.target.value)}
              style={{ width:"100%", border:"2px solid #EEF1FF", borderRadius:12, padding:"10px 14px", fontSize:14, marginBottom:16, boxSizing:"border-box" }} />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setMoveModal(null)} style={{ flex:1, border:"2px solid #EEE", borderRadius:14, padding:11, fontSize:14, cursor:"pointer", background:"#fff", color:"#888", fontWeight:700 }}>Annulla</button>
              <button onClick={confirmMove} style={{ flex:1, border:"none", borderRadius:14, padding:11, fontSize:14, cursor:"pointer", background:GRADIENT, color:"#fff", fontWeight:900 }}>Sposta</button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {showBudgetEdit && (() => {
        const allCats = [...EXPENSE_CATS, ...customCats];
        const visibleCats = allCats.filter(c => !editRemovedCats.includes(c.id));
        const totalEditBudget = visibleCats.reduce((sum,c) => sum + (editBudgets[c.id]||0), 0);
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <div style={{ background:"#fff", borderRadius:24, padding:20, width:"100%", maxWidth:380, boxShadow:"0 8px 40px rgba(0,0,0,0.2)", maxHeight:"92vh", overflowY:"auto" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                <h3 style={{ margin:0, fontSize:16, fontWeight:900, color:"#1A1A2E" }}>✏️ Budget — {MONTHS[spesaMonth]}</h3>
                <button onClick={()=>setShowBudgetEdit(false)} style={{ background:"none", border:"none", fontSize:20, color:"#CCC", cursor:"pointer" }}>✕</button>
              </div>
              <div style={{ background:"linear-gradient(135deg,#EEF1FF,#FFF0F3)", borderRadius:16, padding:"12px 16px", marginBottom:16, display:"flex", justifyContent:"space-between" }}>
                <div><p style={{ margin:0, fontSize:11, color:"#888", fontWeight:700 }}>BUDGET TOTALE</p><p style={{ margin:"2px 0 0", fontSize:26, fontWeight:900, color:"#1A1A2E" }}>€{totalEditBudget.toFixed(0)}</p></div>
                <div style={{ textAlign:"right" }}><p style={{ margin:0, fontSize:11, color:"#888", fontWeight:700 }}>SPESO</p><p style={{ margin:"2px 0 0", fontSize:26, fontWeight:900, color: totalSpent>totalEditBudget?"#EF4444":"#2CC09C" }}>€{totalSpent.toFixed(0)}</p></div>
              </div>
              {visibleCats.map(cat => {
                const spent = getCatSpent(cat.id), budget = editBudgets[cat.id]||0;
                const over = spent>budget&&budget>0, pct = budget>0?Math.min(100,(spent/budget)*100):0;
                return (
                  <div key={cat.id} style={{ background:"#FAFBFF", borderRadius:14, padding:"10px 12px", marginBottom:8, border:"1.5px solid #EEF1FF" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                      <div style={{ background:cat.bg||"#F9FAFB", borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{cat.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:800, fontSize:13, color:"#1A1A2E" }}>{cat.label}</div>
                        <div style={{ fontSize:11, color:over?"#EF4444":"#AAA", fontWeight:700 }}>speso €{spent.toFixed(2)}{over&&" ⚠️"}</div>
                      </div>
                      <button onClick={()=>setEditRemovedCats(r=>[...r,cat.id])} style={{ background:"#FEF2F2", border:"none", borderRadius:8, width:28, height:28, cursor:"pointer", fontSize:16, color:"#EF4444", fontWeight:900 }}>−</button>
                    </div>
                    <div style={{ background:"#EEF1FF", borderRadius:6, height:5, marginBottom:7, overflow:"hidden" }}>
                      <div style={{ height:"100%", borderRadius:6, background:over?"#EF4444":(cat.color||"#4F6EF7"), width:`${pct}%` }}/>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:12, color:"#AAA" }}>Budget: €</span>
                      <input type="number" min="0" value={editBudgets[cat.id]??0}
                        onChange={e=>setEditBudgets(b=>({...b,[cat.id]:Number(e.target.value)||0}))}
                        style={{ flex:1, border:"2px solid #EEF1FF", borderRadius:10, padding:"5px 8px", fontSize:14, fontWeight:800, color:"#1A1A2E", background:"#fff", outline:"none" }}/>
                    </div>
                  </div>
                );
              })}
              {editRemovedCats.length>0 && (
                <div style={{ marginBottom:12 }}>
                  <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:700, color:"#AAA" }}>VOCI RIMOSSE</p>
                  {editRemovedCats.map(id => {
                    const cat = [...EXPENSE_CATS,...customCats].find(c=>c.id===id);
                    if (!cat) return null;
                    return (
                      <div key={id} style={{ display:"flex", alignItems:"center", gap:8, background:"#F9FAFB", borderRadius:12, padding:"8px 12px", marginBottom:6 }}>
                        <span>{cat.icon}</span><span style={{ flex:1, fontSize:13, color:"#AAA" }}>{cat.label}</span>
                        <button onClick={()=>setEditRemovedCats(r=>r.filter(x=>x!==id))} style={{ background:"#EEF1FF", border:"none", borderRadius:8, padding:"4px 10px", fontSize:12, color:"#4F6EF7", cursor:"pointer", fontWeight:800 }}>+ Ripristina</button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ background:"#F8F9FF", borderRadius:14, padding:12, marginBottom:14, border:"1.5px dashed #C7D2FE" }}>
                <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:800, color:"#4F6EF7" }}>+ Aggiungi categoria</p>
                <div style={{ display:"flex", gap:8, marginBottom:6 }}>
                  <select value={newCatIcon} onChange={e=>setNewCatIcon(e.target.value)}
                    style={{ border:"2px solid #EEF1FF", borderRadius:10, padding:"7px 8px", fontSize:18, background:"#fff", width:56 }}>
                    {QUICK_ICONS.map(ic=><option key={ic} value={ic}>{ic}</option>)}
                  </select>
                  <input placeholder="Nome categoria..." value={newCatLabel} onChange={e=>setNewCatLabel(e.target.value)}
                    style={{ flex:1, border:"2px solid #EEF1FF", borderRadius:10, padding:"7px 10px", fontSize:13, background:"#fff", outline:"none", fontFamily:"inherit" }}/>
                  <button onClick={()=>{
                    if (!newCatLabel.trim()) return;
                    const id = "custom_"+Date.now();
                    setCustomCats(prev=>[...prev, {id, label:newCatLabel.trim(), icon:newCatIcon, color:"#6366F1", bg:"#EEF2FF"}]);
                    setEditBudgets(b=>({...b,[id]:0}));
                    setNewCatLabel("");
                  }} style={{ background:GRADIENT, border:"none", borderRadius:10, padding:"7px 12px", fontSize:13, color:"#fff", cursor:"pointer", fontWeight:900 }}>+</button>
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>{setShowBudgetEdit(false);setEditRemovedCats([]);}} style={{ flex:1, border:"2px solid #EEE", borderRadius:14, padding:11, fontSize:14, cursor:"pointer", background:"#fff", color:"#888", fontWeight:700 }}>Annulla</button>
                <button onClick={()=>{setBudgets({...editBudgets});setShowBudgetEdit(false);}} style={{ flex:2, border:"none", borderRadius:14, padding:11, fontSize:14, cursor:"pointer", background:GRADIENT, color:"#fff", fontWeight:900 }}>Salva budget</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <div style={{ background:GRADIENT, padding:"20px 16px 28px", borderRadius:"0 0 28px 28px", marginBottom:-12 }}>
        <div style={{ maxWidth:500, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <h1 style={{ margin:0, fontSize:22, fontWeight:900, color:"#fff", letterSpacing:-0.5 }}>🏡 Famiglia</h1>
              <p style={{ margin:"3px 0 0", fontSize:12, color:"rgba(255,255,255,0.75)" }}>Mattia & Silvia</p>
            </div>
            <button onClick={()=>signOut(auth)} style={{ background:"rgba(255,255,255,0.15)", border:"1.5px solid rgba(255,255,255,0.4)", borderRadius:20, padding:"6px 12px", fontSize:12, color:"#fff", cursor:"pointer", fontWeight:700 }}>
              Esci
            </button>
          </div>
          <div style={{ marginTop:5, fontSize:11, color:"rgba(255,255,255,0.6)" }}>
            {syncing||syncingExp ? "🔄 Sincronizzazione..." : "☁️ Sincronizzato"}
          </div>
          {mainSection==="calendario" && (
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              {[{id:"tutti",label:"Tutti",emoji:"👨‍👩‍👧‍👦"}, ...MEMBERS].map(m=>(
                <button key={m.id} onClick={()=>setFilterMember(m.id)} style={{
                  border:"none", borderRadius:20, padding:"6px 16px", fontSize:13, cursor:"pointer",
                  background: filterMember===m.id?"#fff":"rgba(255,255,255,0.2)",
                  color: filterMember===m.id?(m.id==="tutti"?"#4F6EF7":m.color):"#fff",
                  fontWeight:800
                }}>{m.emoji} {m.label}</button>
              ))}
            </div>
          )}
          {mainSection==="spese" && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:14 }}>
              <button onClick={prevSpesaMonth} style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:10, width:32, height:32, fontSize:18, cursor:"pointer", color:"#fff", fontWeight:700 }}>‹</button>
              <span style={{ fontWeight:900, fontSize:15, color:"#fff" }}>{MONTHS[spesaMonth]} {spesaYear}</span>
              <button onClick={nextSpesaMonth} style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:10, width:32, height:32, fontSize:18, cursor:"pointer", color:"#fff", fontWeight:700 }}>›</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth:500, margin:"0 auto", padding:"0 12px" }}>

        {/* ══ CALENDARIO ══ */}
        {mainSection==="calendario" && (
          <>
            <div style={{ display:"flex", gap:6, background:"#fff", borderRadius:16, padding:5, marginBottom:14, marginTop:20, boxShadow:"0 2px 12px rgba(79,110,247,0.1)" }}>
              {["mese","settimana"].map(v=>(
                <button key={v} onClick={()=>setView(v)} style={{
                  flex:1, border:"none", borderRadius:12, padding:"9px",
                  background:view===v?GRADIENT:"transparent",
                  color:view===v?"#fff":"#888", fontWeight:800, fontSize:13, cursor:"pointer"
                }}>{v==="mese"?"📅 Mese":"📆 Settimana"}</button>
              ))}
            </div>

            {view==="mese" && (
              <div style={{ background:"#fff", borderRadius:20, padding:18, boxShadow:"0 2px 16px rgba(79,110,247,0.08)", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <button onClick={prevMonth} style={{ background:"#F2F4FF", border:"none", borderRadius:10, width:34, height:34, fontSize:18, cursor:"pointer", color:"#4F6EF7" }}>‹</button>
                  <span style={{ fontWeight:900, fontSize:16, color:"#1A1A2E" }}>{MONTHS[month]} {year}</span>
                  <button onClick={nextMonth} style={{ background:"#F2F4FF", border:"none", borderRadius:10, width:34, height:34, fontSize:18, cursor:"pointer", color:"#4F6EF7" }}>›</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, marginBottom:4 }}>
                  {DAYS_SHORT.map(d=><div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:800, color:"#AAA", padding:"3px 0" }}>{d}</div>)}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
                  {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
                  {Array.from({length:daysInMonth}).map((_,i)=>{
                    const d=i+1, ds=toDateStr(year,month,d), dots=dotsForDate(ds);
                    const isToday=ds===todayStr, isSelected=ds===selectedDay;
                    return (
                      <button key={d} onClick={()=>{setSelectedDay(ds);setShowForm(false);}} style={{
                        border:"none", borderRadius:12, padding:"5px 2px 4px", cursor:"pointer", textAlign:"center",
                        background:isSelected?GRADIENT:isToday?"#F2F4FF":"transparent",
                        color:isSelected?"#fff":"#333", fontWeight:isToday||isSelected?900:400, fontSize:13, minHeight:44,
                        boxShadow:isSelected?"0 2px 8px rgba(79,110,247,0.3)":"none"
                      }}>
                        <div>{d}</div>
                        <div style={{ display:"flex", justifyContent:"center", gap:2, marginTop:3 }}>
                          {dots.map(mid=>{const mem=memberOf(mid); return <div key={mid} style={{ width:5, height:5, borderRadius:"50%", background:isSelected?"rgba(255,255,255,0.8)":mem?.color}}/>;})}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {view==="settimana" && (
              <div style={{ background:"#fff", borderRadius:20, padding:16, boxShadow:"0 2px 16px rgba(79,110,247,0.08)", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <button onClick={prevWeek} style={{ background:"#F2F4FF", border:"none", borderRadius:10, width:34, height:34, fontSize:18, cursor:"pointer", color:"#4F6EF7" }}>‹</button>
                  <span style={{ fontWeight:900, fontSize:13, color:"#1A1A2E" }}>{weekDays[0].dateObj.getDate()} {MONTHS[weekDays[0].dateObj.getMonth()]} – {weekDays[6].dateObj.getDate()} {MONTHS[weekDays[6].dateObj.getMonth()]}</span>
                  <button onClick={nextWeek} style={{ background:"#F2F4FF", border:"none", borderRadius:10, width:34, height:34, fontSize:18, cursor:"pointer", color:"#4F6EF7" }}>›</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
                  {weekDays.map(({dateObj,dateStr:ds})=>{
                    const d=dateObj.getDate(), dow=dateObj.getDay()===0?6:dateObj.getDay()-1;
                    const dots=dotsForDate(ds), isToday=ds===todayStr, isSelected=ds===selectedDay;
                    const cnt=itemsForDate(ds).length;
                    return (
                      <button key={ds} onClick={()=>{setSelectedDay(ds);setShowForm(false);}} style={{
                        border:"none", borderRadius:14, padding:"8px 4px", cursor:"pointer", textAlign:"center",
                        background:isSelected?GRADIENT:isToday?"#F2F4FF":"#FAFBFF",
                        color:isSelected?"#fff":"#333", fontWeight:isToday||isSelected?900:500,
                        boxShadow:isSelected?"0 2px 10px rgba(79,110,247,0.3)":"none", minHeight:72
                      }}>
                        <div style={{ fontSize:10, color:isSelected?"rgba(255,255,255,0.8)":"#AAA", marginBottom:2 }}>{DAYS_SHORT[dow]}</div>
                        <div style={{ fontSize:15 }}>{d}</div>
                        {cnt>0&&<div style={{ marginTop:4, background:isSelected?"rgba(255,255,255,0.25)":"#F2F4FF", borderRadius:8, padding:"2px 0" }}>
                          <div style={{ fontSize:11, fontWeight:800, color:isSelected?"#fff":"#4F6EF7" }}>{cnt}</div>
                        </div>}
                        <div style={{ display:"flex", justifyContent:"center", gap:2, marginTop:4 }}>
                          {dots.map(mid=>{const mem=memberOf(mid); return <div key={mid} style={{ width:5, height:5, borderRadius:"50%", background:isSelected?"rgba(255,255,255,0.8)":mem?.color}}/>;})}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div>
                  <span style={{ fontWeight:900, fontSize:16, color:"#1A1A2E" }}>{dayLabel(selectedDay)}</span>
                  {totalSel>0&&<span style={{ marginLeft:8, fontSize:12, color:"#AAA" }}>{doneSel}/{totalSel} ✓</span>}
                </div>
                <button onClick={()=>{if(showForm){setShowForm(false);setEditingId(null);setForm(BLANK_FORM);}else openNew();}} style={{
                  background:showForm?"#F75C7E":GRADIENT, color:"#fff", border:"none",
                  borderRadius:20, padding:"8px 18px", fontSize:13, cursor:"pointer", fontWeight:800,
                  boxShadow:"0 2px 10px rgba(79,110,247,0.3)"
                }}>{showForm?"✕":"+ Aggiungi"}</button>
              </div>

              {showForm && (
                <div style={{ background:"#fff", borderRadius:20, padding:16, boxShadow:"0 4px 20px rgba(79,110,247,0.12)", marginBottom:14 }}>
                  <p style={{ margin:"0 0 12px", fontWeight:900, fontSize:14, color:"#1A1A2E" }}>{editingId!==null?"✏️ Modifica":"➕ Nuovo"}</p>
                  <div style={{ display:"flex", gap:6, marginBottom:12 }}>
                    {TYPES.map(t=>(
                      <button key={t.id} onClick={()=>setForm(f=>({...f,type:t.id,category:CATEGORIES[t.id][0].id}))} style={{
                        flex:1, border:`2.5px solid ${form.type===t.id?t.color:"#EEE"}`,
                        borderRadius:14, padding:"9px 4px", fontSize:11, cursor:"pointer",
                        background:form.type===t.id?t.bg:"#FAFAFA", color:form.type===t.id?t.color:"#AAA", fontWeight:800, textAlign:"center"
                      }}>
                        <div style={{fontSize:18}}>{t.icon}</div><div style={{marginTop:2}}>{t.label}</div>
                      </button>
                    ))}
                  </div>
                  <input placeholder="Descrizione..." value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                    onKeyDown={e=>e.key==="Enter"&&saveItem()}
                    style={{ width:"100%", border:"2px solid #EEF1FF", borderRadius:12, padding:"10px 14px", fontSize:14, marginBottom:8, boxSizing:"border-box", outline:"none", background:"#FAFBFF", fontFamily:"inherit" }}/>
                  <div style={{ marginBottom:8 }}>
                    <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:700, color:"#888" }}>Assegnato a</p>
                    <div style={{ display:"flex", gap:8 }}>
                      {MEMBERS.map(m=>{
                        const sel=form.members.includes(m.id);
                        return <button key={m.id} onClick={()=>toggleMember(m.id)} style={{
                          flex:1, border:`2.5px solid ${sel?m.color:"#EEE"}`, borderRadius:14, padding:"9px 8px",
                          cursor:"pointer", background:sel?m.bg:"#FAFAFA", color:sel?m.color:"#AAA", fontWeight:800, fontSize:13
                        }}>{m.emoji} {m.label}</button>;
                      })}
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                    <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                      style={{ border:"2px solid #EEF1FF", borderRadius:12, padding:"9px 10px", fontSize:13, background:"#fff", fontFamily:"inherit" }}>
                      {(CATEGORIES[form.type]||[]).map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                    </select>
                    <select value={form.recurrence} onChange={e=>setForm(f=>({...f,recurrence:e.target.value}))}
                      style={{ border:"2px solid #EEF1FF", borderRadius:12, padding:"9px 10px", fontSize:13, background:"#fff", fontFamily:"inherit" }}>
                      {RECURRENCE_OPTS.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  </div>
                  {form.type==="impegno"&&(
                    <input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))}
                      style={{ width:"100%", border:"2px solid #EEF1FF", borderRadius:12, padding:"9px 14px", fontSize:13, marginBottom:8, boxSizing:"border-box" }}/>
                  )}
                  <textarea placeholder="Note (opzionale)..." value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={2}
                    style={{ width:"100%", border:"2px solid #EEF1FF", borderRadius:12, padding:"9px 14px", fontSize:13, marginBottom:10, boxSizing:"border-box", background:"#FAFBFF", fontFamily:"inherit", resize:"none", outline:"none" }}/>
                  <button onClick={saveItem} style={{ width:"100%", background:GRADIENT, color:"#fff", border:"none", borderRadius:14, padding:"12px", fontSize:14, cursor:"pointer", fontWeight:900 }}>
                    {editingId!==null?"Salva modifiche":"Aggiungi"}
                  </button>
                </div>
              )}

              {TYPES.map(type=>{
                const sec=grouped[type.id];
                if(sec.length===0) return null;
                const doneC=sec.filter(i=>i.done).length;
                return (
                  <div key={type.id} style={{ background:"#fff", borderRadius:20, padding:"14px", boxShadow:"0 2px 14px rgba(79,110,247,0.07)", marginBottom:12 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <div style={{ background:type.bg, borderRadius:10, width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>{type.icon}</div>
                        <span style={{ fontWeight:900, fontSize:13, color:type.color, textTransform:"uppercase" }}>{type.label}</span>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        {doneC===sec.length&&sec.length>0&&<span style={{ fontSize:11, color:"#2CC09C", fontWeight:800 }}>✓ Tutto fatto!</span>}
                        <span style={{ fontSize:12, color:"#CCC", fontWeight:700 }}>{doneC}/{sec.length}</span>
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                      {sec.sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99")).map(item=>{
                        const cat=categoryOf(item.type,item.category);
                        const isShared=(item.members||[]).length>=2;
                        const showNote=expandedNote===item.id;
                        return (
                          <div key={item.id}>
                            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 12px", borderRadius:14,
                              background:item.done?"#FAFAFA":itemBg(item), border:`1.5px solid ${item.done?"#F0F0F0":itemBorder(item)}`,
                              opacity:item.done?0.55:1 }}>
                              <button onClick={()=>toggleDone(item.id)} style={{
                                width:24, height:24, borderRadius:"50%", flexShrink:0, cursor:"pointer",
                                border:`2.5px solid ${item.done?(isShared?"#A78BFA":(memberOf(item.members?.[0])?.color||"#DDD")):"#DDD"}`,
                                background:item.done?(isShared?"#A78BFA":(memberOf(item.members?.[0])?.color||"transparent")):"transparent",
                                display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#fff", fontWeight:900
                              }}>{item.done?"✓":""}</button>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{ fontWeight:700, fontSize:14, color:"#1A1A2E", textDecoration:item.done?"line-through":"none", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                                  {cat?.icon} {item.title}{item.recurrence&&item.recurrence!=="none"&&<span style={{marginLeft:5,fontSize:11,color:"#AAA"}}>🔁</span>}
                                </div>
                                <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4, flexWrap:"wrap" }}>
                                  {isShared
                                    ? <span style={{ background:"#A78BFA", color:"#fff", borderRadius:20, padding:"2px 9px", fontSize:11, fontWeight:800 }}>👨‍👩‍👧 Entrambi</span>
                                    : (item.members||[]).map(mid=>{const mem=memberOf(mid); return mem?<span key={mid} style={{ background:mem.color, color:"#fff", borderRadius:20, padding:"2px 9px", fontSize:11, fontWeight:800 }}>{mem.emoji} {mem.label}</span>:null;})
                                  }
                                  {item.time&&<span style={{ fontSize:11, color:"#AAA", fontWeight:700 }}>🕐 {item.time}</span>}
                                  {item.note&&<button onClick={()=>setExpandedNote(showNote?null:item.id)} style={{ background:"none", border:"none", fontSize:11, color:"#4F6EF7", cursor:"pointer", fontWeight:700, padding:0 }}>{showNote?"▲":"📝 nota"}</button>}
                                </div>
                              </div>
                              <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                                <button onClick={()=>openEdit(item)} style={{ background:"#F2F4FF", border:"none", borderRadius:8, width:28, height:28, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>✏️</button>
                                <button onClick={()=>openMove(item)} style={{ background:"#F2F4FF", border:"none", borderRadius:8, width:28, height:28, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>📦</button>
                                <button onClick={()=>deleteItem(item.id)} style={{ background:"none", border:"none", color:"#DDD", fontSize:15, cursor:"pointer", padding:"2px 4px" }}>✕</button>
                              </div>
                            </div>
                            {showNote&&item.note&&(
                              <div style={{ background:"#FFFBE6", borderRadius:"0 0 12px 12px", padding:"8px 14px", fontSize:13, color:"#7C6800", borderLeft:"3px solid #F7A230", marginTop:-4 }}>📝 {item.note}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {totalSel===0&&!showForm&&(
                <div style={{ textAlign:"center", padding:"36px 0" }}>
                  <div style={{ fontSize:40, marginBottom:10 }}>🌈</div>
                  <p style={{ margin:0, fontSize:15, fontWeight:700, color:"#AAA" }}>Giornata libera!</p>
                  <p style={{ margin:"4px 0 0", fontSize:13, color:"#CCC" }}>Tocca + Aggiungi per inserire qualcosa.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ SPESE ══ */}
        {mainSection==="spese" && (
          <div style={{ marginTop:20 }}>
            <div style={{ background:"#fff", borderRadius:20, padding:18, marginBottom:12, boxShadow:"0 2px 16px rgba(79,110,247,0.08)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <div>
                  <p style={{ margin:0, fontSize:11, fontWeight:700, color:"#AAA", textTransform:"uppercase" }}>Speso questo mese</p>
                  <p style={{ margin:"4px 0 0", fontSize:30, fontWeight:900, color:isBudgetOver?"#EF4444":"#1A1A2E" }}>€{totalSpent.toFixed(2)}</p>
                  <p style={{ margin:"2px 0 0", fontSize:13, color:"#AAA" }}>su €{totalBudget} budget totale</p>
                </div>
                <button onClick={()=>{setEditBudgets({...budgets});setEditRemovedCats([]);setShowBudgetEdit(true);}} style={{ background:"#F2F4FF", border:"none", borderRadius:12, padding:"8px 14px", fontSize:13, cursor:"pointer", color:"#4F6EF7", fontWeight:800 }}>✏️ Budget</button>
              </div>
              <div style={{ background:"#F2F4FF", borderRadius:8, height:10, overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:8, background:isBudgetOver?"#EF4444":GRADIENT, width:`${totalBudget>0?Math.min(100,(totalSpent/totalBudget)*100):0}%`, transition:"width 0.5s" }}/>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
                <span style={{ fontSize:11, color:"#CCC" }}>€0</span>
                <span style={{ fontSize:11, color:isBudgetOver?"#EF4444":"#2CC09C", fontWeight:800 }}>
                  {totalBudget>0?Math.round((totalSpent/totalBudget)*100):0}%{isBudgetOver&&" ⚠️ Budget superato!"}
                </span>
              </div>
            </div>

            {/* AI Input */}
            <div style={{ background:"#fff", borderRadius:20, padding:18, marginBottom:12, boxShadow:"0 2px 16px rgba(79,110,247,0.08)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <div style={{ background:"linear-gradient(135deg,#EEF1FF,#FFF0F3)", borderRadius:12, width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🤖</div>
                <div>
                  <p style={{ margin:0, fontWeight:900, fontSize:14, color:"#1A1A2E" }}>Aggiungi spesa con AI</p>
                  <p style={{ margin:0, fontSize:11, color:"#AAA" }}>Scrivi o detta liberamente</p>
                </div>
              </div>
              <div style={{ background:"#F8F9FF", borderRadius:14, padding:10, marginBottom:10, border:"1.5px solid #EEF1FF" }}>
                {["cappuccino al bar 1,50","spesa supermercato 87 euro Silvia","benzina 45€"].map(ex=>(
                  <button key={ex} onClick={()=>setAiText(ex)} style={{ display:"inline-block", marginRight:6, marginBottom:4, background:"#fff", border:"1.5px solid #EEF1FF", borderRadius:20, padding:"3px 10px", fontSize:12, cursor:"pointer", color:"#4F6EF7", fontWeight:600 }}>"{ex}"</button>
                ))}
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:10, alignItems:"flex-start" }}>
                <textarea value={aiText} onChange={e=>setAiText(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleAiParse();}}}
                  placeholder="Descrivi la spesa... o detta con 🎤" rows={2}
                  style={{ flex:1, border:`2px solid ${isListening?"#F75C7E":"#EEF1FF"}`, borderRadius:14, padding:"12px 14px", fontSize:15, boxSizing:"border-box", background:isListening?"#FFF0F3":"#FAFBFF", fontFamily:"inherit", resize:"none", outline:"none" }}/>
                <button onClick={isListening?stopListening:startListening} style={{
                  width:52, height:52, borderRadius:16, border:"none", cursor:"pointer", flexShrink:0,
                  background:isListening?"linear-gradient(135deg,#F75C7E,#FF3B6B)":"linear-gradient(135deg,#4F6EF7,#7B5CFF)",
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2,
                  boxShadow:isListening?"0 0 0 4px rgba(247,92,126,0.25)":"0 4px 16px rgba(79,110,247,0.35)"
                }}>
                  <span style={{ fontSize:22 }}>{isListening?"⏹️":"🎤"}</span>
                  <span style={{ fontSize:9, color:"rgba(255,255,255,0.85)", fontWeight:800 }}>{isListening?"STOP":"DETTA"}</span>
                </button>
              </div>
              {isListening&&<div style={{ display:"flex", alignItems:"center", gap:8, background:"#FFF0F3", border:"1.5px solid #FECDD3", borderRadius:12, padding:"8px 14px", marginBottom:10 }}>
                <span style={{ fontSize:18 }}>🔴</span>
                <span style={{ fontSize:13, fontWeight:700, color:"#F75C7E" }}>Sto ascoltando... parla ora!</span>
              </div>}
              {aiError&&<div style={{ background:"#FEF2F2", border:"1.5px solid #FECACA", borderRadius:12, padding:"10px 14px", marginBottom:10, fontSize:13, color:"#EF4444", fontWeight:600 }}>⚠️ {aiError}</div>}
              {aiPreview&&!aiLoading&&(
                <div style={{ background:"#F0FDF4", border:"2px solid #BBF7D0", borderRadius:16, padding:16, marginBottom:10 }}>
                  <p style={{ margin:"0 0 10px", fontSize:11, fontWeight:800, color:"#16A34A", textTransform:"uppercase" }}>✓ Ho capito questa spesa</p>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ background:expCatOf(aiPreview.category)?.bg||"#F9FAFB", borderRadius:14, width:48, height:48, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{expCatOf(aiPreview.category)?.icon||"📦"}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:15, color:"#1A1A2E" }}>{aiPreview.description}</div>
                      <div style={{ display:"flex", gap:6, marginTop:5, flexWrap:"wrap" }}>
                        <span style={{ background:expCatOf(aiPreview.category)?.color||"#9CA3AF", color:"#fff", borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:700 }}>{expCatOf(aiPreview.category)?.label||aiPreview.category}</span>
                        {(()=>{const mem=memberOf(aiPreview.member)||MEMBERS[0]; return <span style={{ background:mem.color, color:"#fff", borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:700 }}>{mem.emoji} {mem.label}</span>;})()}
                      </div>
                    </div>
                    <div style={{ fontSize:22, fontWeight:900, color:"#16A34A", flexShrink:0 }}>€{aiPreview.amount.toFixed(2)}</div>
                  </div>
                  {aiPreview.amount===0&&<p style={{ margin:"8px 0 0", fontSize:12, color:"#F7A230", fontWeight:700 }}>⚠️ Importo non rilevato — verifica prima di confermare.</p>}
                  <div style={{ display:"flex", gap:8, marginTop:14 }}>
                    <button onClick={()=>{setAiPreview(null);setAiError("");}} style={{ flex:1, border:"2px solid #EEE", borderRadius:12, padding:"10px", fontSize:13, cursor:"pointer", background:"#fff", color:"#888", fontWeight:700 }}>✕ Annulla</button>
                    <button onClick={confirmExpense} style={{ flex:2, border:"none", borderRadius:12, padding:"10px", fontSize:13, cursor:"pointer", background:GRADIENT_GREEN, color:"#fff", fontWeight:900 }}>✓ Conferma spesa</button>
                  </div>
                </div>
              )}
              <button onClick={handleAiParse} disabled={aiLoading||!aiText.trim()} style={{
                width:"100%", border:"none", borderRadius:14, padding:"13px", fontSize:14,
                cursor:aiLoading||!aiText.trim()?"not-allowed":"pointer",
                background:aiLoading||!aiText.trim()?"#E5E7EB":GRADIENT,
                color:aiLoading||!aiText.trim()?"#9CA3AF":"#fff", fontWeight:900,
                boxShadow:aiLoading||!aiText.trim()?"none":"0 3px 12px rgba(79,110,247,0.3)"
              }}>{aiLoading?"⏳ Analizzando...":"🤖 Analizza con AI"}</button>
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontWeight:900, fontSize:15, color:"#1A1A2E" }}>Per categoria</span>
              <span style={{ fontSize:12, color:"#AAA" }}>{getMonthExpenses().length} spese</span>
            </div>

            {[...EXPENSE_CATS,...customCats].map(cat=>{
              const spent=getCatSpent(cat.id), budget=budgets[cat.id]||0;
              const pct=budget>0?Math.min(100,(spent/budget)*100):0, over=spent>budget&&budget>0;
              const catExp=getMonthExpenses().filter(e=>e.category===cat.id);
              if(spent===0&&catExp.length===0) return null;
              const isExpanded=expandedCat===cat.id;
              return (
                <div key={cat.id} style={{ background:"#fff", borderRadius:18, marginBottom:8, boxShadow:"0 2px 12px rgba(79,110,247,0.06)", overflow:"hidden" }}>
                  <button onClick={()=>setExpandedCat(isExpanded?null:cat.id)} style={{ width:"100%", border:"none", background:"none", cursor:"pointer", padding:"14px 16px", textAlign:"left" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ background:cat.bg, borderRadius:12, width:42, height:42, display:"flex", alignItems:"center", justifyContent:"center", fontSize:21, flexShrink:0 }}>{cat.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:7 }}>
                          <span style={{ fontWeight:800, fontSize:14, color:"#1A1A2E" }}>{cat.label}</span>
                          <span style={{ fontWeight:900, fontSize:15, color:over?"#EF4444":"#1A1A2E" }}>€{spent.toFixed(2)}<span style={{ fontSize:12, fontWeight:600, color:"#AAA" }}> / €{budget}</span></span>
                        </div>
                        <div style={{ background:"#F2F4FF", borderRadius:6, height:7, overflow:"hidden" }}>
                          <div style={{ height:"100%", borderRadius:6, background:over?"#EF4444":cat.color, width:`${pct}%`, transition:"width 0.4s" }}/>
                        </div>
                      </div>
                      <span style={{ fontSize:11, color:"#CCC", marginLeft:6 }}>{isExpanded?"▲":"▼"}</span>
                    </div>
                    {over&&<p style={{ margin:"6px 0 0", fontSize:11, color:"#EF4444", fontWeight:700 }}>⚠️ Superato di €{(spent-budget).toFixed(2)}</p>}
                  </button>
                  {isExpanded&&(
                    <div style={{ borderTop:"1px solid #F2F4FF", padding:"8px 16px 14px" }}>
                      {catExp.length===0
                        ? <p style={{ margin:0, fontSize:13, color:"#CCC", textAlign:"center", padding:"8px 0" }}>Nessuna spesa questo mese</p>
                        : catExp.sort((a,b)=>b.date.localeCompare(a.date)).map(exp=>{
                            const mem=memberOf(exp.member)||MEMBERS[0];
                            return (
                              <div key={exp.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:"1px solid #F9FAFB" }}>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontWeight:700, fontSize:13, color:"#1A1A2E" }}>{exp.description}</div>
                                  <div style={{ display:"flex", gap:6, marginTop:3 }}>
                                    <span style={{ fontSize:11, color:"#AAA" }}>{exp.date.slice(8,10)}/{exp.date.slice(5,7)}</span>
                                    <span style={{ background:mem.color, color:"#fff", borderRadius:20, padding:"1px 8px", fontSize:10, fontWeight:700 }}>{mem.emoji} {mem.label}</span>
                                  </div>
                                </div>
                                <span style={{ fontWeight:900, fontSize:15, color:"#1A1A2E" }}>€{exp.amount.toFixed(2)}</span>
                                <button onClick={()=>deleteExpense(exp.id)} style={{ background:"none", border:"none", color:"#DDD", fontSize:16, cursor:"pointer", padding:"2px 4px" }}>✕</button>
                              </div>
                            );
                          })
                      }
                    </div>
                  )}
                </div>
              );
            })}

            {getMonthExpenses().length===0&&(
              <div style={{ textAlign:"center", padding:"40px 0" }}>
                <div style={{ fontSize:44, marginBottom:10 }}>💰</div>
                <p style={{ margin:0, fontSize:15, fontWeight:700, color:"#AAA" }}>Nessuna spesa questo mese</p>
                <p style={{ margin:"4px 0 0", fontSize:13, color:"#CCC" }}>Usa il campo sopra per aggiungere la prima!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#fff", borderTop:"1px solid #EEF1FF", padding:"8px 20px 14px", boxShadow:"0 -4px 24px rgba(79,110,247,0.1)", zIndex:50 }}>
        <div style={{ maxWidth:500, margin:"0 auto", display:"flex", gap:8 }}>
          {[{id:"calendario",label:"Calendario",icon:"📅"},{id:"spese",label:"Spese",icon:"💰"}].map(s=>(
            <button key={s.id} onClick={()=>setMainSection(s.id)} style={{
              flex:1, border:"none", borderRadius:14, padding:"10px 8px",
              background:mainSection===s.id?"#EEF1FF":"transparent", cursor:"pointer"
            }}>
              <div style={{ fontSize:22 }}>{s.icon}</div>
              <div style={{ fontSize:11, fontWeight:mainSection===s.id?900:600, color:mainSection===s.id?"#4F6EF7":"#AAA", marginTop:2 }}>{s.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
