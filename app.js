import React, { useState, useEffect, useCallback } from "https://esm.sh/react@18";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, update, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
  // ✅ Mojitos con precios corregidos por sabor y tamaño
  "Mojito":       {
    icon:"🍹", color:"#40916C", categoria:"bebida",
    variantes:["Limón 1/2 L","Limón 1 L","Fresa 1/2 L","Fresa 1 L","Frutos Rojos 1/2 L","Frutos Rojos 1 L"],
    precios:{
      "Limón 1/2 L":60, "Limón 1 L":100,
      "Fresa 1/2 L":60, "Fresa 1 L":100,
      "Frutos Rojos 1/2 L":70, "Frutos Rojos 1 L":120
    }
  },
  // ✅ Caguama nueva
  "Caguama":      { icon:"🍻", color:"#B5830A", categoria:"bebida", variantes:["Caguama"], precios:{"Caguama":55} },
};

// ═══════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════
// ✅ Fecha local (no UTC) para que coincida con México
const getTodayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const getToday = () => new Date().toLocaleDateString("es-MX",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
const fmt = (n) => `$${Number(n||0).toFixed(0)}`;

// Obtiene precio de un item según variante seleccionada
const getPrecio = (datos, variante) => {
  if (datos.precios && variante && datos.precios[variante] !== undefined) return datos.precios[variante];
  if (datos.precio) return datos.precio;
  return 0;
};

// ═══════════════════════════════════════════════════════
//  APP PRINCIPAL
// ═══════════════════════════════════════════════════════
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

  const showNotif = (msg) => { setNotif(msg); setTimeout(() => setNotif(null), 2500); };

  const addPedido = useCallback((pedido) => {
    if (!db) return;
    push(ref(db, "pedidos"), {
      ...pedido,
      fecha: getTodayKey(),
      hora: new Date().toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}),
      estado: "pendiente",
      ts: Date.now()
    });
    showNotif("✅ Pedido enviado a cocina");
  }, [db]);

  // ✅ Agregar productos a un pedido existente (vuelve a "pendiente" para que cocina lo vea)
  const agregarAltPedido = useCallback((id, pedidoActual, itemsNuevos) => {
    if (!db) return;
    const itemsActualizados = [...(pedidoActual.items || []), ...itemsNuevos];
    const nuevoTotal = itemsActualizados.reduce((s, i) => s + (i.subtotal || 0), 0);
    update(ref(db, `pedidos/${id}`), {
      items: itemsActualizados,
      total: nuevoTotal,
      estado: "pendiente",  // regresa a pendiente para que cocina lo vea
      actualizado: new Date().toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"})
    });
    showNotif("✅ Productos añadidos al pedido");
  }, [db]);

  const updateEstado = (id, estado) => db && update(ref(db, `pedidos/${id}`), { estado });
  const cancelar    = (id) => db && update(ref(db, `pedidos/${id}`), { estado: "cancelado" });
  const updateMenu  = (nuevoMenu) => { if(db){ set(ref(db, "menu"), nuevoMenu); showNotif("✅ Menú actualizado"); } };

  const pedidosArr = Object.entries(pedidos).map(([id, p]) => ({ ...p, id })).sort((a, b) => (b.ts||0) - (a.ts||0));
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
          {[{k:"central",l:"📺 Central"},{k:"pedido",l:"📱 Pedido"},{k:"reportes",l:"📊 Reportes"},{k:"admin",l:"⚙️ Admin"}].map(v => (
            <button key={v.k}
              onClick={() => { if((v.k==="reportes"||v.k==="admin")&&!isAdmin) setView("login"); else setView(v.k); }}
              style={{...S.navBtn,...(view===v.k?S.navBtnOn:{})}}>
              {v.l}
            </button>
          ))}
        </div>
      </nav>
      <main style={S.main}>
        {view==="central"  && <Central pedidos={hoy} onUpdate={updateEstado} onCancelar={cancelar} onAgregar={agregarAltPedido} menu={menu}/>}
        {view==="pedido"   && <Pedido  onAdd={addPedido} menu={menu}/>}
        {view==="reportes" && isAdmin && <Reportes pedidos={pedidosArr}/>}
        {view==="admin"    && isAdmin && <Admin menu={menu} onUpdate={updateMenu}/>}
        {view==="login"    && <Login onLogin={(ok) => { if(ok){ setIsAdmin(true); setView("reportes"); } }}/>}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  CENTRAL (tablero kanban)
