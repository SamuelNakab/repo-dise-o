"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getAuthToken } from "@/lib/firebase";
import { BASE_URL, MOCK } from "@/lib/config";

export function useSocket() {
  // El socket se expone vía state (no un ref leído en el render): así los
  // consumidores que dependen de `socket` re-renderizan cuando conecta.
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (MOCK) return;

    let cancelled = false;
    let s: Socket;

    async function connect() {
      try {
        const token = await getAuthToken();
        if (cancelled) return;
        s = io(BASE_URL, {
          auth: { token: token ? `Bearer ${token}` : "" },
          transports: ["websocket", "polling"],
        });

        s.on("connect", () => setConnected(true));
        s.on("disconnect", () => setConnected(false));

        setSocket(s);
      } catch {
        if (!cancelled) setError("No se pudo conectar al servidor.");
      }
    }

    connect();

    return () => {
      cancelled = true;
      s?.disconnect();
      setSocket(null);
    };
  }, []);

  return { socket, connected, error };
}
