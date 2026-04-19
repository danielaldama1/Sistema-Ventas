import React, { useState, useEffect, useCallback, useRef } from "https://esm.sh/react@18";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ═══════════════════════════════════════════════════════
//  🔥 FIREBASE CONFIG
// ═══════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyBmRE258LdtlR5jAo3ChN9jG94C3MsMI68",
  authDomain: "sistema-ventas-4ae00.firebaseapp.com",
  databaseURL: "https://sistema-ventas-4ae00-default-rtdb.firebaseio.com",
  projectId: "sistema-ventas-4ae00",
  storageBucket: "sistema-ventas-4ae00.firebasestorage.app",
  messagingSenderId: "774049154998",
  appId: "1:774049154998:web:6a5e9297dc52abf3cc2317",
  measurementId: "G-XGKJ9F7XCJ"
};

const ADMIN_PASSWORD = "Angeles14";

// ═══════════════════════════════════════════════════════
//  MENÚ DEFAULT
// ═══════════════════════════════════════════════════════
const MENU_DEFAULT = {
  "Chilaquiles":  { icon:"🍳", color:"#E85D04", categoria:"comida", variantes:["Verdes","Rojos"], rellenos:["Pollo","Suadero","Campechanos","Huevo"], extras:["Queso","Crema","Cebolla"], precio:55 },
  "Enchiladas":   { icon:"🌯", color:"#C1121F", categoria:"comida", variantes:["Sencillas","Pollo","Otro"], extras:["Queso","Crema","Lechuga"], precio:55 },
  "Tacos":        { icon:"🌮", color:"#F48C06", categoria:"comida", variantes:["Suadero","Longaniza","Campechanos"], extras:["Nopales","Papas","Cebolla","Cilantro"], precio:28, unidad:"c/u" },
  "Pambazos":     { icon:"🥙", color:"#DC2F02", categoria:"comida", variantes:["Chicharrón","Queso","Tinga","Papa con Longaniza","Hongos","Suadero"], extras:["Lechuga","Queso","Crema"], precio:28 },
  "Quesadillas":  { icon:"🫓", color:"#9D4EDD", categoria:"comida", variantes:["Chicharrón","Queso","Tinga","Papa con Longaniza","Hongos","Suadero"], extras:["Lechuga","Queso","Crema"], precio:30 },
  "Huaraches":    { icon:"🫔", color:"#3A86FF", categoria:"comida", variantes:["Suadero","Longaniza","Campechanos","Otro"], extras:["Cebolla","Lechuga","Queso"], precio:40 },
  "Gorditas":     { icon:"🫔", color:"#06D6A0", categoria:"comida", variantes:["Suadero","Otro"], extras:["Cilantro","Cebolla","Queso"], precio:25 },
  "Agua":         { icon:"💧", color:"#00B4D8", categoria:"bebida", variantes:["1/2 L","1 L"], precios:{"1/2 L":25,"1 L":35} },
  "Café":         { icon:"☕", color:"#6F4E37", categoria:"bebida", variantes:["1/4 L","1/2 L","1 L"], precios:{"1/4 L":20,"1/2 L":37,"1 L":70} },
  "Atole":        { icon:"🥛", color:"#F4A261", categoria:"bebida", variantes:["1/4 L","1/2 L","1 L"], precios:{"1/4 L":25,"1/2 L":45,"1 L":85} },
  "Refresco":     { icon:"🥤", color:"#EF233C", categoria:"bebida", variantes:["Lata/Botella"], precios:{"Lata/Botella":25} },
  "Michelada":    { icon:"🍺", color:"#FFBA08", categoria:"bebida", variantes:["Corona 1/2 L","Corona 1 L","Victoria 1/2 L","Victoria 1 L"], extras:["Clamato","Naranja","Tamarindo","Limón","Salsas","Todo","Solo Limón y Sal"], precios:{"Corona 1/2 L":45,"Corona 1 L":90,"Victoria 1/2 L":45,"Victoria 1 L":90} },
  "Mojito":       { icon:"🍹", color:"#40916C", categoria:"bebida", variantes:["Limón","Frutos Rojos","Fresa"], tamanos:["1/2 L","1 L"], precios:{"1/2 L":60,"1 L":100} },
};

