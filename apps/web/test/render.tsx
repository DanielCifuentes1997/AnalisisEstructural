import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender, type RenderResult } from "@testing-library/react";

/**
 * Render con los providers que la app monta en produccion. Varios
 * componentes usan React Query directamente, y sin el provider revientan
 * con un error que no tiene nada que ver con lo que se esta probando.
 */
// El tipo se anota a mano: TypeScript no puede nombrar el inferido sin
// referirse a una ruta interna de node_modules.
export function renderWithProviders(ui: ReactElement): RenderResult {
  const client = new QueryClient({
    defaultOptions: {
      // Sin reintentos: una prueba que falla debe fallar de una, no
      // esperar tres intentos.
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  return rtlRender(ui, { wrapper: Wrapper });
}
