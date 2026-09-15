# PROPUESTA — Contrato único de API

> **Esto es una propuesta. No se aplicó nada.** El contrato es compartido con el
> backend, así que `context/api-contracts/context.md` no se tocó.
> Fecha: 12-08-2026.

---

## 0. El hallazgo que ordena todo lo demás

`context/model/context.md` **no es un modelo de datos.** Es una copia vieja del
contrato de API. Los dos archivos empiezan con la misma línea, que es un mensaje de
chat pegado sin querer:

- `context/model/context.md:1`
- `context/api-contracts/context.md:1`

> "El API.md que tenés mezcló contenido del CLAUDE.md adentro. Acá está el API.md
> correcto y completo hasta Fase 3. Reemplazás todo el contenido del archivo con esto:"

Los dos siguen con `markdown# Fleter — Contrato de API` (la palabra `markdown` del
fence quedó pegada al `#`) y la misma frase "Documento de referencia para el equipo
mobile y web".

Consecuencias verificadas:

- **No hay modelo de datos en el repo.** `context/model/context.md` no menciona
  Prisma, schema, tabla ni entidad: `grep -i "prisma\|schema\|tabla\|entidad"` no
  devuelve nada en sus 1498 líneas. Sus secciones son `Autenticación`, `GET /health`,
  `/auth`, `/viajes`, `WebSockets` y `Convenciones generales`: es un contrato.
- **`model/` es el snapshot viejo** (1498 líneas, termina en la Fase 4 de GPS) y
  `api-contracts/` es el nuevo (2650 líneas, con Fase 5, `/admin` y la estructura
  jerárquica de empresas).
- **`API.md` no existe en este repo**, ni en el árbol de trabajo ni en el historial:
  `find . -name API.md` y `git log --all -- "*API.md"` vienen vacíos. Es el archivo
  del que hablan los dos preámbulos, y vive en otro repo (mobile/backend). Acá **hay
  dos fuentes, no tres.**

Todo lo que sigue como "discrepancia entre los dos docs" es en realidad **deriva de
versión**: el mismo documento en dos momentos distintos.

---

## 1. Discrepancias entre `model/` y `api-contracts/`

### 1.1 `vehiculo` en `viaje:conductor_asignado` — ¿nullable o no? (el pedido explícito)

| Archivo | Línea | Dice |
|---|---|---|
| `context/model/context.md` | 1497-1498 | "El campo `vehiculo` en `viaje:conductor_asignado` **puede ser `null`** si el conductor no tiene vehículo registrado en la DB (se resuelve en Fase 4)" |
| `context/api-contracts/context.md` | 2626 | "El campo `vehiculo` en `viaje:conductor_asignado` **siempre es un objeto no nulo** — si el conductor no tiene vehículo elegible el servidor emite `error` antes de asignar el viaje" |

Se contradicen de frente. Los payloads de ejemplo de los dos (`model:1008-1013`,
`api-contracts:845-850`) muestran el objeto completo, así que el ejemplo no
desempata.

**Lectura:** `model/` se marca a sí mismo como provisorio ("se resuelve en Fase 4") y
`api-contracts/` es posterior a la Fase 4. Gana el **no nulo**.

**Riesgo en el front:** no hay ninguno hoy. El único listener de
`viaje:conductor_asignado` está en `app/(conductor)/conductor/page.tsx` y el cliente
no lo escucha (`ESTADO-REAL.md:29`). Pero si mañana se tipa el payload creyendo a
`model/`, se agrega un `| null` que el backend nunca manda.

### 1.2 Quién dispara `EN_CAMINO_A_ORIGEN`

