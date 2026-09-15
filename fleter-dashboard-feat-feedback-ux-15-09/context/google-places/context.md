
# Fleter — Google Places Autocomplete
## Componente AddressInput con Google Places API (New)
**Estado: ✅ Implementado**

---

## Resumen de implementación

### Dependencias instaladas
```
use-places-autocomplete
@vis.gl/react-google-maps
```

### Archivos modificados/creados

| Archivo | Cambio |
|---|---|
| `app/layout.tsx` | Wrappea toda la app con `<APIProvider apiKey={NEXT_PUBLIC_GOOGLE_MAPS_KEY}>` |
| `components/AddressInput.tsx` | Componente nuevo con autocomplete |
| `app/(cliente)/pedir-viaje/page.tsx` | Usa `AddressInput`, envía coordenadas reales |

### Variable de entorno
```
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIza...   # ya estaba en .env.local
```

---

## Componente AddressInput (`components/AddressInput.tsx`)

**Props:**
```ts
interface AddressInputProps {
  placeholder: string;
  value: string;
  onChange: (text: string) => void;      // keystroke libre, resetea coords
  onSelect: (place: { address: string; lat: number; lng: number }) => void;
  onClear: () => void;                   // cuando borra texto, notifica que coords son inválidas
}
```

**Comportamiento:**
- `usePlacesAutocomplete` con `componentRestrictions: { country: "ar" }`, `language: "es"`, `debounce: 300ms`
- Dropdown con sugerencias bajo el input (z-index: 50)
- Al seleccionar: `getGeocode` + `getLatLng` → llama `onSelect` con lat/lng reales
- Click fuera → cierra dropdown
- Estilos coherentes con design system (variables CSS `var(--surface)`, `var(--ink)`, etc.)

**Restricciones importantes (Places API New):**
- NO usar `AutocompleteService` — deprecada desde marzo 2025
- NO usar campo `"geometry"` — el campo correcto es `"location"`
- NO geocodificar sin debounce

---

## Cambios en pedir-viaje

### Interface Parada
```ts
interface Parada {
  id: number;
  direccion: string;
  lat: number | null;   // null hasta que el user seleccione de la lista
  lng: number | null;
}
```

### Validación en submit
```ts
if (paradas.some((p) => p.lat === null || p.lng === null)) {
  setError("Seleccioná cada dirección de la lista de sugerencias para obtener las coordenadas.");
  return;
}
```

### Payload enviado al backend
```ts
paradas: paradas.map((p) => ({ lat: p.lat!, lng: p.lng!, direccion: p.direccion.trim() }))
```

---

## Criterios de aceptación

- [x] Input muestra sugerencias reales de Google Places mientras el usuario escribe
- [x] Sugerencias restringidas a Argentina
- [x] Al seleccionar, `onSelect` recibe `{ address, lat, lng }` con números válidos
- [x] Debounce de 300ms — no se hacen llamadas en cada keystroke
- [x] Si el usuario borra el texto, las sugerencias desaparecen y coords se resetean a null
- [x] Funciona con múltiples instancias en el mismo formulario (origen, destino, paradas)
- [x] Submit sin seleccionar de la lista → error informativo