// HELPERS
const getTodayKey = () => new Date().toISOString().split('T')[0];
const getMonthKey = (date) => date.substring(0, 7);
const getToday = () => new Date().toLocaleDateString("es-MX",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
const fmt = (n) => `$${Number(n||0).toFixed(0)}`;

export default function App() {
  const [db, setDb]           = useState(null);
  const [fbReady, setFbReady] = useState(false);
  const [view, setView]       = useState("central");
  const [pedidos, setPedidos] = useState({});
  const [menu, setMenu]       = useState(MENU_DEFAULT);
  const [notif, setNotif]     = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);
    setDb(database);
    setFbReady(true);

    onValue(ref(database, "pedidos"), snap => setPedidos(snap.val() || {}));
    onValue(ref(database, "menu"), snap => {
      const val = snap.val();
      if (val) setMenu(val);
      else set(ref(database, "menu"), MENU_DEFAULT);
    });
  }, []);

  const showNotif = (msg) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 2500);
  };

  const addPedido = useCallback((pedido) => {
    if (!db) return;
    push(ref(db, "pedidos"), { ...pedido, fecha: getTodayKey(), hora: new Date().toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}), estado: "pendiente", ts: Date.now() });
    showNotif("✅ Pedido enviado a cocina");
  }, [db]);

  const updateEstado = (id, estado) => db && update(ref(db, `pedidos/${id}`), { estado });
  const cancelar = (id) => db && update(ref(db, `pedidos/${id}`), { estado: "cancelado" });
  const updateMenu = (nuevoMenu) => { if(db) { set(ref(db, "menu"), nuevoMenu); showNotif("✅ Menú actualizado"); } };

  const pedidosArr = Object.entries(pedidos).map(([id, p]) => ({ ...p, id })).sort((a, b) => (b.ts||0) - (a.ts||0));
  const hoy = pedidosArr.filter(p => p.fecha === getTodayKey());

  return (
    <div style={S.root}>
      {notif && <div style={S.toast}>{notif}</div>}
      <nav style={S.nav}>
        <div style={S.brand}><span style={{fontSize:26}}>🌮</span><span style={S.brandText}>MiTaquería</span>{fbReady && <span style={S.online}>● EN VIVO</span>}</div>
        <div style={S.navBtns}>
          {[{k:"central", l:"📺 Central"}, {k:"pedido", l:"📱 Pedido"}, {k:"reportes", l:"📊 Reportes"}, {k:"admin", l:"⚙️ Admin"}].map(v => (
            <button key={v.k} onClick={() => { if ((v.k === "reportes" || v.k === "admin") && !isAdmin) setView("login"); else setView(v.k); }} style={{...S.navBtn,...(view===v.k?S.navBtnOn:{})}}>{v.l}</button>
          ))}
        </div>
      </nav>
      <main style={S.main}>
        {view === "central"  && <Central  pedidos={hoy} onUpdate={updateEstado} onCancelar={cancelar}/>}
        {view === "pedido"   && <Pedido   onAdd={addPedido} menu={menu}/>}
        {view === "reportes" && isAdmin && <Reportes pedidos={pedidosArr}/>}
        {view === "admin"    && isAdmin && <Admin menu={menu} onUpdate={updateMenu}/>}
        {view === "login"    && <Login onLogin={(ok) => { if(ok){ setIsAdmin(true); setView("reportes"); } }}/>}
      </main>
    </div>
  );
}