| Archivo | Línea | Dice |
|---|---|---|
| `model/context.md` | 1305 | "Si el viaje estaba en `CONDUCTOR_ASIGNADO` y es el primer ping: **cambia automáticamente** a `EN_CAMINO_A_ORIGEN`" |
| `model/context.md` | 1469 | Tabla de estados: "`EN_CAMINO_A_ORIGEN` \| Primer ping GPS recibido (automático)" |
| `api-contracts/context.md` | 994-1064 | `POST /api/viajes/:id/iniciar`: "Es la **única** forma de pasar de `CONDUCTOR_ASIGNADO` a `EN_CAMINO_A_ORIGEN`: el inicio automático por primer ping GPS **ya no existe**" |
| `api-contracts/context.md` | 1269-1272, 1291 | Un ping en `CONDUCTOR_ASIGNADO` se rechaza con `"El viaje no fue iniciado"` y no tiene efectos |

Cambio de comportamiento completo, no matiz. `model/` describe el sistema anterior.

### 1.3 Auto-cancelación por timeout de matching

| Archivo | Línea | Dice |
|---|---|---|
| `model/context.md` | 1129-1136 | `viaje:cancelado_sin_conductor`: "cuando nadie acepta el viaje dentro del tiempo límite (10 minutos por defecto)" |
| `api-contracts/context.md` | 902-906 | "**Obsoleto — el servidor ya no lo emite.** El mecanismo de auto-cancelación por timeout de matching fue **eliminado por completo**" |

### 1.4 Estados válidos en `PATCH /api/viajes/:id/estado`

| Archivo | Línea | Dice |
|---|---|---|
| `model/context.md` | 1171 | "Estados válidos para este endpoint: `CARGANDO`, `DESCARGANDO`" |
| `api-contracts/context.md` | 952 | "`CARGANDO`, **`EN_RUTA`**, `DESCARGANDO`" + validación contra máquina de estados |

### 1.5 Cantidad de estados del viaje

`model/context.md:1462-1470` lista el flujo **sin `RESERVADO_POR_EMPRESA`**: el
string no aparece una sola vez en todo el archivo. `api-contracts/context.md:2627`
lista los nueve, y `lib/estados.ts:9-19` (el código) también tiene los nueve.
`model/` es anterior a toda la estructura de empresas.

### 1.6 Superficie que `model/` directamente no tiene

No están en `model/` y sí en `api-contracts/`: `/admin` (`:2090`), toda la sección de
empresas/flota/afiliaciones (`:2451`), `GET /api/empresas/:id/viajes-disponibles`
(`:2516`), la Fase 5 de confirmación y remito (`:1814`), `POST /api/viajes/:id/iniciar`
(`:994`), y el cálculo de zona server-side (`:275-291`).

### 1.7 Base URL de desarrollo

Los dos preámbulos dicen `http://localhost:3000` (`model:8`, `api-contracts:5`), pero
el front default apunta a `http://localhost:3001` (`lib/config.ts:1`,
`app/api/analytics/cliente/resumen/route.ts:5`). El sospechoso es el contrato: el
3000 es el puerto donde levanta Next (`README.md:15`), así que el backend no puede
estar ahí al mismo tiempo.

---

## 2. Discrepancias entre el contrato y lo que el front realmente hace

Acá el contrato es `api-contracts/context.md` (el vigente).

### 2.1 Registro de cliente

| Campo | Contrato (`:60-90`) | Front | Archivo |
|---|---|---|---|
| `cuit` | **opcional** | **obligatorio** (`required`) | `app/(auth)/registro/page.tsx:81` |
| `nombre_empresa` | **opcional** | **obligatorio** (`required`) | `app/(auth)/registro/page.tsx:76` |
| `contrasena` | mínimo **6** | mínimo **8** (`minLength={8}`) | `app/(auth)/registro/page.tsx:86` |
| `telefono` | opcional, aceptado | **nunca se manda**: no hay campo en el form | `hooks/useAuth.tsx:194-203` |
| `direccion_principal` | opcional, aceptado | **nunca se manda** | ídem |

