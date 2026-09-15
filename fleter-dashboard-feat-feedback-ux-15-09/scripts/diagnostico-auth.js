/**
 * Pegar en la consola del browser (F12) estando en http://localhost:3000
 * DESPUÉS de intentar loguearte.
 *
 * Imprime el cuerpo real de los 401 y de qué proyecto Firebase salió el token.
 * NO imprime el token: sólo los claims públicos (aud/iss/uid/exp).
 */
(async () => {
  const API = "https://nombre-proyecto-back-staging.up.railway.app";

  if (typeof __fleterToken !== "function") {
    console.log("%c__fleterToken no existe. ¿Estás en localhost:3000 con npm run dev?", "color:red");
    return;
  }

  const token = await __fleterToken();
  if (!token) {
    console.log("%cSin sesión de Firebase. Logueate primero y volvé a correr esto.", "color:orange");
    return;
  }

  // --- claims del token (públicos, no es el token) ---
  const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const claims = JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)));
  const ahora = Math.floor(Date.now() / 1000);

  console.log("%c--- Token de Firebase ---", "font-weight:bold");
  console.table({
    "proyecto (aud)": claims.aud,
    "emisor (iss)": claims.iss,
    uid: claims.user_id ?? claims.sub,
    email: claims.email,
    "email_verified": claims.email_verified,
    "vence en (seg)": claims.exp - ahora,
    "reloj local ok": Math.abs(claims.iat - ahora) < 300 ? "sí" : `NO — desfasaje de ${claims.iat - ahora}s`,
  });

  // --- respuestas reales del backend ---
  console.log("%c--- Respuestas de staging ---", "font-weight:bold");
  const probar = async (path, method) => {
    const res = await fetch(API + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(method === "POST" ? { body: "{}" } : {}),
    });
    const cuerpo = await res.text();
    const color = res.ok ? "color:green" : "color:red";
    console.log(`%c${method} ${path} → ${res.status}`, color, cuerpo.slice(0, 200));
    return res.status;
  };

  await probar("/api/auth/login", "POST");
  await probar("/api/auth/me", "GET");

  // --- control: ¿llega el header? ---
  const sinHeader = await fetch(API + "/api/auth/me").then((r) => r.text());
  console.log("%c(control) GET /api/auth/me SIN header →", "color:gray", sinHeader);

  console.log(
    "%cCómo leerlo:\n" +
      '· "Token no proporcionado" con header puesto → algo se come el Authorization (proxy/CORS).\n' +
      '· "Token invalido o expirado" → staging valida contra OTRO proyecto Firebase.\n' +
      `  Compará el aud de arriba (${claims.aud}) con el FIREBASE_PROJECT_ID de Railway.\n` +
      '· 404 "Usuario no registrado" → el token está bien, falta la fila en la DB.',
    "color:#555",
  );
})();
