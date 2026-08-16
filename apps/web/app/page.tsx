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

  useEffect(() => {
    if (!hasMounted) return;
    router.replace(accessToken ? "/dashboard" : "/login");
  }, [hasMounted, accessToken, router]);

  return <Spinner />;
}
