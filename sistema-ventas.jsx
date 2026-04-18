import { useState, useEffect, useCallback, useRef } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove, set }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ═══════════════════════════════════════════════════════
//  🔥 FIREBASE CONFIG — reemplaza con tus credenciales
//     Ve a console.firebase.google.com → nuevo proyecto →
//     Realtime Database → Web app → copia la config aquí
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

const ADMIN_PASSWORD = "taqueria2024"; // ← cambia esta contraseña

// ═══════════════════════════════════════════════════════
//  MENÚ DEFAULT (se carga en Firebase la primera vez)
// ═══════════════════════════════════════════════════════
const MENU_DEFAULT = {
  "Chilaquiles":  { icon:"🍳", color:"#E85D04", categoria:"comida", variantes:["Verdes","Rojos"],       rellenos:["Pollo","Suadero","Campechanos","Huevo"], extras:["Queso","Crema","Cebolla"],         precio:55 },
  "Enchiladas":   { icon:"🌯", color:"#C1121F", categoria:"comida", variantes:["Sencillas","Pollo","Otro"],                                                  extras:["Queso","Crema","Lechuga"],         precio:55 },
  "Tacos":        { icon:"🌮", color:"#F48C06", categoria:"comida", variantes:["Suadero","Longaniza","Campechanos"],                                          extras:["Nopales","Papas","Cebolla","Cilantro"], precio:28, unidad:"c/u" },
  "Pambazos":     { icon:"🥙", color:"#DC2F02", categoria:"comida", variantes:["Chicharrón","Queso","Tinga","Papa con Longaniza","Hongos","Suadero"],         extras:["Lechuga","Queso","Crema"],         precio:28 },
  "Quesadillas":  { icon:"🫓", color:"#9D4EDD", categoria:"comida", variantes:["Chicharrón","Queso","Tinga","Papa con Longaniza","Hongos","Suadero"],         extras:["Lechuga","Queso","Crema"],         precio:30 },
  "Huaraches":    { icon:"🫔", color:"#3A86FF", categoria:"comida", variantes:["Suadero","Longaniza","Campechanos","Otro"],                                   extras:["Cebolla","Lechuga","Queso"],        precio:40 },
  "Gorditas":     { icon:"🫔", color:"#06D6A0", categoria:"comida", variantes:["Suadero","Otro"],                                                             extras:["Cilantro","Cebolla","Queso"],       precio:25 },
  "Agua":         { icon:"💧", color:"#00B4D8", categoria:"bebida", variantes:["1/2 L","1 L"],         precios:{"1/2 L":25,"1 L":35} },
  "Café":         { icon:"☕", color:"#6F4E37", categoria:"bebida", variantes:["1/4 L","1/2 L","1 L"], precios:{"1/4 L":20,"1/2 L":37,"1 L":70} },
  "Atole":        { icon:"🥛", color:"#F4A261", categoria:"bebida", variantes:["1/4 L","1/2 L","1 L"], precios:{"1/4 L":25,"1/2 L":45,"1 L":85} },
  "Refresco":     { icon:"🥤", color:"#EF233C", categoria:"bebida", variantes:["Lata/Botella"],        precios:{"Lata/Botella":25} },
  "Michelada":    { icon:"🍺", color:"#FFBA08", categoria:"bebida", variantes:["Corona 1/2 L","Corona 1 L","Victoria 1/2 L","Victoria 1 L"], extras:["Clamato","Naranja","Tamarindo","Limón","Salsas","Todo","Solo Limón y Sal"], precios:{"Corona 1/2 L":45,"Corona 1 L":90,"Victoria 1/2 L":45,"Victoria 1 L":90} },
  "Mojito":       { icon:"🍹", color:"#40916C", categoria:"bebida", variantes:["Limón","Frutos Rojos","Fresa"], tamanos:["1/2 L","1 L"], precios:{"1/2 L":60,"1 L":100} },
};