El mínimo de 8 es más estricto que el backend, así que no rompe. Los dos campos
obligatorios sí son una decisión de producto tomada en el form y no escrita en
ningún lado: el registro dice "Para empresas que contratan fletes"
(`app/(auth)/registro/page.tsx:50`) y fuerza empresa y CUIT, mientras el contrato los
trata como datos sueltos y opcionales del usuario.

### 2.2 `PUT /api/auth/perfil` — el front manda tres campos que no existen

El contrato (`:239-246`) acepta **solo** `nombre`, `apellido`, `telefono`. El front
manda además `empresa`, `cuit` y `direccion`:

```
app/(cliente)/perfil/page.tsx:113-118
  nombre, apellido, telefono, empresa, cuit, direccion
```

Peor: el front **espera leerlos de vuelta**. `PerfilData`
(`app/(cliente)/perfil/page.tsx:6-17`) declara `empresa?`, `cuit?` y `direccion?`,
pero ni la respuesta de `PUT /api/auth/perfil` (`:249-261`) ni la de
`GET /api/auth/me` (`:211-223`) los incluyen. Hoy esos tres campos del perfil se
editan contra el vacío: no hay evidencia de que el backend los persista ni los
devuelva.

### 2.3 Creación de viaje

| Campo | Contrato (`:392-416`) | Front (`app/(cliente)/pedir-viaje/page.tsx:104-113`) |
|---|---|---|
| `zona` | se acepta y **se ignora** (`:405`) | ya **no se manda** — correcto |
| `paradas` | mínimo 2, `{lat,lng,direccion}` | igual |
| `fecha_programada` | ISO, > 1 h | igual (mínimo validado en el front, `:31-36`) |
| `condiciones_requeridas` | opcional, 5 valores | igual |
| `descripcion` | opcional, ≤500 chars, visible al conductor y en el remito | **no existe en el formulario**: el campo nunca se manda |

`descripcion` es el único lugar donde el cliente podría decir algo sobre la carga
(`ESTADO-REAL.md:132-146`) y la UI no lo expone.

### 2.4 Otras, ya registradas en `ESTADO-REAL.md`

`POST /api/viajes/estimar-costo` está documentado (`:322`) y **no se llama desde
ningún archivo** del repo; `POST /api/viajes/:id/calificacion` (`:1979`) tampoco.
~~Los endpoints de QR quedaron sin uso y además contradicen `OPEN.md` → **D5**.~~
**RESUELTO el 19-08:** el backend eliminó `GET /api/viajes/:id/qr-paradas` y el
campo `qr_firmado`; `confirmar-parada` ahora valida por proximidad GPS. Sigue
faltando la foto del remito conformado, que es el resto de D5.

---

## 3. Propuesta

1. **`context/api-contracts/context.md` es la única fuente de verdad.** Es el
   documento vivo, el que el backend actualiza y el que ya coincide con
   `lib/estados.ts`.

2. **`context/model/context.md` se convierte en índice.** No se borra: se reemplaza
   su contenido por un puntero de tres líneas al contrato, más la nota de que el
   modelo de datos real vive en el repo del backend (Prisma) y no acá. Hoy su único
   efecto es hacer que alguien lea la versión de hace tres fases y tipee un
   `vehiculo | null` que no existe.

3. **`API.md` no se crea acá.** Es el archivo del equipo mobile/backend. Si hace
   falta referenciarlo, que sea un link, no una copia — copiar es exactamente cómo
   nacieron estos dos archivos desincronizados.

4. **Sacar el preámbulo de chat** de la línea 1 de los dos archivos, y el
   `markdown#` pegado de la línea 2. Es una línea que le dice al lector que
   reemplace el contenido del archivo por lo que sigue.

5. **Pedirle al backend** que resuelva: el `null` de `vehiculo` (§1.1, para poder
   tipar), el `localhost:3000` vs `3001` (§1.7), y si `empresa`/`cuit`/`direccion`
   se persisten o no en el perfil (§2.2) — que es la única discrepancia de esta lista
   que puede estar perdiendo datos del usuario hoy.
