/*
 * Marcador de posicion del logo. Cuando llegue el archivo real, basta
 * reemplazar el <svg> por un <Image src="/logo.svg" .../>: el tamaño y el
 * espacio reservado ya quedan definidos aqui, asi que nada mas se mueve.
 */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M9.5 21v-5.5h5V21" />
      </svg>
    </span>
  );
}

export function LogoLockup({ subtitle }: { subtitle?: string }) {
  return (
    <span className="flex items-center gap-3">
      <Logo />
      <span className="flex flex-col leading-tight">
        <span className="text-base font-semibold text-sand-900">
          Acompañamiento Comunitario
        </span>
        {subtitle && (
          <span className="text-xs text-sand-500">{subtitle}</span>
        )}
      </span>
    </span>
  );
}
