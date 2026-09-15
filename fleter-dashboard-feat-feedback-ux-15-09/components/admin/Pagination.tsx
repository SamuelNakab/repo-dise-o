"use client";

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="admin-pagination">
      <button className="btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Anterior
      </button>
      <span className="admin-pagination__info">Página {page} de {totalPages}</span>
      <button className="btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Siguiente →
      </button>
    </div>
  );
}
