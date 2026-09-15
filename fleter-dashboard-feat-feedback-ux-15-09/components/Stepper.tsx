/** Barra de pasos del registro del conductor. `actual` es 0-based. */
export default function Stepper({ pasos, actual }: { pasos: string[]; actual: number }) {
  return (
    <ol className="stepper" aria-label="Pasos del registro">
      {pasos.map((label, i) => (
        <li
          key={label}
          className={`stepper__step${i < actual ? " is-done" : ""}${i === actual ? " is-active" : ""}`}
          aria-current={i === actual ? "step" : undefined}
        >
          <span className="stepper__bar" />
          <span className="stepper__label">
            <span className="stepper__num">{String(i + 1).padStart(2, "0")}</span>
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

export const PASOS_REGISTRO_CONDUCTOR = ["Datos personales", "Licencia", "Cuenta", "Vehículo"];
