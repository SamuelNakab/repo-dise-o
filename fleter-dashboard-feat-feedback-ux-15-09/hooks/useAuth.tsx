"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  onIdTokenChanged,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { api } from "@/lib/api";
import { MOCK } from "@/lib/config";
import type { Rol } from "@/lib/roles";

interface UserProfile {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  empresa?: string;
  cuit?: string;
  rol: Rol;
}

interface RegisterData {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  empresa: string;
  cuit: string;
  password: string;
}

interface RegisterConductorData {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  password: string;
  telefono?: string;
  nro_licencia: string;
  licencia_vencimiento: string;
}

interface RegisterGerenteData {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  password: string;
  telefono?: string;
  cuit_empresa: string;
  nombre_empresa: string;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  role: Rol | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<string>;
  loginWithGoogle: () => Promise<string>;
  register: (data: RegisterData) => Promise<void>;
  registerConductor: (data: RegisterConductorData) => Promise<void>;
  registerGerente: (data: RegisterGerenteData) => Promise<void>;
  logout: () => Promise<void>;
  sendRecovery: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const MOCK_ROLE = (process.env.NEXT_PUBLIC_MOCK_ROLE ?? "CLIENTE") as UserProfile["rol"];

const MOCK_PROFILE: UserProfile = {
  id: "mock-1",
  nombre: "Joaquín",
  apellido: "Test",
  email: "joaco@fleter.com",
  empresa: "PyME Demo S.A.",
  cuit: "20-12345678-9",
  rol: MOCK_ROLE,
};

async function setCookieToken(token: string) {
  await fetch("/api/auth/cookie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

async function clearCookieToken() {
  await fetch("/api/auth/cookie", { method: "DELETE" });
}

async function fetchProfile(): Promise<UserProfile> {
  return api.get<UserProfile>("/api/auth/me");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    // En modo MOCK el estado inicial se deriva de la cookie con un lazy
    // initializer (no en un efecto de montaje). Guardado con typeof document
    // para no romper el render en el servidor (SSR).
    if (MOCK) {
      const hasCookie =
        typeof document !== "undefined" && document.cookie.includes("token=mock");
      return {
        user: null,
        profile: hasCookie ? MOCK_PROFILE : null,
        role: hasCookie ? MOCK_ROLE : null,
        loading: false,
      };
    }
    return { user: null, profile: null, role: null, loading: true };
  });

  useEffect(() => {
    // En MOCK el estado ya quedó resuelto en el initializer; no hay suscripción.
    if (MOCK) return;

    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        await clearCookieToken();
        setState({ user: null, profile: null, role: null, loading: false });
        return;
      }
      try {
        const token = await user.getIdToken();
        await setCookieToken(token);
        const profile = await fetchProfile();
        setState({ user, profile, role: profile.rol, loading: false });
      } catch {
        setState({ user, profile: null, role: null, loading: false });
      }
    });

    return unsub;
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string> => {
    if (MOCK) {
      document.cookie = "token=mock; path=/; max-age=3600";
      setState({ user: null, profile: MOCK_PROFILE, role: MOCK_ROLE, loading: false });
      fetch("/api/analytics/cliente/resumen").catch(() => {});
      return MOCK_ROLE;
    }
    const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    const token = await cred.user.getIdToken();
    await api.post("/api/auth/login", { idToken: token });
    await setCookieToken(token);
    const profile = await fetchProfile();
    setState({ user: cred.user, profile, role: profile.rol, loading: false });
    fetch("/api/analytics/cliente/resumen").catch(() => {});
    return profile.rol;
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<string> => {
    if (MOCK) {
      document.cookie = "token=mock; path=/; max-age=3600";
      setState({ user: null, profile: MOCK_PROFILE, role: MOCK_ROLE, loading: false });
      fetch("/api/analytics/cliente/resumen").catch(() => {});
      return MOCK_ROLE;
    }
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(getFirebaseAuth(), provider);
    const token = await cred.user.getIdToken();
    await api.post("/api/auth/login", { idToken: token });
    await setCookieToken(token);
    const profile = await fetchProfile();
    setState({ user: cred.user, profile, role: profile.rol, loading: false });
    fetch("/api/analytics/cliente/resumen").catch(() => {});
    return profile.rol;
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    if (MOCK) {
      return;
    }
    await api.post("/api/auth/registro-cliente", {
      nombre: data.nombre,
      apellido: data.apellido,
      dni: data.dni,
      email: data.email,
      contrasena: data.password,
      nombre_empresa: data.empresa,
      cuit: data.cuit,
    });
  }, []);

  const registerConductor = useCallback(async (data: RegisterConductorData) => {
    if (MOCK) return;
    await api.post("/api/auth/registro-conductor", {
      nombre: data.nombre,
      apellido: data.apellido,
      dni: data.dni,
      email: data.email,
      contrasena: data.password,
      telefono: data.telefono,
      nro_licencia: data.nro_licencia,
      licencia_vencimiento: data.licencia_vencimiento,
    });
    const cred = await signInWithEmailAndPassword(getFirebaseAuth(), data.email, data.password);
    const token = await cred.user.getIdToken();
    await setCookieToken(token);
    const profile = await fetchProfile();
    setState({ user: cred.user, profile, role: profile.rol, loading: false });
  }, []);

  const registerGerente = useCallback(async (data: RegisterGerenteData) => {
    if (MOCK) return;
    // El backend crea el gerente y su primera empresa (con codigo_afiliacion)
    // en una sola operación.
    await api.post("/api/auth/registro-gerente", {
      nombre: data.nombre,
      apellido: data.apellido,
      dni: data.dni,
      email: data.email,
      contrasena: data.password,
      telefono: data.telefono,
      cuit_empresa: data.cuit_empresa,
      nombre_empresa: data.nombre_empresa,
    });
    const cred = await signInWithEmailAndPassword(getFirebaseAuth(), data.email, data.password);
    const token = await cred.user.getIdToken();
    await setCookieToken(token);
    const profile = await fetchProfile();
    setState({ user: cred.user, profile, role: profile.rol, loading: false });
  }, []);

  const logout = useCallback(async () => {
    if (MOCK) {
      document.cookie = "token=; path=/; max-age=0";
      setState({ user: null, profile: null, role: null, loading: false });
      return;
    }
    await signOut(getFirebaseAuth());
    await clearCookieToken();
    setState({ user: null, profile: null, role: null, loading: false });
  }, []);

  const sendRecovery = useCallback(async (email: string) => {
    if (MOCK) return;
    await sendPasswordResetEmail(getFirebaseAuth(), email);
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, loginWithGoogle, register, registerConductor, registerGerente, logout, sendRecovery }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
