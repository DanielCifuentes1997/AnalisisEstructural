"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "../components/ui/Spinner";
import { useAuthStore } from "../lib/auth-store";
import { useHasMounted } from "../lib/hooks/use-has-mounted";

export default function RootPage() {
  const router = useRouter();
  const hasMounted = useHasMounted();
  const accessToken = useAuthStore((state) => state.accessToken);
  const role = useAuthStore((state) => state.user?.role);

  useEffect(() => {
    if (!hasMounted) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    router.replace(role === "VOLUNTEER" ? "/volunteer/map" : "/dashboard");
  }, [hasMounted, accessToken, role, router]);

  return <Spinner />;
}
