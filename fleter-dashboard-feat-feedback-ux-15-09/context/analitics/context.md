# Stack Context — Frontend Web

## BFF (Backend for Frontend)

### Qué es
El dashboard web usa el patrón BFF implementado con **Next.js Route Handlers**. Es una capa de servidor que vive dentro del mismo proyecto Next.js, entre el browser del usuario y la API del backend.

No es un servidor separado. No hay infraestructura extra. Son archivos en `/app/api/` que corren en el servidor de Vercel.

### Por qué
- El token del backend nunca sale al browser
- El usuario nunca ve los datos crudos del backend
- El frontend recibe datos ya procesados, solo renderiza
- Si el backend cambia su estructura, se arregla en un lugar
- Desarrollo independiente del backend — se pueden mockear respuestas

### Dos canales que conviven

| Canal | Ruta | Cuándo usarlo |
|---|---|---|
| **Operacional** | Browser → API backend directo | Tiempo real o acción del usuario |
| **Analytics** | Browser → Route Handler → API backend | Datos procesados para el dashboard |

**Va directo al backend:** crear viaje, GPS, WebSockets, matching, login, pagos.
**Pasa por Route Handler:** métricas, historial procesado, reportes, PDFs, agregaciones.

---

## Estructura de carpetas

```
app/
├── api/
│   └── analytics/
│       ├── gastos/route.js          ← gastos por período
│       ├── cancelaciones/route.js   ← tasa de cancelación
│       ├── viajes/route.js          ← métricas de viajes
│       └── reportes/route.js        ← generación de PDFs
├── dashboard/
│   └── page.jsx                     ← consume /api/analytics/*
```

---

## Variables de entorno

```bash
API_URL=https://api-fleter.com     # URL del backend
API_SECRET=...                      # Token server-to-server, nunca al browser
```

Variables sin prefijo `NEXT_PUBLIC_` nunca llegan al browser. La `API_SECRET` solo existe en el servidor.

---

## Patrón de un Route Handler

```javascript
// app/api/analytics/gastos/route.js
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const periodo = searchParams.get("periodo") ?? "mes"

  // Llamar al backend server-to-server
  const res = await fetch(`${process.env.API_URL}/viajes`, {
    headers: { Authorization: `Bearer ${process.env.API_SECRET}` },
  })
  const viajes = await res.json()

  // Procesar
  const completados = viajes.filter(v => v.estado === "completado")
  const totalGastado = completados.reduce((acc, v) => acc + v.costo_final, 0)
  const costoPromedio = totalGastado / completados.length || 0

  // Devolver solo lo que el dashboard necesita
  return Response.json({ totalGastado, costoPromedio, periodo })
}
```

---

## UX — Loading states

El dashboard nunca bloquea toda la pantalla esperando datos. Usa skeletons por sección — cada métrica carga cuando está lista. Esto minimiza la percepción de latencia y resuelve el cold start de Vercel de forma transparente para el usuario.

```
Usuario entra al dashboard
       ↓
Pantalla aparece inmediatamente con skeletons
       ↓
Métricas aparecen de a una al resolverse cada fetch
```

### Precalentamiento de funciones
Al hacer login exitoso, antes de redirigir al dashboard, se hace una request silenciosa para despertar el Route Handler:

```javascript
// Después del login exitoso
await fetch("/api/analytics/gastos") // despierta la función
router.push("/dashboard")
```

---

## Cold starts

Los Route Handlers en Vercel son serverless — tienen cold starts de ~200-400ms cuando no hubo actividad reciente. No es un problema para analytics (el usuario no nota 300ms extra cargando un gráfico). Se mitiga con skeletons y precalentamiento en el login.

---

## Métricas del dashboard

| Métrica | Endpoint | Descripción |
|---|---|---|
| Gasto por período | `/api/analytics/gastos` | Total gastado, filtrable por mes/semana/rango |
| Tasa de cancelación | `/api/analytics/cancelaciones` | Cancelados / total viajes |
| Costo promedio | `/api/analytics/viajes` | Promedio por viaje en el período |
| Alertas de desvío | `/api/analytics/alertas` | Frecuencia por fletero o zona |
| Reportes PDF | `/api/analytics/reportes` | Documento descargable con detalle |

---

## Limitaciones conocidas y soluciones

| Limitación | Cuándo aparece | Solución |
|---|---|---|
| Timeout de Vercel (60s Pro) | Reportes con miles de registros | Background jobs con Trigger.dev o QStash |
| Mobile necesita las mismas métricas | Si la app quiere un dashboard | Mover lógica al backend principal |
| Cron jobs | Resumen semanal por email | Vercel Cron Jobs en `vercel.json` |
| Cold starts | Primera request del día | Skeletons + precalentamiento en login |

---

## Deploy

Zero configuración extra. Los Route Handlers se despliegan automáticamente con el proyecto Next.js en Vercel.