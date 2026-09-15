/* global React, ReactDOM, AnalyticsView, RecordView, DetailView, FleterIcons, FLETER_DATA */
const { useState, useEffect, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "warm",
  "accent": "#E85D2A",
  "density": "comfortable",
  "displayFont": "Archivo Black"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = (window.useTweaks || ((d)=>[d, ()=>{}]))(TWEAK_DEFAULTS);
  const [view, setView] = useState("analytics"); // analytics | record | detail | active | profile
  const [openTripId, setOpenTripId] = useState(null);
  const [period, setPeriod] = useState("Mensual");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("TODOS");

  const data = window.FLETER_DATA;
  const trip = data.viajes.find(v => v.id === openTripId);

  const openTrip = (id) => {
    setOpenTripId(id);
    setView("detail");
  };

  // apply theme + accent
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", tweaks.accent);
    document.documentElement.style.setProperty("--font-display", `"${tweaks.displayFont}", "Archivo Black", sans-serif`);
  }, [tweaks.accent, tweaks.displayFont]);

  const themeClass = `theme--${tweaks.theme}`;

  const recentInSidebar = data.viajes.slice(0, 8);

  return (
    <div className={"app " + themeClass}>
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="brand-mark accent">F</span>
          <span className="brand-name">Fleter<em>.</em></span>
        </div>

        <button className="sidebar__new" onClick={()=>{ setView("active"); }}>
          <FleterIcons.plus style={{width:14,height:14}}/> Solicitar nuevo flete
        </button>

        <nav className="sidebar__section">
          <NavItem icon="pulse" label="Analytics" active={view==="analytics"} onClick={()=>setView("analytics")} />
          <NavItem icon="list" label="Record" count={data.viajes.length} active={view==="record" || view==="detail"} onClick={()=>{ setView("record"); setOpenTripId(null); }} />
          <NavItem icon="truck" label="Viaje activo" badge="Próx." onClick={()=>{}} />
          <NavItem icon="invoice" label="Facturación" onClick={()=>{}} />
          <NavItem icon="user" label="Perfil" onClick={()=>{}} />
        </nav>

        <div className="sidebar__label">Viajes recientes</div>
        <div className="sidebar__history">
          {recentInSidebar.map(v => (
            <button
              key={v.id}
              className={"history-item"+(openTripId===v.id?" is-active":"")}
              onClick={()=>openTrip(v.id)}
            >
              <div className="history-item__route">{v.destino}</div>
              <div className="history-item__meta">
                <span>{fmtDate(v.fecha)}</span>
                <span>·</span>
                <span>{v.precio_final ? fmtARS(v.precio_final) : "—"}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="sidebar__user">
          <div className="user-avatar">{initials(data.user.nombre + " " + data.user.apellido)}</div>
          <div className="user-meta">
            <strong>{data.user.nombre} {data.user.apellido}</strong>
            <span>{data.user.nombre_empresa}</span>
          </div>
          <span className="user-role">{data.user.rol}</span>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        <div className="topbar">
          <div className="topbar__crumbs">
            <strong>Distribuidora Lumina</strong>
            <FleterIcons.chev style={{width:12,height:12, color:"var(--ink-4)"}}/>
            <span>{view === "analytics" ? "Analytics" : view === "record" ? "Record" : view === "detail" ? "Record" : view}</span>
            {view === "detail" && trip && <>
              <FleterIcons.chev style={{width:12,height:12, color:"var(--ink-4)"}}/>
              <strong>{trip.id}</strong>
            </>}
          </div>
          <div className="topbar__spacer"/>
          <div className="period-pill">
            <span className="period-pill__dot"/>
            <FleterIcons.cal style={{width:12,height:12}}/>
            {data.periodo.label}
          </div>
        </div>

        <div className="content">
          {view === "analytics" && <AnalyticsView data={data} onOpenTrip={openTrip} period={period} setPeriod={setPeriod}/>}
          {view === "record" && <RecordView data={data} onOpenTrip={openTrip} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter}/>}
          {view === "detail" && <DetailView trip={trip} onBack={()=>{ setView("record"); setOpenTripId(null); }}/>}
          {view === "active" && <PlaceholderView title="Viaje activo" desc="Aquí verás tu flete en tiempo real con mapa, ETA y banner de estado. Disponible en F2." />}
          {view === "profile" && <PlaceholderView title="Perfil" desc="Datos de empresa, CUIT y dirección principal."/>}
          {view === "facturacion" && <PlaceholderView title="Facturación" desc="Comprobantes y resumen de cuenta."/>}
        </div>
      </main>

      {/* TWEAKS */}
      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection title="Tema">
            <window.TweakRadio
              label="Tono"
              value={tweaks.theme}
              onChange={(v)=>setTweak("theme", v)}
              options={[
                {label:"Cálido", value:"warm"},
                {label:"Neutro", value:""},
                {label:"Fresco", value:"cool"},
              ]}
            />
            <window.TweakRadio
              label="Acento"
              value={tweaks.accent}
              onChange={(v)=>setTweak("accent", v)}
              options={[
                {label:"Naranja", value:"#E85D2A"},
                {label:"Marino", value:"#1F3A5F"},
                {label:"Verde", value:"#2F8F4E"},
                {label:"Tinta", value:"#1B1A17"},
              ]}
            />
          </window.TweakSection>
          <window.TweakSection title="Tipografía">
            <window.TweakRadio
              label="Display"
              value={tweaks.displayFont}
              onChange={(v)=>setTweak("displayFont", v)}
              options={[
                {label:"Archivo Black", value:"Archivo Black"},
                {label:"Manrope", value:"Manrope"},
                {label:"Josefin Sans", value:"Josefin Sans"},
              ]}
            />
          </window.TweakSection>
        </window.TweaksPanel>
      )}
    </div>
  );
}

function NavItem({ icon, label, count, active, badge, onClick }) {
  const Icon = FleterIcons[icon];
  return (
    <button className={"nav-item"+(active?" is-active":"")} onClick={onClick}>
      <Icon className="nav-item__icon"/>
      <span>{label}</span>
      {count != null && <span className="nav-item__count">{count}</span>}
      {badge && <span className="nav-item__count">{badge}</span>}
    </button>
  );
}

function PlaceholderView({ title, desc }) {
  return (
    <div>
      <div className="section-header"><div><h2>{title}</h2><p>{desc}</p></div></div>
      <div className="card" style={{padding:60, textAlign:"center"}}>
        <div style={{fontFamily:"var(--font-display)", fontSize:18, color:"var(--ink-3)"}}>Próximamente</div>
        <p style={{color:"var(--ink-3)", fontSize:13, maxWidth:420, margin:"6px auto 0"}}>{desc}</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
