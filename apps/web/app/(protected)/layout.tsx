"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConsentGate } from "../../components/consent/ConsentGate";
import { Spinner } from "../../components/ui/Spinner";
import { useAuthStore } from "../../lib/auth-store";
import { useHasMounted } from "../../lib/hooks/use-has-mounted";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const hasMounted = useHasMounted();
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (hasMounted && !accessToken) {
      router.replace("/login");
    }
  }, [hasMounted, accessToken, router]);

  if (!hasMounted || !accessToken) {
    return <Spinner label="Verificando sesion..." />;
  }

  return <ConsentGate>{children}</ConsentGate>;
}
