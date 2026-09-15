# Mapa de viaje activo — Dashboard Fleter (Next.js)

## Contexto

Este documento describe cómo implementar el mapa de tracking en tiempo real del dashboard web de Fleter.
El **conductor** emite su posición desde la app mobile (React Native). El **dashboard** solo escucha y renderiza.
No hay polling: todo llega por WebSocket via Socket.IO.

---

## Stack

- Next.js (App Router o Pages, aplica igual)
- Socket.IO client (`socket.io-client`)
- Google Maps (`@react-google-maps/api`)
- Firebase Auth para el JWT

---

## Instalación

```bash
npm install socket.io-client @react-google-maps/api
```

---

## Variables de entorno

```env
NEXT_PUBLIC_GOOGLE_MAPS_KEY=tu_api_key_de_google
NEXT_PUBLIC_WS_URL=https://nombre-proyecto-back-production.up.railway.app
```

---

## Autenticación WebSocket

El backend de Fleter usa Firebase JWT. El token se pasa en el campo `auth` de Socket.IO.
El token dura 1 hora y Firebase lo renueva automáticamente.

```js
import { getAuth } from 'firebase/auth'
import { io } from 'socket.io-client'

const token = await getAuth().currentUser.getIdToken()

const socket = io(process.env.NEXT_PUBLIC_WS_URL, {
  auth: { token: 'Bearer ' + token }
})

socket.on('connect_error', (err) => {
  console.error('WS auth error:', err.message) // "Token invalido" o "Usuario no registrado"
})
```

---

## Flujo completo del mapa

```
Conductor (mobile) --[conductor:ubicacion]--> Servidor
                                                 |
                            guarda en Redis, acumula distancia/tiempo
                                                 |
                     <--[mapa:actualizar]-- Servidor (broadcast al room viaje:{id})
                     <--[costo:actualizar]- Servidor (cada ~60 seg)
                     <--[alerta:desvio]---- Servidor (si se aleja >300m de ruta)
                     <--[alerta:parada]---- Servidor (si está detenido >5 min fuera de parada)
                     <--[viaje:estado_cambiado]-- Servidor (cambios de estado)
                     <--[viaje:finalizado]------- Servidor (última parada confirmada)
```

El servidor emite `mapa:actualizar` **cada vez** que recibe un `conductor:ubicacion` (~15 seg).
El conductor NO emite desde el dashboard — solo escucha.

---

## Evento que mueve el mapa: `mapa:actualizar`

**Dirección:** servidor → room `viaje:{id_viaje}`  
**Frecuencia:** ~cada 15 segundos  

**Payload:**
```json
{
  "lat": -34.6037,
  "lng": -58.3816,
  "timestamp": 1746700000000,
  "velocidad_kmh": 47
}
```

---

## Componente principal

```tsx
// components/MapaViajeActivo.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'
import { io, Socket } from 'socket.io-client'
import { getAuth } from 'firebase/auth'

interface Props {
  idViaje: number
}

interface Coords {
  lat: number
  lng: number
}

// Estilos opcionales: saca POIs y transporte para un mapa más limpio
const mapStyles = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
]

export function MapaViajeActivo({ idViaje }: Props) {
  const [coords, setCoords] = useState<Coords | null>(null)
  const [velocidad, setVelocidad] = useState<number | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const socketRef = useRef<Socket | null>(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
  })

  useEffect(() => {
    let mounted = true

    const conectar = async () => {
      const token = await getAuth().currentUser!.getIdToken()

      const socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
        auth: { token: 'Bearer ' + token },
      })
      socketRef.current = socket

      // Unirse al room del viaje
      socket.emit('viaje:join', { id_viaje: idViaje })

      // 👇 Evento principal — mueve el marcador
      socket.on('mapa:actualizar', (data: Coords & { velocidad_kmh: number }) => {
        if (!mounted) return
        const nuevas = { lat: data.lat, lng: data.lng }
        setCoords(nuevas)
        setVelocidad(data.velocidad_kmh)
        mapRef.current?.panTo(nuevas) // pan suave, sin re-centrar bruscamente
      })

      // Estado del viaje
      socket.on('viaje:estado_cambiado', (data) => {
        console.log(`Estado: ${data.estado_anterior} → ${data.estado_nuevo}`)
        // Actualizar UI según el estado si hace falta
      })

      // Alertas
      socket.on('alerta:desvio', (data) => {
        console.warn(data.mensaje) // mostrar toast/banner en la UI
      })

      socket.on('alerta:parada', (data) => {
        console.warn(data.mensaje) // mostrar toast/banner en la UI
      })

      // Costo acumulado (cada ~60 seg)
      socket.on('costo:actualizar', (data) => {
        console.log('Costo acumulado:', data.precio_acumulado)
        // Actualizar display de costo si lo mostrás en el dashboard
      })

      // Viaje finalizado
      socket.on('viaje:finalizado', (data) => {
        console.log('Viaje finalizado. Precio real:', data.precio_real)
        console.log('Remito:', data.remito_url)
        // Redirigir o mostrar pantalla de cierre
      })
    }

    conectar()

    return () => {
      mounted = false
      socketRef.current?.disconnect()
    }
  }, [idViaje])

  if (!isLoaded) return <div>Cargando mapa...</div>
  if (!coords) return <div>Esperando ubicación del conductor...</div>

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={coords}
      zoom={14}
      onLoad={(map) => (mapRef.current = map)}
      options={{
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        styles: mapStyles,
      }}
    >
      <Marker position={coords} />
    </GoogleMap>
  )
}
```