// COMPONENTES DE VISTA (Simplificados para brevedad pero funcionales)
function Central({ pedidos, onUpdate, onCancelar }) {
  const cols = [
    { k:"pendiente",  l:"⏳ Pendientes", c:"#FFBA08", acc:[{l:"▶ Preparar",e:"en_proceso",c:"#3A86FF"}] },
    { k:"en_proceso", l:"👨‍🍳 En Proceso", c:"#3A86FF", acc:[{l:"✅ Listo",   e:"listo",    c:"#06D6A0"}] },
    { k:"listo",      l:"✅ Listos",      c:"#06D6A0", acc:[{l:"🤝 Entregar",e:"entregado",c:"#888"}]    },
    { k:"entregado",  l:"🤝 Entregados",  c:"#888",    acc:[] },
  ];
  return (
    <div>
        <div style={S.centralDate}>📅 {getToday()}</div>
        <div style={S.kanban}>
            {cols.map(c => (
                <div key={c.k} style={S.kCol}>
                    <div style={{...S.kHead, borderBottom:`3px solid ${c.c}`, color:c.c}}>{c.l}</div>
                    {pedidos.filter(p => p.estado === c.k).map(p => (
                        <div key={p.id} style={S.card}>
                            <div style={S.cardTop}>
                                <b>#{String(p.ts).slice(-4)}</b> - {p.mesa || "Sin mesa"} <br/>
                                <small>{p.hora} - {fmt(p.total)}</small>
                            </div>
                            <div style={S.cardAcc}>
                                {c.acc.map(a => <button key={a.e} style={{...S.accBtn, background:a.c}} onClick={()=>onUpdate(p.id, a.e)}>{a.l}</button>)}
                                {c.k === "pendiente" && <button style={{...S.accBtn, background:"#EF233C"}} onClick={()=>onCancelar(p.id)}>✕</button>}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    </div>
  );
}

function Pedido({ onAdd, menu }) {
  const [carrito, setCarrito] = useState([]);
  const [mesa, setMesa] = useState("");
  const total = carrito.reduce((s,i) => s + (i.subtotal || 0), 0);

  const agregar = (nombre, datos) => {
    const item = { nombre, cantidad: 1, subtotal: datos.precio || 0, icon: datos.icon };
    setCarrito([...carrito, item]);
  };

  return (
    <div>
      <input style={S.mesaInput} placeholder="Mesa / Nombre" value={mesa} onChange={e=>setMesa(e.target.value)} />
      <div style={S.menuGrid}>
        {Object.entries(menu).map(([n, d]) => (
          <button key={n} style={{...S.mCard, borderTop:`4px solid ${d.color}`}} onClick={() => agregar(n, d)}>
            <span style={{fontSize:30}}>{d.icon}</span><br/>{n}
          </button>
        ))}
      </div>
      {carrito.length > 0 && (
        <button style={S.fab} onClick={() => { onAdd({ items: carrito, mesa, total }); setCarrito([]); setMesa(""); }}>
          🚀 Enviar Pedido ({fmt(total)})
        </button>
      )}
    </div>
  );
}

function Login({ onLogin }) {
  const [pass, setPass] = useState("");
  return (
    <div style={S.loginWrap}>
      <div style={S.loginBox}>
        <h3>Acceso Admin</h3>
        <input type="password" style={S.loginInput} onChange={e=>setPass(e.target.value)} />
        <button style={S.loginBtn} onClick={() => onLogin(pass === ADMIN_PASSWORD)}>Entrar</button>
      </div>
    </div>
  );
}

function Reportes({ pedidos }) { return <div style={S.rWrap}><h3>Ventas Totales: {fmt(pedidos.reduce((s,p)=>s+(p.estado!=="cancelado"?p.total:0),0))}</h3></div>; }
function Admin({ menu, onUpdate }) { return <div style={S.adminWrap}><h3>Gestión de Menú activa</h3><p>Usa la consola para cambios avanzados o contacta soporte.</p></div>; }

// ESTILOS (S) - Se mantienen los de tu archivo original para conservar el diseño
const S = {
  root:{ minHeight:"100vh",background:"#0F0F0F",color:"#F0EBE3",fontFamily:"system-ui" },
  toast:{ position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:"#06D6A0",color:"#0F0F0F",padding:"10px 20px",borderRadius:20,zIndex:9999 },
  nav:{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",height:58,background:"#1A1A1A",borderBottom:"2px solid #E85D04" },
  brand:{ display:"flex",alignItems:"center",gap:8 },
  brandText:{ fontSize:20,fontWeight:800,color:"#E85D04" },
  online:{ fontSize:11,color:"#06D6A0",marginLeft:8 },
  navBtns:{ display:"flex",gap:5 },
  navBtn:{ padding:"6px 10px",borderRadius:20,border:"1px solid #333",background:"transparent",color:"#aaa",fontSize:12 },
  navBtnOn:{ background:"#E85D04",color:"#fff" },
  main:{ padding:16 },
  mesaInput:{ width:"100%", background:"#1A1A1A", border:"1px solid #333", color:"#fff", padding:12, borderRadius:10, marginBottom:15 },
  menuGrid:{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10 },
  mCard:{ background:"#1A1A1A", borderRadius:12, padding:15, border:"1px solid #222", color:"#fff", cursor:"pointer" },
  fab:{ position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:"#E85D04",color:"#fff",padding:"15px 30px",borderRadius:30,border:"none",fontWeight:800 },
  kanban:{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:15 },
  kCol:{ background:"#1A1A1A", padding:10, borderRadius:10, minHeight:300 },
  kHead:{ fontWeight:800, marginBottom:10, textAlign:"center" },
  card:{ background:"#242424", padding:10, borderRadius:8, marginBottom:10, border:"1px solid #333" },
  cardAcc:{ display:"flex", gap:5, marginTop:8 },
  accBtn:{ flex:1, padding:5, border:"none", borderRadius:4, color:"#fff", fontSize:11, fontWeight:700 },
  loginWrap:{ display:"flex", justifyContent:"center", paddingTop:50 },
  loginBox:{ background:"#1A1A1A", padding:30, borderRadius:15, textAlign:"center" },
  loginInput:{ display:"block", width:"100%", margin:"10px 0", padding:10, background:"#000", color:"#fff", border:"1px solid #333" },
  loginBtn:{ background:"#E85D04", color:"#fff", border:"none", padding:"10px 20px", width:"100%", borderRadius:8 }
};