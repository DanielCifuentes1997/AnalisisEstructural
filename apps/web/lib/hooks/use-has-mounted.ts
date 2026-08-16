"use client";

import { useEffect, useState } from "react";

// Evita el mismatch SSR/cliente para estado persistido (localStorage no
// existe en el servidor). No depende del callback onRehydrateStorage de
// Zustand, que no se disparaba de forma confiable en esta combinacion
// de Next.js 16 + Turbopack + React 19.
export function useHasMounted(): boolean {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
}
