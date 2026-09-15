import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { initializeAuth, browserSessionPersistence, type Auth } from "firebase/auth";

let _auth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    const app: FirebaseApp =
      getApps().length === 0
        ? initializeApp({
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          })
        : getApps()[0];
    _auth = initializeAuth(app, { persistence: browserSessionPersistence });
  }
  return _auth;
}

export async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

/**
 * Atajo de desarrollo para sacar el ID token desde la consola del browser y
 * poder pegarlo en `scripts/verificar-staging.mjs`:
 *
 *     await __fleterToken()
 *
 * Sólo existe en `next dev`. En el build de producción `NODE_ENV` es
 * `"production"`, la rama se elimina en compilación y `window` queda limpia.
 */
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  (window as unknown as { __fleterToken: () => Promise<string | null> })
    .__fleterToken = getAuthToken;
}
