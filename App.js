import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBmRE258LdtlR5jAo3ChN9jG94C3MsMI68",
  authDomain: "sistema-ventas-4ae00.firebaseapp.com",
  databaseURL: "https://sistema-ventas-4ae00-default-rtdb.firebaseio.com",
  projectId: "sistema-ventas-4ae00",
  storageBucket: "sistema-ventas-4ae00.firebasestorage.app",
  messagingSenderId: "774049154998",
  appId: "1:774049154998:web:6a5e9297dc52abf3cc2317",
};

const MENU_DEFAULT = {
  "Chilaquiles":  { icon:"🍳", color:"#E85D04", precio:55 },
  "Enchiladas":   { icon:"🌯", color:"#C1121F", precio:55 },
  "Tacos":        { icon:"🌮", color:"#F48C06", precio:28 },
  "Pambazos":     { icon:"🥙", color:"#DC2F02", precio:28 },
  "Quesadillas":  { icon:"🫓", color:"#9D4EDD", precio:30 },
  "Agua":         { icon:"💧", color:"#00B4D8", precio:25 },
  "Refresco":     { icon:"🥤", color:"#EF233C", precio:25 }
};

function App() {
  const [db, setDb] = React.useState(null);
  const [view, setView] = React.useState("pedido");
  const [pedidos, setPedidos] = React.useState({});
  const [carrito, setCarrito] = React.useState([]);
  const [mesa, setMesa] = React.useState("");

  React.useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);
    setDb(database);
    onValue(ref(database, "pedidos"), snap => setPedidos(snap.val() || {}));
  }, []);

  const enviarPedido = () => {
    if (!mesa) return alert("Pon el nombre o mesa");
    const total = carrito.reduce((s, i) => s + i.precio, 0);
    push(ref(db, "pedidos"), { 
        items: carrito, mesa, total, 
        fecha: new Date().toISOString().split('T')[0], 
        estado: "pendiente", 
        ts: Date.now(),
        hora: new Date().toLocaleTimeString() 
    });
    setCarrito([]); setMesa(""); alert("¡Pedido enviado!");
  };

  return (
    <div style={{ background: "#0F0F0F", minHeight: "100vh", color: "#fff", padding: "20px", fontFamily: "sans-serif" }}>
      <nav style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ color: "#E85D04" }}>🌮 Mi Taquería</h2>
        <div>
            <button onClick={() => setView("pedido")} style={{background:"#333", color:"#fff", border:"none", padding:"8px", borderRadius:8, marginRight:5}}>📱 Pedido</button>
            <button onClick={() => setView("central")} style={{background:"#333", color:"#fff", border:"none", padding:"8px", borderRadius:8}}>📺 Cocina</button>
        </div>
      </nav>

      {view === "pedido" ? (
        <div>
          <input placeholder="Mesa / Nombre" value={mesa} onChange={e=>setMesa(e.target.value)} style={{width:"100%", padding:12, marginBottom:15, background:"#1A1A1A", border:"1px solid #333", color:"#fff", borderRadius:8, boxSizing:"border-box"}} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
            {Object.entries(MENU_DEFAULT).map(([n, d]) => (
              <button key={n} onClick={() => setCarrito([...carrito, { nombre: n, precio: d.precio }])} style={{ background: "#1A1A1A", border: `2px solid ${d.color}`, color: "#fff", padding: 15, borderRadius: 12 }}>
                <span style={{ fontSize: 24 }}>{d.icon}</span><br/>{n}<br/>${d.precio}
              </button>
            ))}
          </div>
          {carrito.length > 0 && (
            <button onClick={enviarPedido} style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#E85D04", color: "#fff", padding: "15px 30px", borderRadius: 30, border: "none", fontWeight: "bold", width: "80%" }}>Enviar Pedido (${carrito.reduce((s,i)=>s+i.precio, 0)})</button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            {Object.entries(pedidos).filter(([id, p]) => p.estado === "pendiente").map(([id, p]) => (
                <div key={id} style={{ background: "#1A1A1A", padding: 15, borderRadius: 10, border: "1px solid #333" }}>
                    <b>{p.mesa}</b> - {p.hora}<br/>
                    {p.items.map((it, idx) => <div key={idx}>• {it.nombre}</div>)}
                    <button onClick={() => update(ref(db, `pedidos/${id}`), { estado: "listo" })} style={{ marginTop: 10, background: "#06D6A0", border: "none", padding: 10, borderRadius: 5, width: "100%", fontWeight: "bold" }}>✅ Marcar Listo</button>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}

// Renderizar la app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
