"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../auth-store";

// El (protected)/layout.tsx ya garantiza que hay sesion; esto ademas
// exige rol ADMIN. A diferencia del hook de voluntario, aqui no hay
// pantalla de registro a donde mandar a nadie: el admin se crea solo
// desde ADMIN_PHONES, asi que quien no lo sea vuelve a su propia area.
export function useRequireAdminRole() {
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role);

  useEffect(() => {
    if (!role || role === "ADMIN") return;
    router.replace(role === "VOLUNTEER" ? "/volunteer" : "/dashboard");
  }, [role, router]);

  return role === "ADMIN";
}
