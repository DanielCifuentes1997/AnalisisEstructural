"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../auth-store";

// El (protected)/layout.tsx ya garantiza que hay sesion; esto ademas
// exige que el rol sea VOLUNTEER, redirigiendo al registro si no.
export function useRequireVolunteerRole() {
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role);

  useEffect(() => {
    if (role && role !== "VOLUNTEER") {
      router.replace("/volunteer/register");
    }
  }, [role, router]);

  return role === "VOLUNTEER";
}