// ═══════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function getMonthKey(date) {
  const d = new Date(date+"T12:00:00");
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function getToday() {
  return new Date().toLocaleDateString("es-MX",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
}
function fmt(n) { return `$${Number(n||0).toFixed(0)}`; }

// ═══════════════════════════════════════════════════════
//  APP ROOT
// ═══════════════════════════════════════════════════════
export default function App() {
  const [db, setDb]           = useState(null);
  const [fbReady, setFbReady] = useState(false);
  const [fbError, setFbError] = useState(false);
  const [view, setView]       = useState("central");
  const [pedidos, setPedidos] = useState({});
  const [menu, setMenu]       = useState(MENU_DEFAULT);
  const [notif, setNotif]     = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Inicializar Firebase
  useEffect(() => {
    try {
      if (FIREBASE_CONFIG.apiKey === "TU_API_KEY") { setFbError(true); return; }
      const app = initializeApp(FIREBASE_CONFIG);
      const database = getDatabase(app);
      setDb(database);
      setFbReady(true);

      // Escuchar pedidos en tiempo real
      onValue(ref(database, "pedidos"), snap => {
        setPedidos(snap.val() || {});
      });

      // Escuchar menú en tiempo real
      onValue(ref(database, "menu"), snap => {
        const val = snap.val();
        if (val) setMenu(val);
        else {
          // Primera vez: cargar menú default
          set(ref(database, "menu"), MENU_DEFAULT);
        }
      });
    } catch(e) {
      setFbError(true);
    }
  }, []);

  const showNotif = (msg) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 2500);
  };

  const addPedido = useCallback((pedido) => {
    if (!db) return;
    const nuevo = {
      ...pedido,
      fecha: getTodayKey(),
      hora: new Date().toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}),
      estado: "pendiente",
      ts: Date.now(),
    };
    push(ref(db, "pedidos"), nuevo);
    showNotif("✅ Pedido enviado a cocina");
  }, [db]);

  const updateEstado = useCallback((id, estado) => {
    if (!db) return;
    update(ref(db, `pedidos/${id}`), { estado });
  }, [db]);

  const cancelar = useCallback((id) => {
    if (!db) return;
    update(ref(db, `pedidos/${id}`), { estado: "cancelado" });
  }, [db]);

  const updateMenu = useCallback((nuevoMenu) => {
    if (!db) return;
    set(ref(db, "menu"), nuevoMenu);
    showNotif("✅ Menú actualizado");
  }, [db]);

  if (fbError) return <FirebaseSetup />;

  const pedidosArr = Object.entries(pedidos)
    .map(([id, p]) => ({ ...p, id }))
    .sort((a, b) => (b.ts||0) - (a.ts||0));

  const hoy = pedidosArr.filter(p => p.fecha === getTodayKey());

  return (
    <div style={S.root}>
      {notif && <div style={S.toast}>{notif}</div>}

      <nav style={S.nav}>
        <div style={S.brand}>
          <span style={{fontSize:26}}>🌮</span>
          <span style={S.brandText}>MiTaquería</span>
          {fbReady && <span style={S.online}>● EN VIVO</span>}
        </div>
        <div style={S.navBtns}>
          {[
            {k:"central", l:"📺 Central"},
            {k:"pedido",  l:"📱 Pedido"},
            {k:"reportes",l:"📊 Reportes"},
            {k:"admin",   l:"⚙️ Admin"},
          ].map(v => (
            <button key={v.k} onClick={() => {
              if (v.k === "reportes" && !isAdmin) { setView("login"); return; }
              if (v.k === "admin"   && !isAdmin) { setView("login"); return; }
              setView(v.k);
            }}
              style={{...S.navBtn,...(view===v.k?S.navBtnOn:{})}}>
              {v.l}
            </button>
          ))}
        </div>
      </nav>

      <main style={S.main}>
        {view === "central"  && <Central  pedidos={hoy} onUpdate={updateEstado} onCancelar={cancelar}/>}
        {view === "pedido"   && <Pedido   onAdd={addPedido} menu={menu}/>}
        {view === "reportes" && isAdmin && <Reportes pedidos={pedidosArr}/>}
        {view === "admin"    && isAdmin && <Admin menu={menu} onUpdate={updateMenu} db={db}/>}
        {view === "login"    && <Login onLogin={(ok) => { if(ok){ setIsAdmin(true); setView("reportes"); } }}/>}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  FIREBASE SETUP GUIDE
// ═══════════════════════════════════════════════════════
function FirebaseSetup() {
  return (
    <div style={S.setupWrap}>
      <div style={S.setupBox}>
        <div style={{fontSize:52,marginBottom:12}}>🔥</div>
        <h2 style={{color:"#E85D04",marginBottom:8}}>Configura Firebase</h2>
        <p style={{color:"#aaa",marginBottom:20,lineHeight:1.6}}>
          Para sincronizar pedidos entre dispositivos necesitas una base de datos gratuita.
        </p>
        <div style={S.setupSteps}>
          {[
            "Ve a console.firebase.google.com",
            "Crea un nuevo proyecto (gratis)",
            'Ve a "Realtime Database" → Crear base de datos',
            "Selecciona modo de prueba (test mode)",
            'Ve a Configuración del proyecto → "Tu app" → Copia la config',
            "Pega las credenciales en FIREBASE_CONFIG al inicio del código",
            "Cambia ADMIN_PASSWORD por tu contraseña",
          ].map((s,i) => (
            <div key={i} style={S.setupStep}>
              <span style={S.setupNum}>{i+1}</span>
              <span style={{color:"#ddd",fontSize:14}}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  LOGIN
// ═══════════════════════════════════════════════════════
function Login({ onLogin }) {
  const [pass, setPass] = useState("");
  const [err,  setErr]  = useState(false);
  const submit = () => {
    if (pass === ADMIN_PASSWORD) { onLogin(true); }
    else { setErr(true); setTimeout(() => setErr(false), 1500); }
  };
  return (
    <div style={S.loginWrap}>
      <div style={S.loginBox}>
        <div style={{fontSize:48,marginBottom:8}}>🔐</div>
        <h2 style={{color:"#E85D04",marginBottom:4}}>Área Admin</h2>
        <p style={{color:"#888",marginBottom:20,fontSize:14}}>Solo para administradores</p>
        <input
          type="password"
          style={{...S.loginInput,...(err?{borderColor:"#EF233C"}:{})}}
          value={pass}
          onChange={e=>setPass(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&submit()}
          placeholder="Contraseña..."
          autoFocus
        />
        {err && <div style={{color:"#EF233C",fontSize:13,marginTop:6}}>Contraseña incorrecta</div>}
        <button style={S.loginBtn} onClick={submit}>Entrar</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  PANTALLA CENTRAL
// ═══════════════════════════════════════════════════════
function Central({ pedidos, onUpdate, onCancelar }) {
  const cols = [
    { k:"pendiente",  l:"⏳ Pendientes", c:"#FFBA08", acc:[{l:"▶ Preparar",e:"en_proceso",c:"#3A86FF"}] },
    { k:"en_proceso", l:"👨‍🍳 En Proceso", c:"#3A86FF", acc:[{l:"✅ Listo",   e:"listo",    c:"#06D6A0"}] },
    { k:"listo",      l:"✅ Listos",      c:"#06D6A0", acc:[{l:"🤝 Entregar",e:"entregado",c:"#888"}]    },
    { k:"entregado",  l:"🤝 Entregados",  c:"#888",    acc:[] },
  ];
  const by = k => pedidos.filter(p => p.estado === k);
  return (
    <div>
      <div style={S.statsRow}>
        {cols.map(c => (
          <div key={c.k} style={{...S.statCard,borderTop:`4px solid ${c.c}`}}>
            <div style={{...S.statNum,color:c.c}}>{by(c.k).length}</div>
            <div style={S.statLabel}>{c.l}</div>
          </div>
        ))}
      </div>
      <div style={S.centralDate}>📅 {getToday()}</div>
      <div style={S.kanban}>
        {cols.map(c => (
          <KCol key={c.k} title={c.l} color={c.c}
            pedidos={c.k==="entregado"?by(c.k).slice(0,8):by(c.k)}
            acciones={c.acc} onUpdate={onUpdate} onCancelar={onCancelar}/>
        ))}
      </div>
    </div>
  );
}

function KCol({ title, color, pedidos, acciones, onUpdate, onCancelar }) {
  return (
    <div style={S.kCol}>
      <div style={{...S.kHead,borderBottom:`3px solid ${color}`,color}}>
        {title}<span style={S.kCount}>{pedidos.length}</span>
      </div>
      <div style={S.kCards}>
        {!pedidos.length && <div style={S.kEmpty}>Sin pedidos</div>}
        {pedidos.map(p => (
          <Card key={p.id} p={p} acciones={acciones} onUpdate={onUpdate} onCancelar={onCancelar}/>
        ))}
      </div>
    </div>
  );
}

function Card({ p, acciones, onUpdate, onCancelar }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={S.card}>
      <div style={S.cardTop} onClick={() => setOpen(o=>!o)}>
        <span style={S.cardNum}>#{String(p.ts||0).slice(-4)}</span>
        <div style={S.cardMeta}>
          {p.mesa && <span style={S.cardMesa}>{p.mesa}</span>}
          <span style={S.cardHora}>{p.hora}</span>
        </div>
        <span style={S.cardItems}>{(p.items||[]).length} items</span>
        <span style={S.cardTotal}>{fmt(p.total)}</span>
      </div>
      {open && (
        <div style={S.cardBody}>
          {(p.items||[]).map((it,i) => (
            <div key={i} style={S.cardItem}>
              <span style={S.cardItemIcon}>{it.icon}</span>
              <div style={{flex:1}}>
                <div style={S.cardItemName}>
                  {it.cantidad>1?`${it.cantidad}× `:""}{it.nombre}
                  {it.variante?` — ${it.variante}`:""}
                  {it.relleno ?` (${it.relleno})` :""}
                </div>
                {it.extras?.length>0 && <div style={S.cardItemEx}>+{it.extras.join(", ")}</div>}
                {it.extraQueso && <div style={S.cardItemEx}>🧀 Extra queso</div>}
                {it.nota && <div style={S.cardItemNota}>📝 {it.nota}</div>}
              </div>
              <span style={S.cardItemPrecio}>{fmt(it.subtotal)}</span>
            </div>
          ))}
          {p.notaGeneral && <div style={S.cardNota}>📝 {p.notaGeneral}</div>}
        </div>
      )}
      <div style={S.cardAcc}>
        {acciones.map(a => (
          <button key={a.e} style={{...S.accBtn,background:a.c}}
            onClick={() => onUpdate(p.id, a.e)}>{a.l}</button>
        ))}
        {p.estado==="pendiente" && (
          <button style={{...S.accBtn,background:"#EF233C"}}
            onClick={() => onCancelar(p.id)}>✕ Cancelar</button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  TOMA PEDIDO
// ═══════════════════════════════════════════════════════
function Pedido({ onAdd, menu }) {
  const [carrito, setCarrito] = useState([]);
  const [mesa, setMesa]       = useState("");
  const [nota, setNota]       = useState("");
  const [modal, setModal]     = useState(null);
  const [cat, setCat]         = useState("comida");
  const [drawer, setDrawer]   = useState(false);
  const [ok, setOk]           = useState(false);

  const total = carrito.reduce((s,i) => s+i.subtotal, 0);

  const menuComida = Object.entries(menu).filter(([,v]) => v.categoria==="comida");
  const menuBebida = Object.entries(menu).filter(([,v]) => v.categoria==="bebida");

  const calcP = (item) => {
    const c = menu[item.nombre];
    if (!c) return 0;
    let p = c.precios
      ? (item.nombre==="Mojito" ? (c.precios[item.tamano]||0) : (c.precios[item.variante]||0))
      : (c.precio||0);
    if (item.extraQueso) p += 10;
    return p * item.cantidad;
  };

  const addToCart = () => {
    if (!modal) return;
    const c = menu[modal.nombre];
    setCarrito(prev => [...prev, { ...modal, subtotal: calcP(modal), icon: c?.icon||"🍽" }]);
    setModal(null);
  };

  const enviar = () => {
    if (!carrito.length) return;
    onAdd({ items: carrito, mesa, notaGeneral: nota, total });
    setCarrito([]); setMesa(""); setNota(""); setDrawer(false);
    setOk(true); setTimeout(() => setOk(false), 2200);
  };

  return (
    <div>
      {ok && <div style={S.confirmBanner}>✅ ¡Pedido enviado a cocina!</div>}
      <div style={S.mesaRow}>
        <label style={S.mesaLabel}>Mesa / Cliente:</label>
        <input style={S.mesaInput} value={mesa} onChange={e=>setMesa(e.target.value)} placeholder="Mesa 3 / Ana..."/>
      </div>
      <div style={S.tabs}>
        {["comida","bebidas"].map(c => (
          <button key={c} style={{...S.tab,...(cat===c?S.tabOn:{})}} onClick={() => setCat(c)}>
            {c==="comida"?"🍽 Comida":"🥤 Bebidas"}
          </button>
        ))}
      </div>
      <div style={S.menuGrid}>
        {(cat==="comida"?menuComida:menuBebida).map(([nombre,d]) => (
          <button key={nombre} style={{...S.mCard,borderTop:`4px solid ${d.color}`}}
            onClick={() => setModal({nombre,tipo:d.categoria,variante:"",relleno:"",extras:[],extraQueso:false,cantidad:1,tamano:"",nota:""})}>
            <div style={{fontSize:34}}>{d.icon}</div>
            <div style={S.mName}>{nombre}</div>
            <div style={{...S.mPrice,color:d.color}}>
              {d.precio ? `${fmt(d.precio)}${d.unidad?` ${d.unidad}`:""}` : `desde ${fmt(Math.min(...Object.values(d.precios||{0:0})))}`}
            </div>
          </button>
        ))}
      </div>

      {carrito.length > 0 && (
        <button style={S.fab} onClick={() => setDrawer(true)}>
          🛒 {carrito.length} producto{carrito.length!==1?"s":""} — {fmt(total)}
        </button>
      )}

      {drawer && (
        <div style={S.overlay} onClick={() => setDrawer(false)}>
          <div style={S.drawer} onClick={e => e.stopPropagation()}>
            <div style={S.drawerHead}>
              <span style={{fontWeight:800,fontSize:18,color:"#E85D04"}}>🛒 Pedido {mesa?`— ${mesa}`:""}</span>
              <button style={S.drawerClose} onClick={() => setDrawer(false)}>✕</button>
            </div>
            {carrito.map((it,i) => (
              <div key={i} style={S.dItem}>
                <span style={{fontSize:20}}>{it.icon}</span>
                <div style={{flex:1}}>
                  <div style={S.dItemName}>{it.cantidad>1?`${it.cantidad}× `:""}{it.nombre}{it.variante?` (${it.variante})`:""}{it.relleno?` / ${it.relleno}`:""}</div>
                  {it.extras?.length>0 && <div style={S.dItemEx}>+{it.extras.join(", ")}</div>}
                  {it.extraQueso && <div style={S.dItemEx}>🧀 Extra queso</div>}
                </div>
                <span style={S.dItemPrecio}>{fmt(it.subtotal)}</span>
                <button style={S.dRemove} onClick={() => setCarrito(p=>p.filter((_,j)=>j!==i))}>✕</button>
              </div>
            ))}
            <textarea style={S.notaInput} value={nota} onChange={e=>setNota(e.target.value)} placeholder="Nota general..." rows={2}/>
            <div style={S.totalRow}>
              <span style={{fontSize:16,color:"#aaa",fontWeight:700}}>Total</span>
              <span style={{fontSize:26,fontWeight:900,color:"#06D6A0"}}>{fmt(total)}</span>
            </div>
            <button style={S.enviarBtn} onClick={enviar}>🚀 Enviar a Cocina</button>
          </div>
        </div>
      )}

      {modal && <ItemModal item={modal} onChange={setModal} onAdd={addToCart} onClose={()=>setModal(null)} calcP={calcP} menu={menu}/>}
    </div>
  );
}

function ItemModal({ item, onChange, onAdd, onClose, calcP, menu }) {
  const cat = menu[item.nombre];
  if (!cat) return null;
  const isComida = cat.categoria === "comida";
  const toggle   = (f,v) => onChange(p => ({...p,[f]:p[f]===v?"":v}));
  const toggleEx = (e)   => onChange(p => ({...p,extras:p.extras.includes(e)?p.extras.filter(x=>x!==e):[...p.extras,e]}));

  return (
    <div style={S.mOverlay} onClick={onClose}>
      <div style={S.mModal} onClick={e=>e.stopPropagation()}>
        <div style={{...S.mHead,background:cat.color}}>
          <span style={{fontSize:30}}>{cat.icon}</span>
          <span style={S.mTitle}>{item.nombre}</span>
          <button style={S.mClose} onClick={onClose}>✕</button>
        </div>
        <div style={S.mBody}>
          {cat.variantes && (
            <Sec title={item.nombre==="Mojito"?"Sabor":item.nombre==="Michelada"?"Tipo / Tamaño":"Variante"}>
              <div style={S.chips}>
                {cat.variantes.map(v => (
                  <Chip key={v} label={v} active={item.variante===v} color={cat.color}
                    suffix={cat.precios?` $${cat.precios[v]||"?"}`:""} onClick={()=>toggle("variante",v)}/>
                ))}
              </div>
            </Sec>
          )}
          {cat.rellenos && (
            <Sec title="Con">
              <div style={S.chips}>
                {cat.rellenos.map(r => <Chip key={r} label={r} active={item.relleno===r} color={cat.color} onClick={()=>toggle("relleno",r)}/>)}
              </div>
            </Sec>
          )}
          {item.nombre==="Mojito" && cat.tamanos && (
            <Sec title="Tamaño">
              <div style={S.chips}>
                {cat.tamanos.map(t => <Chip key={t} label={`${t} — $${cat.precios[t]}`} active={item.tamano===t} color={cat.color} onClick={()=>toggle("tamano",t)}/>)}
              </div>
            </Sec>
          )}
          {cat.extras && (
            <Sec title="Extras / Ingredientes">
              <div style={S.chips}>
                {cat.extras.map(e => <Chip key={e} label={e} active={item.extras.includes(e)} color={cat.color} onClick={()=>toggleEx(e)}/>)}
              </div>
            </Sec>
          )}
          {isComida && (
            <Sec title="">
              <button style={{...S.eqBtn,...(item.extraQueso?S.eqOn:{})}}
                onClick={()=>onChange(p=>({...p,extraQueso:!p.extraQueso}))}>🧀 Extra Queso (+$10)</button>
            </Sec>
          )}
          <Sec title="Nota especial">
            <input style={S.notaItem} value={item.nota} onChange={e=>onChange(p=>({...p,nota:e.target.value}))} placeholder="Sin picante, extra salsa..."/>
          </Sec>
          <Sec title="Cantidad">
            <div style={S.cantRow}>
              <button style={S.cantBtn} onClick={()=>onChange(p=>({...p,cantidad:Math.max(1,p.cantidad-1)}))}>−</button>
              <span style={S.cantNum}>{item.cantidad}</span>
              <button style={S.cantBtn} onClick={()=>onChange(p=>({...p,cantidad:p.cantidad+1}))}>+</button>
            </div>
          </Sec>
          <div style={S.mPrecio}>Total: <strong style={{color:cat.color}}>{fmt(calcP(item))}</strong></div>
          <button style={{...S.addBtn,background:cat.color}} onClick={onAdd}>➕ Agregar al pedido</button>
        </div>
      </div>
    </div>
  );
}

function Sec({ title, children }) {
  return <div style={S.sec}>{title?<div style={S.secTitle}>{title}</div>:null}{children}</div>;
}
function Chip({ label, active, color, onClick, suffix="" }) {
  return (
    <button onClick={onClick}
      style={{...S.chip,...(active?{background:color,borderColor:color,color:"#fff",fontWeight:700}:{})}}>
      {label}{suffix}
    </button>
  );
}

// ═══════════════════════════════════════════════════════
//  ADMIN — Gestión de productos
// ═══════════════════════════════════════════════════════
function Admin({ menu, onUpdate }) {
  const [editando, setEditando] = useState(null); // nombre del producto editando
  const [nuevo, setNuevo]       = useState(false);
  const [form, setForm]         = useState({});

  const abrirEditar = (nombre) => {
    setForm({ nombre, ...menu[nombre],
      variantesStr:  (menu[nombre].variantes||[]).join(", "),
      rellenosStr:   (menu[nombre].rellenos||[]).join(", "),
      extrasStr:     (menu[nombre].extras||[]).join(", "),
      tamanosStr:    (menu[nombre].tamanos||[]).join(", "),
      preciosStr:    menu[nombre].precios ? JSON.stringify(menu[nombre].precios) : "",
    });
    setEditando(nombre);
    setNuevo(false);
  };

  const abrirNuevo = () => {
    setForm({ nombre:"", icon:"🍽", color:"#E85D04", categoria:"comida", precio:0,
      variantesStr:"", rellenosStr:"", extrasStr:"", tamanosStr:"", preciosStr:"" });
    setNuevo(true);
    setEditando(null);
  };

  const guardar = () => {
    const nombre = form.nombre?.trim();
    if (!nombre) return;
    const prod = {
      icon: form.icon||"🍽",
      color: form.color||"#E85D04",
      categoria: form.categoria||"comida",
    };
    if (form.variantesStr) prod.variantes = form.variantesStr.split(",").map(s=>s.trim()).filter(Boolean);
    if (form.rellenosStr)  prod.rellenos  = form.rellenosStr.split(",").map(s=>s.trim()).filter(Boolean);
    if (form.extrasStr)    prod.extras    = form.extrasStr.split(",").map(s=>s.trim()).filter(Boolean);
    if (form.tamanosStr)   prod.tamanos   = form.tamanosStr.split(",").map(s=>s.trim()).filter(Boolean);
    if (form.preciosStr) {
      try { prod.precios = JSON.parse(form.preciosStr); } catch {}
    } else if (form.precio) {
      prod.precio = Number(form.precio);
    }
    if (form.unidad) prod.unidad = form.unidad;

    const nuevoMenu = { ...menu };
    if (editando && editando !== nombre) delete nuevoMenu[editando];
    nuevoMenu[nombre] = prod;
    onUpdate(nuevoMenu);
    setEditando(null); setNuevo(false);
  };

  const eliminar = (nombre) => {
    if (!window.confirm(`¿Eliminar "${nombre}"?`)) return;
    const nuevoMenu = { ...menu };
    delete nuevoMenu[nombre];
    onUpdate(nuevoMenu);
  };

  const comida = Object.entries(menu).filter(([,v])=>v.categoria==="comida");
  const bebida = Object.entries(menu).filter(([,v])=>v.categoria==="bebida");

  return (
    <div style={S.adminWrap}>
      <div style={S.adminHeader}>
        <h2 style={{color:"#E85D04",margin:0}}>⚙️ Gestión de Productos</h2>
        <button style={S.addProdBtn} onClick={abrirNuevo}>+ Nuevo producto</button>
      </div>

      {(nuevo||editando) && (
        <div style={S.formCard}>
          <h3 style={{color:"#E85D04",marginTop:0}}>{nuevo?"Nuevo producto":"Editar: "+editando}</h3>
          <div style={S.formGrid}>
            <FormField label="Nombre" value={form.nombre||""} onChange={v=>setForm(p=>({...p,nombre:v}))}/>
            <FormField label="Icono (emoji)" value={form.icon||""} onChange={v=>setForm(p=>({...p,icon:v}))}/>
            <FormField label="Color (hex)" value={form.color||""} onChange={v=>setForm(p=>({...p,color:v}))} type="color"/>
            <div style={S.formField}>
              <label style={S.formLabel}>Categoría</label>
              <select style={S.formSelect} value={form.categoria||"comida"} onChange={e=>setForm(p=>({...p,categoria:e.target.value}))}>
                <option value="comida">Comida</option>
                <option value="bebida">Bebida</option>
              </select>
            </div>
            <FormField label="Precio fijo ($)" value={form.precio||""} onChange={v=>setForm(p=>({...p,precio:v}))} type="number"/>
            <FormField label="Unidad (ej: c/u)" value={form.unidad||""} onChange={v=>setForm(p=>({...p,unidad:v}))}/>
            <FormField label='Precios por variante {"1/2 L":25}' value={form.preciosStr||""} onChange={v=>setForm(p=>({...p,preciosStr:v}))} placeholder='{"1/2 L":25,"1 L":35}'/>
            <FormField label="Variantes (separadas por coma)" value={form.variantesStr||""} onChange={v=>setForm(p=>({...p,variantesStr:v}))} placeholder="Verdes, Rojos"/>
            <FormField label="Rellenos / Proteínas" value={form.rellenosStr||""} onChange={v=>setForm(p=>({...p,rellenosStr:v}))} placeholder="Pollo, Suadero"/>
            <FormField label="Extras (separados por coma)" value={form.extrasStr||""} onChange={v=>setForm(p=>({...p,extrasStr:v}))} placeholder="Queso, Crema"/>
            <FormField label="Tamaños (para Mojito u otros)" value={form.tamanosStr||""} onChange={v=>setForm(p=>({...p,tamanosStr:v}))} placeholder="1/2 L, 1 L"/>
          </div>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button style={{...S.accBtn,background:"#06D6A0",flex:1}} onClick={guardar}>💾 Guardar</button>
            <button style={{...S.accBtn,background:"#333",flex:1}} onClick={()=>{setEditando(null);setNuevo(false);}}>Cancelar</button>
          </div>
        </div>
      )}

      {["comida","bebida"].map(cat => (
        <div key={cat} style={S.adminSec}>
          <div style={S.adminSecTitle}>{cat==="comida"?"🍽 Comida":"🥤 Bebidas"}</div>
          <div style={S.adminGrid}>
            {(cat==="comida"?comida:bebida).map(([nombre,d]) => (
              <div key={nombre} style={{...S.adminCard,borderLeft:`4px solid ${d.color}`}}>
                <div style={S.adminCardTop}>
                  <span style={{fontSize:26}}>{d.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:16}}>{nombre}</div>
                    <div style={{color:"#888",fontSize:13}}>
                      {d.precio ? fmt(d.precio) : d.precios ? `desde ${fmt(Math.min(...Object.values(d.precios)))}` : ""}
                    </div>
                  </div>
                  <button style={{...S.iconBtn,color:"#3A86FF"}} onClick={()=>abrirEditar(nombre)}>✏️</button>
                  <button style={{...S.iconBtn,color:"#EF233C"}} onClick={()=>eliminar(nombre)}>🗑️</button>
                </div>
                {d.variantes && <div style={S.adminTags}>{d.variantes.map(v=><span key={v} style={S.adminTag}>{v}</span>)}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FormField({ label, value, onChange, type="text", placeholder="" }) {
  return (
    <div style={S.formField}>
      <label style={S.formLabel}>{label}</label>
      <input type={type} style={S.formInput} value={value}
        onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  REPORTES
// ═══════════════════════════════════════════════════════
function Reportes({ pedidos }) {
  const meses = {};
  pedidos.forEach(p => {
    if (p.estado==="cancelado" || !p.fecha) return;
    const mk = getMonthKey(p.fecha);
    if (!meses[mk]) meses[mk] = {pedidos:[],total:0,productos:{}};
    meses[mk].pedidos.push(p);
    meses[mk].total += (p.total||0);
    (p.items||[]).forEach(it => {
      meses[mk].productos[it.nombre] = (meses[mk].productos[it.nombre]||0) + (it.cantidad||1);
    });
  });
  const keys = Object.keys(meses).sort().reverse();
  const [sel, setSel] = useState(keys[0]||"");
  useEffect(() => { if (keys.length && !sel) setSel(keys[0]); }, [keys.length]);

  if (!keys.length) return (
    <div style={{textAlign:"center",padding:"80px 20px"}}>
      <div style={{fontSize:64}}>📊</div>
      <div style={{fontSize:22,color:"#888",marginTop:12}}>Sin ventas registradas aún</div>
    </div>
  );

  const md = meses[sel]||{pedidos:[],total:0,productos:{}};
  const doms = [...new Set(md.pedidos.map(p=>p.fecha))];
  const ticketP = md.pedidos.length ? md.total/md.pedidos.length : 0;
  const topP = Object.entries(md.productos).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const maxP = topP[0]?.[1]||1;
  const ventasD = doms.map(f => ({
    f, total: md.pedidos.filter(p=>p.fecha===f).reduce((s,p)=>s+(p.total||0),0),
    peds: md.pedidos.filter(p=>p.fecha===f).length,
  }));
  const maxD = Math.max(...ventasD.map(v=>v.total),1);
  const fmtMes = k => { const [y,m]=k.split("-"); return new Date(Number(y),Number(m)-1,1).toLocaleDateString("es-MX",{month:"long",year:"numeric"}); };

  return (
    <div style={S.rWrap}>
      <div style={S.mesSel}>
        <label style={{fontWeight:700,color:"#aaa"}}>📅 Mes:</label>
        <select style={S.mesSelSel} value={sel} onChange={e=>setSel(e.target.value)}>
          {keys.map(k=><option key={k} value={k}>{fmtMes(k)}</option>)}
        </select>
      </div>
      <div style={S.kpiRow}>
        {[
          {l:"Total del mes",  v:fmt(md.total),   i:"💰",c:"#E85D04"},
          {l:"Pedidos",        v:md.pedidos.length,i:"📋",c:"#3A86FF"},
          {l:"Domingos",       v:doms.length,      i:"📅",c:"#9D4EDD"},
          {l:"Ticket promedio",v:fmt(ticketP),     i:"🧾",c:"#06D6A0"},
        ].map(k=>(
          <div key={k.l} style={{...S.kpi,borderLeft:`5px solid ${k.c}`}}>
            <div style={{fontSize:24,marginBottom:4}}>{k.i}</div>
            <div style={{fontSize:24,fontWeight:800,color:k.c}}>{k.v}</div>
            <div style={{fontSize:12,color:"#888",marginTop:2}}>{k.l}</div>
          </div>
        ))}
      </div>
      {ventasD.length>0 && (
        <div style={S.rSec}>
          <div style={S.rSecTitle}>📆 Ventas por Domingo</div>
          {ventasD.map((d,i)=>(
            <div key={i} style={S.dRow}>
              <div style={S.dFecha}>{new Date(d.f+"T12:00:00").toLocaleDateString("es-MX",{weekday:"short",day:"numeric",month:"short"})}</div>
              <div style={S.dBar}><div style={{...S.dBarF,width:`${(d.total/maxD)*100}%`}}/></div>
              <div style={S.dTotal}>{fmt(d.total)}</div>
              <div style={S.dPeds}>{d.peds} ped.</div>
            </div>
          ))}
        </div>
      )}
      {topP.length>0 && (
        <div style={S.rSec}>
          <div style={S.rSecTitle}>🏆 Más vendidos</div>
          {topP.map(([nombre,qty],i)=>(
            <div key={nombre} style={S.pRow}>
              <span style={{color:"#E85D04",fontWeight:700,fontSize:14}}>{i+1}.</span>
              <span style={{fontSize:14,color:"#ccc",minWidth:110}}>{nombre}</span>
              <div style={S.pBar}><div style={{...S.pBarF,width:`${(qty/maxP)*100}%`}}/></div>
              <span style={{fontSize:13,color:"#888",textAlign:"right"}}>{qty}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════
const S = {
  root:{ minHeight:"100vh",background:"#0F0F0F",color:"#F0EBE3",fontFamily:"'Segoe UI',system-ui,sans-serif" },
  toast:{ position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:"#06D6A0",color:"#0F0F0F",padding:"10px 26px",borderRadius:40,fontWeight:700,fontSize:15,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,.3)" },
  nav:{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",height:58,background:"#1A1A1A",borderBottom:"2px solid #E85D04",position:"sticky",top:0,zIndex:100 },
  brand:{ display:"flex",alignItems:"center",gap:8 },
  brandText:{ fontSize:20,fontWeight:800,color:"#E85D04",letterSpacing:1 },
  online:{ fontSize:11,color:"#06D6A0",fontWeight:700,letterSpacing:1 },
  navBtns:{ display:"flex",gap:5 },
  navBtn:{ padding:"6px 11px",borderRadius:20,border:"1.5px solid #333",background:"transparent",color:"#aaa",cursor:"pointer",fontSize:12,fontWeight:600 },
  navBtnOn:{ background:"#E85D04",color:"#fff",borderColor:"#E85D04" },
  main:{ padding:"14px 16px",maxWidth:1300,margin:"0 auto" },

  // CENTRAL
  statsRow:{ display:"flex",gap:10,marginBottom:14,flexWrap:"wrap" },
  statCard:{ flex:"1 1 110px",background:"#1A1A1A",borderRadius:12,padding:"12px 14px",textAlign:"center" },
  statNum:{ fontSize:34,fontWeight:800 },
  statLabel:{ fontSize:13,color:"#888",marginTop:2 },
  centralDate:{ color:"#666",fontSize:13,marginBottom:12,textAlign:"right" },
  kanban:{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12 },
  kCol:{ background:"#1A1A1A",borderRadius:14,padding:12,minHeight:280 },
  kHead:{ fontSize:17,fontWeight:800,paddingBottom:10,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center" },
  kCount:{ background:"#333",borderRadius:20,padding:"2px 10px",fontSize:14 },
  kCards:{ display:"flex",flexDirection:"column",gap:8 },
  kEmpty:{ color:"#444",textAlign:"center",fontSize:14,padding:20 },
  card:{ background:"#242424",borderRadius:10,overflow:"hidden",border:"1px solid #333" },
  cardTop:{ display:"flex",alignItems:"center",padding:"11px 13px",cursor:"pointer",gap:8 },
  cardNum:{ fontWeight:900,color:"#E85D04",fontSize:20,minWidth:44 },
  cardMeta:{ display:"flex",flexDirection:"column",gap:2,flex:1 },
  cardMesa:{ fontSize:15,color:"#eee",fontWeight:600 },
  cardHora:{ fontSize:12,color:"#666" },
  cardItems:{ fontSize:13,color:"#888" },
  cardTotal:{ fontWeight:700,color:"#06D6A0",fontSize:17 },
  cardBody:{ borderTop:"1px solid #333",padding:"10px 13px",display:"flex",flexDirection:"column",gap:8 },
  cardItem:{ display:"flex",gap:10,alignItems:"flex-start" },
  cardItemIcon:{ fontSize:22,marginTop:2 },
  cardItemName:{ fontSize:17,fontWeight:700,lineHeight:1.3 },
  cardItemEx:{ fontSize:14,color:"#F48C06",marginTop:2 },
  cardItemNota:{ fontSize:13,color:"#aaa",fontStyle:"italic",marginTop:2 },
  cardItemPrecio:{ fontSize:14,color:"#888",marginLeft:"auto",whiteSpace:"nowrap" },
  cardNota:{ fontSize:13,color:"#aaa",fontStyle:"italic",borderTop:"1px solid #333",paddingTop:6 },
  cardAcc:{ display:"flex",gap:6,padding:"8px 10px",flexWrap:"wrap" },
  accBtn:{ flex:1,padding:"9px 8px",borderRadius:8,border:"none",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13 },

  // PEDIDO
  mesaRow:{ display:"flex",alignItems:"center",gap:10,marginBottom:14 },
  mesaLabel:{ fontSize:15,fontWeight:600,color:"#aaa",whiteSpace:"nowrap" },
  mesaInput:{ flex:1,background:"#1A1A1A",border:"1.5px solid #333",borderRadius:10,color:"#fff",padding:"9px 14px",fontSize:15,outline:"none" },
  tabs:{ display:"flex",marginBottom:14,borderRadius:12,overflow:"hidden",border:"1.5px solid #333" },
  tab:{ flex:1,padding:"12px",background:"#1A1A1A",border:"none",color:"#888",fontWeight:700,cursor:"pointer",fontSize:15 },
  tabOn:{ background:"#E85D04",color:"#fff" },
  menuGrid:{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,paddingBottom:90 },
  mCard:{ background:"#1A1A1A",borderRadius:12,padding:"18px 10px",border:"1px solid #2a2a2a",cursor:"pointer",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:5 },
  mName:{ fontSize:16,fontWeight:700,color:"#F0EBE3" },
  mPrice:{ fontSize:14,fontWeight:600 },
  fab:{ position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:"#E85D04",border:"none",color:"#fff",padding:"13px 28px",borderRadius:40,fontWeight:800,fontSize:15,cursor:"pointer",boxShadow:"0 4px 20px rgba(232,93,4,.5)",zIndex:300,whiteSpace:"nowrap" },
  overlay:{ position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:400,display:"flex",alignItems:"flex-end" },
  drawer:{ width:"100%",background:"#1A1A1A",borderRadius:"20px 20px 0 0",padding:20,maxHeight:"82vh",overflowY:"auto" },
  drawerHead:{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 },
  drawerClose:{ background:"#333",border:"none",color:"#fff",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:15 },
  dItem:{ display:"flex",alignItems:"flex-start",gap:10,padding:"8px 0",borderBottom:"1px solid #2a2a2a" },
  dItemName:{ fontSize:15,fontWeight:600,color:"#eee" },
  dItemEx:{ fontSize:13,color:"#F48C06" },
  dItemPrecio:{ fontSize:15,fontWeight:700,color:"#06D6A0",marginLeft:"auto",whiteSpace:"nowrap" },
  dRemove:{ background:"#EF233C",border:"none",color:"#fff",borderRadius:6,cursor:"pointer",fontSize:12,padding:"3px 8px",flexShrink:0 },
  notaInput:{ width:"100%",background:"#0F0F0F",border:"1px solid #333",borderRadius:8,color:"#ccc",padding:"8px 10px",fontSize:13,resize:"none",marginTop:10,marginBottom:10,boxSizing:"border-box",outline:"none" },
  totalRow:{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 },
  enviarBtn:{ width:"100%",background:"#E85D04",border:"none",color:"#fff",padding:"14px",borderRadius:12,fontWeight:800,fontSize:16,cursor:"pointer" },
  confirmBanner:{ position:"fixed",top:66,left:"50%",transform:"translateX(-50%)",background:"#06D6A0",color:"#0F0F0F",padding:"11px 32px",borderRadius:40,fontWeight:700,fontSize:15,zIndex:9999 },

  // MODAL
  mOverlay:{ position:"fixed",inset:0,background:"rgba(0,0,0,.82)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500 },
  mModal:{ width:"100%",maxWidth:520,background:"#1A1A1A",borderRadius:"20px 20px 0 0",maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column" },
  mHead:{ display:"flex",alignItems:"center",gap:10,padding:"16px 20px",color:"#fff" },
  mTitle:{ fontSize:22,fontWeight:800,flex:1 },
  mClose:{ background:"rgba(0,0,0,.3)",border:"none",color:"#fff",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:15 },
  mBody:{ padding:"16px 20px",overflowY:"auto",flex:1 },
  sec:{ marginBottom:16 },
  secTitle:{ fontSize:12,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:8,letterSpacing:1 },
  chips:{ display:"flex",flexWrap:"wrap",gap:7 },
  chip:{ padding:"8px 16px",borderRadius:20,border:"1.5px solid #333",background:"#242424",color:"#ccc",cursor:"pointer",fontSize:14 },
  eqBtn:{ padding:"11px 20px",borderRadius:12,border:"2px solid #F48C06",background:"transparent",color:"#F48C06",cursor:"pointer",fontWeight:700,fontSize:15,width:"100%" },
  eqOn:{ background:"#F48C06",color:"#fff" },
  notaItem:{ width:"100%",background:"#0F0F0F",border:"1px solid #333",borderRadius:8,color:"#ccc",padding:"9px 12px",fontSize:14,outline:"none",boxSizing:"border-box" },
  cantRow:{ display:"flex",alignItems:"center",gap:18 },
  cantBtn:{ width:42,height:42,borderRadius:10,border:"1.5px solid #555",background:"#333",color:"#fff",fontSize:24,cursor:"pointer" },
  cantNum:{ fontSize:26,fontWeight:800,minWidth:34,textAlign:"center" },
  mPrecio:{ textAlign:"center",fontSize:20,color:"#ccc",margin:"12px 0" },
  addBtn:{ width:"100%",border:"none",color:"#fff",padding:"14px",borderRadius:12,fontWeight:800,fontSize:16,cursor:"pointer" },

  // LOGIN
  loginWrap:{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"70vh" },
  loginBox:{ background:"#1A1A1A",borderRadius:20,padding:"40px 32px",textAlign:"center",maxWidth:340,width:"100%",border:"1px solid #333" },
  loginInput:{ width:"100%",background:"#0F0F0F",border:"1.5px solid #333",borderRadius:10,color:"#fff",padding:"12px 16px",fontSize:16,outline:"none",boxSizing:"border-box",marginBottom:8 },
  loginBtn:{ width:"100%",background:"#E85D04",border:"none",color:"#fff",padding:"13px",borderRadius:12,fontWeight:800,fontSize:16,cursor:"pointer",marginTop:8 },

  // ADMIN
  adminWrap:{ maxWidth:900,margin:"0 auto" },
  adminHeader:{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 },
  addProdBtn:{ background:"#06D6A0",border:"none",color:"#0F0F0F",padding:"10px 20px",borderRadius:12,fontWeight:800,fontSize:14,cursor:"pointer" },
  formCard:{ background:"#1A1A1A",borderRadius:14,padding:20,marginBottom:20,border:"1px solid #333" },
  formGrid:{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12 },
  formField:{ display:"flex",flexDirection:"column",gap:4 },
  formLabel:{ fontSize:12,color:"#888",fontWeight:600 },
  formInput:{ background:"#0F0F0F",border:"1px solid #333",borderRadius:8,color:"#fff",padding:"8px 12px",fontSize:14,outline:"none" },
  formSelect:{ background:"#0F0F0F",border:"1px solid #333",borderRadius:8,color:"#fff",padding:"8px 12px",fontSize:14,outline:"none",cursor:"pointer" },
  adminSec:{ marginBottom:20 },
  adminSecTitle:{ fontSize:16,fontWeight:800,color:"#aaa",marginBottom:10 },
  adminGrid:{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10 },
  adminCard:{ background:"#1A1A1A",borderRadius:12,padding:"12px 14px",border:"1px solid #2a2a2a" },
  adminCardTop:{ display:"flex",alignItems:"center",gap:10,marginBottom:8 },
  adminTags:{ display:"flex",flexWrap:"wrap",gap:4 },
  adminTag:{ background:"#2a2a2a",borderRadius:10,padding:"3px 8px",fontSize:11,color:"#888" },
  iconBtn:{ background:"none",border:"none",cursor:"pointer",fontSize:18,padding:"4px" },

  // SETUP
  setupWrap:{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:20 },
  setupBox:{ background:"#1A1A1A",borderRadius:20,padding:"40px 32px",maxWidth:480,width:"100%",textAlign:"center",border:"1px solid #333" },
  setupSteps:{ textAlign:"left",display:"flex",flexDirection:"column",gap:10 },
  setupStep:{ display:"flex",gap:12,alignItems:"flex-start" },
  setupNum:{ background:"#E85D04",color:"#fff",borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0,marginTop:1 },

  // REPORTES
  rWrap:{ maxWidth:820,margin:"0 auto" },
  mesSel:{ display:"flex",alignItems:"center",gap:12,marginBottom:20 },
  mesSelSel:{ background:"#1A1A1A",border:"1.5px solid #333",color:"#fff",padding:"8px 14px",borderRadius:10,fontSize:14,cursor:"pointer",outline:"none" },
  kpiRow:{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:24 },
  kpi:{ background:"#1A1A1A",borderRadius:12,padding:"16px 18px" },
  rSec:{ background:"#1A1A1A",borderRadius:14,padding:16,marginBottom:16 },
  rSecTitle:{ fontWeight:700,fontSize:16,marginBottom:14 },
  dRow:{ display:"grid",gridTemplateColumns:"120px 1fr 80px 60px",alignItems:"center",gap:10,marginBottom:8 },
  dFecha:{ fontSize:13,color:"#ccc" },
  dBar:{ background:"#2a2a2a",borderRadius:6,height:10,overflow:"hidden" },
  dBarF:{ height:"100%",background:"#E85D04",borderRadius:6 },
  dTotal:{ fontWeight:700,color:"#06D6A0",textAlign:"right",fontSize:14 },
  dPeds:{ fontSize:12,color:"#888",textAlign:"right" },
  pRow:{ display:"grid",gridTemplateColumns:"24px 120px 1fr 40px",alignItems:"center",gap:10,marginBottom:8 },
  pBar:{ background:"#2a2a2a",borderRadius:6,height:8,overflow:"hidden" },
  pBarF:{ height:"100%",background:"#3A86FF",borderRadius:6 },
};