---

## Layout — cómo usar el componente

El mapa necesita que su contenedor padre tenga altura explícita. Sin eso no renderiza.

```tsx
// app/dashboard/viajes/[id]/page.tsx

import { MapaViajeActivo } from '@/components/MapaViajeActivo'

export default function PaginaViajeActivo({ params }: { params: { id: string } }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
        <h1>Viaje #{params.id}</h1>
      </div>

      {/* Mapa — ocupa el resto de la pantalla */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapaViajeActivo idViaje={Number(params.id)} />
      </div>
    </div>
  )
}
```

**Regla crítica de layout:**
```tsx
// ✅ Correcto: el padre tiene altura, el mapa hereda con height: '100%'
<div style={{ height: '60vh' }}>
  <MapaViajeActivo idViaje={42} />
</div>

// ❌ Incorrecto: el mapa no tiene referencia de altura
<MapaViajeActivo idViaje={42} />
```

---

## Estados del viaje (para manejar en la UI)

| Estado | Qué mostrar en el mapa |
|--------|------------------------|
| `BUSCANDO_CONDUCTOR` | Sin mapa, esperando conductor |
| `CONDUCTOR_ASIGNADO` | Sin mapa, conductor aún no se movió |
| `EN_CAMINO_A_ORIGEN` | Mapa activo, conductor yendo a buscar la carga |
| `EN_RUTA` | Mapa activo, algoritmos de desvío activos |
| `CARGANDO` | Mapa activo, conductor detenido cargando |
| `DESCARGANDO` | Mapa activo, conductor detenido descargando |
| `FINALIZADO` | Mapa estático o redirigir a resumen |

El cambio de estado llega por `viaje:estado_cambiado`.  
El primer ping GPS del conductor dispara automáticamente `CONDUCTOR_ASIGNADO → EN_CAMINO_A_ORIGEN`.

---

## Otros eventos WebSocket del viaje (para el dashboard)

### `costo:actualizar`
Llega ~cada 60 segundos con el costo acumulado en tiempo real.
```json
{
  "precio_acumulado": 1750,
  "desglose": {
    "precio_por_tiempo": 1750,
    "precio_por_distancia": null,
    "tiempo_horas": 0.5,
    "distancia_km": 8.2,
    "tarifa_hora": 3500,
    "tarifa_km": null,
    "es_hora_pico": false
  }
}
```

### `alerta:desvio`
El conductor se alejó más de 300m de la ruta.
```json
{ "id_viaje": 42, "distancia_metros": 450, "mensaje": "El conductor se desvio 450m de la ruta" }
```

### `alerta:parada`
El conductor lleva más de 5 minutos detenido fuera de una parada. Solo en zonas CABA y MIXTO.
```json
{ "id_viaje": 42, "minutos_detenido": 7, "mensaje": "El conductor lleva 7 minutos detenido" }
```

### `viaje:finalizado`
Se confirma la última parada por proximidad GPS (el QR salió el 19-08). El viaje se cierra automáticamente.
```json
{
  "id_viaje": 42,
  "precio_real": 1750.00,
  "desglose": { ... },
  "remito_url": "https://pub.r2.example.com/remitos/42.pdf"
}
```

---

## Costo acumulado por REST (alternativa o fallback)

Si el WebSocket no está disponible, se puede consultar manualmente:

```
GET /api/viajes/:id/costo-acumulado
Authorization: Bearer <firebase-id-token>
```

Respuesta:
```json
{
  "precio_acumulado": 1837.5,
  "desglose": {
    "precio_por_tiempo": 1750,
    "precio_por_distancia": 87.5,
    "tiempo_horas": 0.5,
    "distancia_km": 8.75,
    "tarifa_hora": 3500,
    "tarifa_km": 10,
    "es_hora_pico": false
  }
}
```

---

## Notas para Claude Code

- El componente `MapaViajeActivo` es un Client Component (`'use client'`). No puede usarse en Server Components directamente — importarlo con `dynamic` si hace falta:
  ```ts
  const MapaViajeActivo = dynamic(() => import('@/components/MapaViajeActivo').then(m => m.MapaViajeActivo), { ssr: false })
  ```
- `useJsApiLoader` no recarga el SDK si ya fue cargado en otra instancia — es seguro usarlo en múltiples componentes.
- El socket se desconecta en el `cleanup` del `useEffect` para evitar listeners duplicados si el componente se re-monta.
- `mapRef.current?.panTo()` mueve el mapa sin cambiar el zoom ni disparar re-renders — preferible a actualizar `center` como prop.
- El backend guarda las últimas 20 coords en Redis. Si el usuario abre el dashboard con el viaje ya en curso, no hay evento de "posición inicial" — conviene llamar a `GET /api/viajes/:id` primero para tener la última posición conocida desde las paradas, y esperar el primer `mapa:actualizar` para la posición real.