"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@proyecto/shared-types";
import { registerSessionHandlers } from "./api-client";

export interface AuthUser {
  id: string;
  phone_number: string;
  role: Role;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (accessToken: string, user: AuthUser) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: (accessToken, user) => set({ accessToken, user }),
      clearSession: () => set({ accessToken: null, user: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    },
  ),
);

// El cliente HTTP renueva el token solo cuando recibe un 401; aqui le
// damos la forma de guardar la sesion nueva (o de cerrarla si el refresh
// tambien vencio) sin que ningun componente tenga que enterarse.
registerSessionHandlers({
  onRefreshed: (accessToken, user) =>
    useAuthStore.getState().setSession(accessToken, user),
  onExpired: () => useAuthStore.getState().clearSession(),
});
