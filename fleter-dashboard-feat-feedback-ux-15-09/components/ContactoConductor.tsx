"use client";

import { useState } from "react";
import { Phone, MessageCircle, Copy, Check } from "lucide-react";

/**
 * Contacto por teléfono que funciona también en desktop. Un `tel:` pelado no
 * hace nada en una compu sin softphone, así que el número queda siempre a la
 * vista, se puede copiar, y hay salida por WhatsApp (que abre web o app).
 */
export default function ContactoConductor({
  telefono,
  etiqueta = "Llamar",
  compacto = false,
}: {
  telefono: string | null | undefined;
  etiqueta?: string;
  compacto?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);

  if (!telefono) {
    return <p className="contacto__vacio">Sin teléfono cargado</p>;
  }

  const soloDigitos = telefono.replace(/\D/g, "");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(telefono!);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sin permiso de portapapeles: el número igual está visible para copiar a mano.
    }
  }

  return (
    <div className={`contacto${compacto ? " contacto--compacto" : ""}`}>
      <span className="contacto__numero">{telefono}</span>
      <div className="contacto__acciones">
        <a href={`tel:${telefono}`} className="contacto__btn" title={etiqueta}>
          <Phone size={14} />
          {!compacto && <span>{etiqueta}</span>}
        </a>
        <a
          href={`https://wa.me/${soloDigitos}`}
          target="_blank"
          rel="noopener noreferrer"
          className="contacto__btn contacto__btn--wa"
          title="WhatsApp"
        >
          <MessageCircle size={14} />
          {!compacto && <span>WhatsApp</span>}
        </a>
        <button type="button" className="contacto__btn contacto__btn--ghost" onClick={copiar} title="Copiar número">
          {copiado ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}
