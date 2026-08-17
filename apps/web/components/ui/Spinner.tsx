export function Spinner({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8 text-sand-500">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-sand-300 border-t-brand-600" />
      <span>{label}</span>
    </div>
  );
}
