"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import type { Empresa } from "@/lib/types-empresa";

const STORAGE_KEY = "fleter:empresa-activa";

interface EmpresaContextValue {
  empresas: Empresa[];
  /** Empresa sobre la que operan todas las pantallas del gerente. */
  empresaActiva: Empresa | null;
  setEmpresaActiva: (id: number) => void;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const EmpresaContext = createContext<EmpresaContextValue | null>(null);

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [activaId, setActivaId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const aplicar = useCallback((data: Empresa[]) => {
    setEmpresas(data);
    setError(null);
    // Elige la empresa activa: la guardada si sigue existiendo, si no la primera.
    const guardada = Number(localStorage.getItem(STORAGE_KEY));
    const sigueExistiendo = data.some((e) => e.id_empresa === guardada);
    setActivaId(sigueExistiendo ? guardada : data[0]?.id_empresa ?? null);
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      aplicar(await api.get<Empresa[]>("/api/empresas/mias"));
    } catch (err) {
      setError((err as Error).message);
      setEmpresas([]);
    } finally {
      setLoading(false);
    }
  }, [aplicar]);

  // La carga inicial va inline (y no vía `refetch`) para no llamar a setState de
  // forma síncrona dentro del efecto — lo prohíbe react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false;
    api
      .get<Empresa[]>("/api/empresas/mias")
      .then((data) => {
        if (!cancelled) aplicar(data);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setEmpresas([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [aplicar]);

  const setEmpresaActiva = useCallback((id: number) => {
    setActivaId(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  }, []);

  const empresaActiva = empresas.find((e) => e.id_empresa === activaId) ?? null;

  return (
    <EmpresaContext.Provider
      value={{ empresas, empresaActiva, setEmpresaActiva, loading, error, refetch }}
    >
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa(): EmpresaContextValue {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error("useEmpresa must be used inside EmpresaProvider");
  return ctx;
}