// ═══════════════════════════════════════════════════════
function Central({ pedidos, onUpdate, onCancelar, onAgregar, menu }) {
  console.log("Pedidos recibidos hoy:", pedidos);
  const [pedidoSelec, setPedidoSelec] = useState(null); // pedido al que se agregan productos
  const [carritoExtra, setCarritoExtra] = useState([]);

  const cols = [
    { k:"pendiente",  l:"⏳ Pendientes", c:"#FFBA08", acc:[{l:"▶ Preparar",e:"en_proceso",c:"#3A86FF"}] },
    { k:"en_proceso", l:"👨‍🍳 En Proceso", c:"#3A86FF", acc:[{l:"✅ Listo",   e:"listo",    c:"#06D6A0"}] },
    { k:"listo",      l:"✅ Listos",      c:"#06D6A0", acc:[{l:"🤝 Entregar",e:"entregado",c:"#888"}]    },
    { k:"entregado",  l:"🤝 Entregados",  c:"#888",    acc:[] },
  ];

  const agregarItemExtra = (nombre, datos, variante) => {
    const precio = getPrecio(datos, variante);
    setCarritoExtra(prev => [...prev, { nombre: variante ? `${nombre} (${variante})` : nombre, cantidad:1, subtotal:precio, icon:datos.icon }]);
  };

  const confirmarAgregar = () => {
    if (!pedidoSelec || carritoExtra.length === 0) return;
    onAgregar(pedidoSelec.id, pedidoSelec, carritoExtra);
    setPedidoSelec(null);
    setCarritoExtra([]);
  };

  return (
    <div>
      <div style={S.centralDate}>📅 {getToday()}</div>

      {/* ✅ Modal para agregar productos a pedido existente */}
      {pedidoSelec && (
        <div style={S.modalOverlay}>
          <div style={S.modalBox}>
            <h3 style={{margin:"0 0 12px",color:"#E85D04"}}>➕ Agregar a pedido #{String(pedidoSelec.ts).slice(-4)} — {pedidoSelec.mesa}</h3>
            <div style={{maxHeight:300, overflowY:"auto"}}>
              {Object.entries(menu).map(([nombre, datos]) => (
                <div key={nombre} style={S.modalItem}>
                  <span>{datos.icon} {nombre}</span>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {(datos.variantes||[""]).map(v => (
                      <button key={v} style={S.modalBtn} onClick={() => agregarItemExtra(nombre, datos, v || null)}>
                        {v || "Agregar"} {v && datos.precios ? `$${getPrecio(datos,v)}` : datos.precio ? `$${datos.precio}` : ""}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {carritoExtra.length > 0 && (
              <div style={{marginTop:10, background:"#111", padding:8, borderRadius:8}}>
                <b>Por agregar:</b>
                {carritoExtra.map((i,idx) => <div key={idx} style={{fontSize:12,color:"#aaa"}}>{i.icon} {i.nombre} — {fmt(i.subtotal)}</div>)}
                <div style={{marginTop:6, fontWeight:800}}>Total extra: {fmt(carritoExtra.reduce((s,i)=>s+i.subtotal,0))}</div>
              </div>
            )}
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button style={{...S.accBtn, background:"#06D6A0", flex:2, padding:"10px 0"}} onClick={confirmarAgregar} disabled={carritoExtra.length===0}>
                ✅ Confirmar
              </button>
              <button style={{...S.accBtn, background:"#555", flex:1, padding:"10px 0"}} onClick={()=>{ setPedidoSelec(null); setCarritoExtra([]); }}>
                ✕ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={S.kanban}>
        {cols.map(c => (
          <div key={c.k} style={S.kCol}>
            <div style={{...S.kHead, borderBottom:`3px solid ${c.c}`, color:c.c}}>{c.l}</div>
            {pedidos.filter(p => p.estado === c.k).map(p => (
              <div key={p.id} style={{...S.card, ...(p.actualizado ? {border:"2px solid #E85D04"} : {})}}>
                <div style={S.cardTop}>
                  <b>#{String(p.ts).slice(-4)}</b> — {p.mesa || "Sin mesa"}<br/>
                  <small>{p.hora}{p.actualizado ? ` · actualizado ${p.actualizado}` : ""} · {fmt(p.total)}</small>
                </div>
                {/* Items del pedido */}
                <div style={S.itemsList}>
                  {(p.items||[]).map((item,i) => (
                    <div key={i} style={S.itemRow}>{item.icon} {item.nombre} ×{item.cantidad}</div>
                  ))}
                </div>
                <div style={S.cardAcc}>
                  {c.acc.map(a => <button key={a.e} style={{...S.accBtn, background:a.c}} onClick={()=>onUpdate(p.id, a.e)}>{a.l}</button>)}
                  {/* ✅ Botón agregar productos en pendiente y en_proceso */}
                  {(c.k==="pendiente"||c.k==="en_proceso") && (
                    <button style={{...S.accBtn, background:"#9D4EDD"}} onClick={()=>setPedidoSelec(p)}>➕</button>
                  )}
                  {c.k==="pendiente" && (
                    <button style={{...S.accBtn, background:"#EF233C"}} onClick={()=>onCancelar(p.id)}>✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  PEDIDO
// ═══════════════════════════════════════════════════════
function Pedido({ onAdd, menu }) {
  const [carrito, setCarrito] = useState([]);
  const [mesa, setMesa] = useState("");
  const [varianteSelec, setVarianteSelec] = useState({}); // { nombreProducto: varianteElegida }
  const total = carrito.reduce((s,i) => s + (i.subtotal||0), 0);

  const agregar = (nombre, datos) => {
    const variante = varianteSelec[nombre] || (datos.variantes && datos.variantes[0]) || null;
    const precio = getPrecio(datos, variante);
    const label = variante ? `${nombre} (${variante})` : nombre;
    setCarrito(prev => [...prev, { nombre:label, cantidad:1, subtotal:precio, icon:datos.icon }]);
  };

  return (
    <div>
      <input style={S.mesaInput} placeholder="Mesa / Nombre del cliente" value={mesa} onChange={e=>setMesa(e.target.value)} />

      {/* Comidas */}
      <div style={S.secTitle}>🍽️ Comida</div>
      <div style={S.menuGrid}>
        {Object.entries(menu).filter(([,d])=>d.categoria==="comida").map(([n,d]) => (
          <div key={n} style={{...S.mCard, borderTop:`4px solid ${d.color}`}}>
            <div style={{fontSize:26,marginBottom:4}}>{d.icon}</div>
            <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>{n}</div>
            {d.variantes && (
              <select style={S.select} value={varianteSelec[n]||d.variantes[0]} onChange={e=>setVarianteSelec(prev=>({...prev,[n]:e.target.value}))}>
                {d.variantes.map(v=><option key={v} value={v}>{v}</option>)}
              </select>
            )}
            <div style={{fontSize:12,color:"#aaa",margin:"4px 0"}}>{fmt(getPrecio(d, varianteSelec[n]||d.variantes?.[0]))}</div>
            <button style={{...S.addBtn, background:d.color}} onClick={()=>agregar(n,d)}>+ Agregar</button>
          </div>
        ))}
      </div>

      {/* Bebidas */}
      <div style={S.secTitle}>🥤 Bebidas</div>
      <div style={S.menuGrid}>
        {Object.entries(menu).filter(([,d])=>d.categoria==="bebida").map(([n,d]) => (
          <div key={n} style={{...S.mCard, borderTop:`4px solid ${d.color}`}}>
            <div style={{fontSize:26,marginBottom:4}}>{d.icon}</div>
            <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>{n}</div>
            {d.variantes && (
              <select style={S.select} value={varianteSelec[n]||d.variantes[0]} onChange={e=>setVarianteSelec(prev=>({...prev,[n]:e.target.value}))}>
                {d.variantes.map(v=><option key={v} value={v}>{v} — {fmt(getPrecio(d,v))}</option>)}
              </select>
            )}
            <div style={{fontSize:12,color:"#aaa",margin:"4px 0"}}>{fmt(getPrecio(d, varianteSelec[n]||d.variantes?.[0]))}</div>
            <button style={{...S.addBtn, background:d.color}} onClick={()=>agregar(n,d)}>+ Agregar</button>
          </div>
        ))}
      </div>

      {/* Carrito */}
      {carrito.length > 0 && (
        <div style={S.carritoPanel}>
          <div style={{fontWeight:800,marginBottom:8}}>🛒 Carrito</div>
          {carrito.map((item,i) => (
            <div key={i} style={S.carritoRow}>
              <span>{item.icon} {item.nombre}</span>
              <span style={{display:"flex",alignItems:"center",gap:8}}>
                {fmt(item.subtotal)}
                <button style={S.removeBtn} onClick={()=>setCarrito(prev=>prev.filter((_,j)=>j!==i))}>✕</button>
              </span>
            </div>
          ))}
          <div style={{borderTop:"1px solid #333",marginTop:8,paddingTop:8,fontWeight:800,fontSize:16}}>Total: {fmt(total)}</div>
          <button style={S.fab} onClick={()=>{ onAdd({items:carrito,mesa,total}); setCarrito([]); setMesa(""); }}>
            🚀 Enviar Pedido ({fmt(total)})
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  LOGIN
// ═══════════════════════════════════════════════════════
function Login({ onLogin }) {
  const [pass, setPass] = useState("");
  return (
    <div style={S.loginWrap}>
      <div style={S.loginBox}>
        <h3 style={{color:"#E85D04",marginTop:0}}>🔐 Acceso Admin</h3>
        <input type="password" style={S.loginInput} placeholder="Contraseña" onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onLogin(pass===ADMIN_PASSWORD)}/>
        <button style={S.loginBtn} onClick={()=>onLogin(pass===ADMIN_PASSWORD)}>Entrar</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  REPORTES
// ═══════════════════════════════════════════════════════
function Reportes({ pedidos }) {
  const validos = pedidos.filter(p=>p.estado!=="cancelado");
  const total = validos.reduce((s,p)=>s+(p.total||0),0);
  const hoy = getTodayKey();
  const hoyTotal = validos.filter(p=>p.fecha===hoy).reduce((s,p)=>s+(p.total||0),0);
  return (
    <div style={S.rWrap}>
      <h3 style={{color:"#E85D04"}}>📊 Reportes</h3>
      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
        <div style={S.statCard}><div style={S.statNum}>{fmt(hoyTotal)}</div><div style={S.statLbl}>Ventas hoy</div></div>
        <div style={S.statCard}><div style={S.statNum}>{fmt(total)}</div><div style={S.statLbl}>Ventas totales</div></div>
        <div style={S.statCard}><div style={S.statNum}>{validos.filter(p=>p.fecha===hoy).length}</div><div style={S.statLbl}>Pedidos hoy</div></div>
      </div>
      <h4 style={{marginTop:20}}>Últimos pedidos</h4>
      {pedidos.slice(0,20).map(p=>(
        <div key={p.id} style={{...S.card,marginBottom:8}}>
          <b>#{String(p.ts||"").slice(-4)}</b> — {p.mesa||"Sin mesa"} — {p.fecha} {p.hora} — {fmt(p.total)} — <span style={{color:p.estado==="cancelado"?"#EF233C":"#06D6A0"}}>{p.estado}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  ADMIN
// ═══════════════════════════════════════════════════════
function Admin({ menu, onUpdate }) {
  return (
    <div style={S.adminWrap}>
      <h3 style={{color:"#E85D04"}}>⚙️ Gestión de Menú</h3>
      <p style={{color:"#aaa"}}>Menú cargado desde Firebase. Para cambios avanzados contacta soporte.</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
        {Object.entries(menu).map(([n,d])=>(
          <div key={n} style={{...S.mCard,borderTop:`4px solid ${d.color}`,minWidth:140}}>
            <div style={{fontSize:24}}>{d.icon}</div>
            <div style={{fontWeight:700}}>{n}</div>
            <div style={{fontSize:12,color:"#aaa"}}>{d.categoria}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  ESTILOS
// ═══════════════════════════════════════════════════════
const S = {
  root:{ minHeight:"100vh", background:"#0F0F0F", color:"#F0EBE3", fontFamily:"system-ui" },
  toast:{ position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:"#06D6A0",color:"#0F0F0F",padding:"10px 22px",borderRadius:20,zIndex:9999,fontWeight:700 },
  nav:{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",height:58,background:"#1A1A1A",borderBottom:"2px solid #E85D04" },
  brand:{ display:"flex",alignItems:"center",gap:8 },
  brandText:{ fontSize:20,fontWeight:800,color:"#E85D04" },
  online:{ fontSize:11,color:"#06D6A0",marginLeft:8 },
  navBtns:{ display:"flex",gap:5,flexWrap:"wrap" },
  navBtn:{ padding:"6px 10px",borderRadius:20,border:"1px solid #333",background:"transparent",color:"#aaa",fontSize:12,cursor:"pointer" },
  navBtnOn:{ background:"#E85D04",color:"#fff",border:"1px solid #E85D04" },
  main:{ padding:16 },
  centralDate:{ textAlign:"center",marginBottom:15,color:"#aaa",fontSize:14 },
  kanban:{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:15 },
  kCol:{ background:"#1A1A1A",padding:10,borderRadius:10,minHeight:300 },
  kHead:{ fontWeight:800,marginBottom:10,textAlign:"center",paddingBottom:8 },
  card:{ background:"#242424",padding:10,borderRadius:8,marginBottom:10,border:"1px solid #333" },
  cardTop:{ fontSize:13,lineHeight:1.7 },
  itemsList:{ margin:"6px 0",padding:"6px 0",borderTop:"1px solid #333" },
  itemRow:{ fontSize:12,color:"#ccc",padding:"2px 0" },
  cardAcc:{ display:"flex",gap:5,marginTop:8 },
  accBtn:{ flex:1,padding:"6px 4px",border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer" },
  // Modal agregar productos
  modalOverlay:{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 },
  modalBox:{ background:"#1A1A1A",borderRadius:16,padding:20,width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto",border:"2px solid #E85D04" },
  modalItem:{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #222",flexWrap:"wrap",gap:6 },
  modalBtn:{ background:"#333",border:"none",color:"#fff",borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer" },
  // Pedido
  secTitle:{ fontSize:18,fontWeight:800,margin:"20px 0 10px",color:"#E85D04" },
  mesaInput:{ width:"100%",background:"#1A1A1A",border:"1px solid #333",color:"#fff",padding:12,borderRadius:10,marginBottom:15,fontSize:15 },
  menuGrid:{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:10 },
  mCard:{ background:"#1A1A1A",borderRadius:12,padding:14,border:"1px solid #222",color:"#fff",textAlign:"center" },
  select:{ width:"100%",background:"#111",border:"1px solid #444",color:"#fff",borderRadius:6,padding:"4px 6px",fontSize:12,marginBottom:4 },
  addBtn:{ width:"100%",border:"none",borderRadius:8,padding:"7px 0",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13,marginTop:4 },
  carritoPanel:{ background:"#1A1A1A",borderRadius:12,padding:16,marginTop:16,marginBottom:80,border:"1px solid #333" },
  carritoRow:{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",fontSize:14 },
  removeBtn:{ background:"#EF233C",border:"none",color:"#fff",borderRadius:50,width:20,height:20,cursor:"pointer",fontSize:11,lineHeight:"20px",padding:0 },
  fab:{ display:"block",width:"100%",marginTop:14,background:"#E85D04",color:"#fff",padding:"14px 0",borderRadius:12,border:"none",fontWeight:800,fontSize:16,cursor:"pointer" },
  // Login
  loginWrap:{ display:"flex",justifyContent:"center",paddingTop:60 },
  loginBox:{ background:"#1A1A1A",padding:30,borderRadius:16,textAlign:"center",width:300 },
  loginInput:{ display:"block",width:"100%",margin:"10px 0",padding:12,background:"#000",color:"#fff",border:"1px solid #333",borderRadius:8,fontSize:15 },
  loginBtn:{ background:"#E85D04",color:"#fff",border:"none",padding:"12px 0",width:"100%",borderRadius:8,fontWeight:700,fontSize:16,cursor:"pointer" },
  // Reportes
  rWrap:{ padding:20 },
  statCard:{ background:"#1A1A1A",borderRadius:12,padding:"16px 24px",minWidth:140,textAlign:"center",border:"1px solid #333" },
  statNum:{ fontSize:28,fontWeight:800,color:"#E85D04" },
  statLbl:{ fontSize:13,color:"#aaa",marginTop:4 },
  adminWrap:{ padding:20 },
};
