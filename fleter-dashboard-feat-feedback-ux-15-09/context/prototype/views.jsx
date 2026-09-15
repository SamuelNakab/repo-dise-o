/* global React */
const { useMemo } = React;

// ============= ANALYTICS VIEW =============
function AnalyticsView({ data, onOpenTrip, period, setPeriod }) {
  const r = data.resumen;
  const totalZona = r.por_zona.CABA + r.por_zona.PROVINCIA + r.por_zona.MIXTO;
  const maxBar = Math.max(...r.fletes_por_semana.map(s => s.viajes));

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Analytics</h2>
          <p>Resumen del período · {data.periodo.label}</p>
        </div>
        <div style={{display:"flex", gap:10, alignItems:"center"}}>
          <div className="period-tabs">
            {["Semanal","Mensual","Personalizado"].map(t => (
              <button key={t} className={"period-tab" + (period===t ? " is-active":"")} onClick={()=>setPeriod(t)}>{t}</button>
            ))}
          </div>
          <button className="btn"><FleterIcons.download style={{width:14,height:14}}/> Exportar</button>
        </div>
      </div>

      {/* TOP METRICS ROW */}
      <div className="grid-12" style={{marginBottom: 16}}>
        <div className="card span-4 card--ink">
          <p className="metric__label">Total gastado</p>
          <p className="metric__value"><sup>$</sup>{r.total_gastado.toLocaleString("es-AR")}</p>
          <p className="metric__hint"><span className="delta delta--up" style={{background:"rgba(255,255,255,.12)", color:"#FBE4D6"}}>+18.4%</span> vs. marzo</p>
        </div>
        <div className="card span-4">
          <p className="metric__label">Fletes solicitados</p>
          <p className="metric__value">{r.cantidad_viajes}</p>
          <p className="metric__hint"><span className="delta delta--up">+9</span> sobre marzo · {(r.cantidad_viajes/4.3).toFixed(1)} por semana</p>
        </div>
        <div className="card span-4">
          <p className="metric__label">Costo promedio</p>
          <p className="metric__value"><sup>$</sup>{r.costo_promedio.toLocaleString("es-AR")}</p>
          <p className="metric__hint"><span className="delta delta--down">-3.1%</span> el promedio bajó vs. marzo</p>
        </div>
      </div>

      {/* SECOND ROW */}
      <div className="grid-12" style={{marginBottom: 16}}>
        {/* WEEKLY BARS */}
        <div className="card span-7">
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
            <div>
              <p className="card-title">Fletes por semana</p>
              <p className="card-sub">Cantidad de viajes solicitados — abril 2026</p>
            </div>
            <p style={{fontSize:11, color:"var(--ink-3)", fontWeight:600, letterSpacing:".06em", textTransform:"uppercase"}}>↑ Cant. viajes</p>
          </div>
          <div className="bars">
            {r.fletes_por_semana.map(s => (
              <div className="bar" key={s.semana}>
                <div className="bar__col" style={{height: `${(s.viajes/maxBar)*100}%`}} data-amount={fmtARS(s.gasto)}>
                  <span className="bar__count">{s.viajes}</span>
                </div>
                <span className="bar__label">{s.semana}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ZONE BREAKDOWN */}
        <div className="card span-5">
          <p className="card-title">Desglose por zona</p>
          <p className="card-sub">Gasto del período según tipo de viaje</p>
          {[
            {zone:"CABA", val:r.por_zona.CABA, cls:""},
            {zone:"PROVINCIA", val:r.por_zona.PROVINCIA, cls:"zone-fill--prov"},
            {zone:"MIXTO", val:r.por_zona.MIXTO, cls:"zone-fill--mixto"},
          ].map(z => (
            <div className="zone-row" key={z.zone}>
              <span className="zone-name">{z.zone}</span>
              <div className="zone-track">
                <div className={"zone-fill "+z.cls} style={{width: `${(z.val/totalZona)*100}%`}}/>
              </div>
              <span className="zone-amount">{fmtARS(z.val)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* THIRD ROW: extremes + alerts */}
      <div className="grid-12" style={{marginBottom: 16}}>
        <div className="card span-4">
          <p className="metric__label">Flete más caro</p>
          <p className="metric__value" style={{color:"var(--accent)"}}><sup>$</sup>{r.viaje_mas_caro.monto.toLocaleString("es-AR")}</p>
          <div className="extreme">
            <div>
              <div className="extreme__route">{r.viaje_mas_caro.ruta}</div>
              <div className="extreme__id">{r.viaje_mas_caro.id}</div>
            </div>
            <button className="extreme__btn" onClick={()=>onOpenTrip(r.viaje_mas_caro.id)}>Ver detalle →</button>
          </div>
        </div>
        <div className="card span-4">
          <p className="metric__label">Flete más barato</p>
          <p className="metric__value"><sup>$</sup>{r.viaje_mas_barato.monto.toLocaleString("es-AR")}</p>
          <div className="extreme">
            <div>
              <div className="extreme__route">{r.viaje_mas_barato.ruta}</div>
              <div className="extreme__id">{r.viaje_mas_barato.id}</div>
            </div>
            <button className="extreme__btn" onClick={()=>onOpenTrip(r.viaje_mas_barato.id)}>Ver detalle →</button>
          </div>
        </div>
        <div className="card span-4" style={{display:"flex", flexDirection:"column", justifyContent:"space-between"}}>
          <p className="metric__label">Alertas recibidas</p>
          <div className="alerts-strip">
            <span className={"alerts-strip__num"+(r.alertas_recibidas===0?" zero":"")}>{r.alertas_recibidas}</span>
            <div className="alerts-strip__text">
              <strong>2 desvíos · 2 paradas sospechosas</strong>
              detectadas automáticamente sobre los viajes del período
            </div>
          </div>
          <button className="btn" style={{alignSelf:"start", marginTop:10}} onClick={()=>onOpenTrip("VJ-2419")}>Revisar último alertado</button>
        </div>
      </div>

      {/* FREQUENT DESTINATIONS */}
      <div className="grid-12">
        <div className="card span-12">
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
            <div>
              <p className="card-title">Top 5 destinos frecuentes</p>
              <p className="card-sub">Direcciones a las que repetiste viajes en el período</p>
            </div>
          </div>
          <div>
            {r.destinos_frecuentes.map((d, i) => (
              <div className="dest-row" key={i}>
                <div className="dest-rank">{String(i+1).padStart(2,"0")}</div>
                <div>
                  <div className="dest-addr">{d.direccion}</div>
                  <div className="dest-zone">{d.zona}</div>
                </div>
                <div className="dest-count">{d.cantidad}<small>viajes</small></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= RECORD VIEW =============
function RecordView({ data, onOpenTrip, search, setSearch, filter, setFilter }) {
  const filtered = useMemo(() => {
    return data.viajes.filter(v => {
      if (filter !== "TODOS" && v.estado !== filter && filter !== "TODOS") {
        if (filter === "CON_ALERTAS") return v.alertas_count > 0;
        return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (v.origen?.toLowerCase().includes(q) || v.destino?.toLowerCase().includes(q) || v.id.toLowerCase().includes(q));
      }
      return true;
    });
  }, [data.viajes, search, filter]);

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Record</h2>
          <p>Historial completo de viajes · {data.viajes.length} resultados</p>
        </div>
        <button className="btn"><FleterIcons.download style={{width:14,height:14}}/> Exportar CSV</button>
      </div>

      <div className="toolbar">
        <div className="search-input">
          <FleterIcons.search style={{width:14,height:14, color:"var(--ink-3)"}}/>
          <input
            placeholder="Buscar por dirección o ID de viaje…"
            value={search} onChange={e=>setSearch(e.target.value)}
          />
          <span className="kbd">⌘K</span>
        </div>
        {[
          {k:"TODOS", l:"Todos"},
          {k:"ENTREGADO", l:"Entregados"},
          {k:"CANCELADO", l:"Cancelados"},
          {k:"CON_ALERTAS", l:"Con alertas"},
        ].map(c => (
          <button key={c.k} className={"chip"+(filter===c.k?" is-active":"")} onClick={()=>setFilter(c.k)}>{c.l}</button>
        ))}
      </div>

      <div className="trips-table">
        {filtered.map(v => (
          <div className="trip-row" key={v.id} onClick={()=>onOpenTrip(v.id)}>
            <div>
              <div className="trip-row__date">{fmtDate(v.fecha)}<small>{fmtTime(v.fecha)}</small></div>
            </div>
            <div className="trip-row__route">
              <div className="trip-row__from"><span className="dot"/>{v.origen}</div>
              <div className="trip-row__to"><span className="dot"/>{v.destino}</div>
            </div>
            <div className="trip-row__id">{v.id}</div>
            <div><span className={"zone-tag "+v.tipo_zona}>{v.tipo_zona}</span></div>
            <div><span className={"status "+v.estado}>{v.estado.replace("_"," ")}</span></div>
            <div className="trip-row__price">{v.precio_final ? fmtARS(v.precio_final) : "—"}</div>
            <div>
              <span className={"trip-row__alert"+(v.alertas_count===0?" zero":"")}>{v.alertas_count===0 ? "—" : v.alertas_count}</span>
            </div>
            <FleterIcons.chev className="trip-row__chev" style={{width:14,height:14}}/>
          </div>
        ))}
        {filtered.length === 0 && <div className="empty">No hay viajes que coincidan con los filtros.</div>}
      </div>
    </div>
  );
}

// ============= DETAIL VIEW =============
function DetailView({ trip, onBack }) {
  if (!trip) return null;
  const overTime = trip.duracion_real && trip.duracion_estimada && trip.duracion_real > trip.duracion_estimada;
  const overPrice = trip.precio_final && trip.precio_estimado && trip.precio_final > trip.precio_estimado;

  return (
    <div>
      <button className="btn btn--ghost" onClick={onBack} style={{marginBottom:14}}>
        <FleterIcons.back style={{width:14,height:14}}/> Volver al record
      </button>

      <div className="detail">
        <div className="detail__head">
          <div>
            <div style={{display:"flex", gap:8, alignItems:"center"}}>
              <span className={"status "+trip.estado}>{trip.estado.replace("_"," ")}</span>
              <span className={"zone-tag "+trip.tipo_zona}>{trip.tipo_zona}</span>
              <span className="trip-row__id">{trip.id}</span>
            </div>
            <h2>{trip.origen} → {trip.destino}</h2>
            <p style={{margin:0, color:"var(--ink-3)", fontSize:13}}>
              {new Date(trip.fecha).toLocaleDateString("es-AR",{weekday:"long", day:"2-digit", month:"long", year:"numeric"})} · {fmtTime(trip.fecha)}
            </p>
          </div>
          <div className="detail__price">
            <p className="metric__label">Precio final</p>
            <p className="metric__value"><sup>$</sup>{(trip.precio_final||0).toLocaleString("es-AR")}
              {overPrice && <span className="delta delta--down" style={{fontSize:11}}>+{fmtARS(trip.precio_final-trip.precio_estimado)}</span>}
            </p>
            {trip.precio_estimado && <p className="metric__hint" style={{textAlign:"right"}}>Estimado: {fmtARS(trip.precio_estimado)}</p>}
          </div>
        </div>

        {/* LEFT COLUMN */}
        <div style={{display:"flex", flexDirection:"column", gap:16}}>
          {/* Time vs estimate */}
          <div className="card">
            <p className="card-title">Tiempo del viaje</p>
            <p className="card-sub">Estimado vs. real al cierre</p>
            <div className="time-compare">
              <div className="time-cell">
                <div className="time-cell__label">Estimado</div>
                <div className="time-cell__value">{trip.duracion_estimada || "—"}<span style={{fontSize:12, fontFamily:"var(--font-ui)", color:"var(--ink-3)", marginLeft:4}}>min</span></div>
              </div>
              <div className={"time-cell"+(overTime?" time-cell--over":"")}>
                <div className="time-cell__label">Real</div>
                <div className="time-cell__value">{trip.duracion_real || "—"}<span style={{fontSize:12, fontFamily:"var(--font-ui)", color:"var(--ink-3)", marginLeft:4}}>min</span></div>
              </div>
            </div>
            <div style={{marginTop:14, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
              <div className="kv"><span>Km recorridos</span><strong>{trip.km_reales || "—"} km</strong></div>
              <div className="kv"><span>Carga</span><strong>{trip.carga?.descripcion || "—"}</strong></div>
              <div className="kv"><span>Peso</span><strong>{trip.carga?.peso_kg ? trip.carga.peso_kg + " kg" : "—"}</strong></div>
              <div className="kv"><span>Tipo de zona</span><strong>{trip.tipo_zona}</strong></div>
            </div>
          </div>

          {/* Stops timeline */}
          {trip.paradas && trip.paradas.length > 0 && (
            <div className="card">
              <p className="card-title">Recorrido y paradas</p>
              <p className="card-sub">{trip.paradas.length} paradas confirmadas por QR</p>
              <div className="timeline">
                {trip.paradas.map((p, i) => (
                  <div className="tl-item" key={i}>
                    <div className="tl-marker">
                      <span className={"tl-marker__dot"+(p.estado==="ENTREGADO"?" done":"")}/>
                      <span className="tl-marker__line"/>
                    </div>
                    <div className="tl-body">
                      <strong>Parada {p.orden} — {p.direccion}</strong>
                      <span>{p.estado === "ENTREGADO" ? "Confirmada por QR" : "Pendiente"}</span>
                    </div>
                    <div className="tl-time">{p.hora || "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerts */}
          <div className="card">
            <p className="card-title">Alertas detectadas</p>
            <p className="card-sub">{trip.alertas?.length || 0} eventos durante el recorrido</p>
            {(!trip.alertas || trip.alertas.length === 0) ? (
              <div style={{padding:"16px 0", color:"var(--ok)", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:8}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:"var(--ok)"}}/> Sin alertas — viaje sin desvíos ni paradas sospechosas.
              </div>
            ) : trip.alertas.map((a, i) => (
              <div className="alert-row" key={i}>
                <div className="alert-row__icon"><FleterIcons.alert style={{width:14,height:14}}/></div>
                <div>
                  <strong>{a.tipo === "DESVIO" ? "Desvío de ruta" : "Parada sospechosa"}</strong>
                  <span>{a.descripcion}</span>
                </div>
                <time>{a.timestamp}</time>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{display:"flex", flexDirection:"column", gap:16}}>
          {/* Driver */}
          <div className="card">
            <p className="card-title">Chofer y equipo</p>
            {trip.conductor ? (
              <>
                <div className="driver-card">
                  <div className="driver-avatar">{initials(trip.conductor.nombre)}</div>
                  <div className="driver-info">
                    <strong>{trip.conductor.nombre}</strong>
                    <span>Conductor titular</span>
                    <span className="rating"><FleterIcons.star className="star" style={{width:12,height:12}}/> {trip.conductor.calificacion} / 5.0</span>
                  </div>
                </div>
                {trip.ayudante && (
                  <div className="driver-card" style={{marginTop:10}}>
                    <div className="driver-avatar" style={{background:"var(--accent)"}}>{initials(trip.ayudante.nombre)}</div>
                    <div className="driver-info">
                      <strong>{trip.ayudante.nombre}</strong>
                      <span>{trip.ayudante.rol}</span>
                    </div>
                  </div>
                )}
              </>
            ) : <div className="empty" style={{padding:14}}>Sin chofer asignado</div>}
          </div>

          {/* Vehicle */}
          {trip.vehiculo && (
            <div className="card">
              <p className="card-title">Vehículo utilizado</p>
              <div className="kv-grid">
                <div className="kv"><span>Patente</span><strong style={{fontFamily:"var(--font-mono)"}}>{trip.vehiculo.patente}</strong></div>
                <div className="kv"><span>Tipo</span><strong>{trip.vehiculo.tipo}</strong></div>
              </div>
              {trip.vehiculo.condiciones && trip.vehiculo.condiciones.length > 0 && (
                <div style={{marginTop:14}}>
                  <p style={{fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", textTransform:"uppercase", fontWeight:600, margin:"0 0 6px"}}>Requerimientos cubiertos</p>
                  <div className="cred-list">
                    {trip.vehiculo.condiciones.map(c => <span className="cond" key={c}>{c}</span>)}
                  </div>
                </div>
              )}
              {trip.vehiculo.credenciales && trip.vehiculo.credenciales.length > 0 && (
                <div style={{marginTop:14}}>
                  <p style={{fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", textTransform:"uppercase", fontWeight:600, margin:"0 0 6px"}}>Credenciales</p>
                  <div className="cred-list">
                    {trip.vehiculo.credenciales.map(c => <span className="cred" key={c}>✓ {c}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transactions */}
          {trip.transacciones && trip.transacciones.length > 0 && (
            <div className="card">
              <p className="card-title">Transacciones</p>
              {trip.transacciones.map((t,i) => (
                <div key={i} style={{display:"flex", justifyContent:"space-between", padding:"10px 0", borderTop: i===0?0:"1px solid var(--line)"}}>
                  <div>
                    <strong style={{fontSize:13}}>{t.tipo === "COBRO_INICIAL" ? "Cobro inicial" : t.tipo === "AJUSTE" ? "Ajuste" : "Penalidad"}</strong>
                    <div style={{fontSize:11.5, color:"var(--ink-3)"}}>{t.motivo || t.fecha}</div>
                  </div>
                  <span style={{fontWeight:700, fontFeatureSettings:'"tnum"'}}>{fmtARS(t.monto)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AnalyticsView, RecordView, DetailView });
