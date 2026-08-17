"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoLockup } from "../components/ui/Logo";
import { Spinner } from "../components/ui/Spinner";
import { useAuthStore } from "../lib/auth-store";
import { useHasMounted } from "../lib/hooks/use-has-mounted";

export default function RootPage() {
  const router = useRouter();
  const hasMounted = useHasMounted();
  const accessToken = useAuthStore((state) => state.accessToken);
  const role = useAuthStore((state) => state.user?.role);

  // Con sesion activa saltamos la portada y vamos directo al area que
  // corresponde al rol.
  useEffect(() => {
    if (!hasMounted || !accessToken) return;
    router.replace(
      role === "ADMIN"
        ? "/admin"
        : role === "VOLUNTEER"
          ? "/volunteer"
          : "/dashboard",
    );
  }, [hasMounted, accessToken, role, router]);

  if (!hasMounted || accessToken) {
    return <Spinner />;
  }

  return (
    <main className="min-h-screen bg-sand-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-10 flex justify-center">
          <LogoLockup subtitle="Apoyo vecinal tras un sismo" />
        </div>

        <div className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-semibold tracking-tight text-sand-900 sm:text-4xl">
            ¿Tu casa quedó afectada por el sismo?
          </h1>
          <p className="mx-auto max-w-xl text-base text-sand-600">
            Conectamos a quienes necesitan una mirada con vecinos que saben de
            construcción, mientras llega la autoridad competente.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <RoleCard
            href="/login?rol=afectado"
            emoji="🏠"
            title="Soy afectado"
            description="Reporta tu vivienda, sube fotos y recibe el acompañamiento de un analista voluntario."
            cta="Registrarme como afectado"
            featured
          />
          <RoleCard
            href="/login?rol=analista"
            emoji="🛠️"
            title="Soy analista voluntario"
            description="¿Sabes de construcción? Toma casos cerca de ti y acompaña a tus vecinos."
            cta="Registrarme como analista"
          />
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-xs leading-relaxed text-sand-500">
          Este es un canal de acompañamiento comunitario informal. No emite
          dictámenes oficiales ni reemplaza a los organismos de emergencia.
        </p>
      </div>
    </main>
  );
}

function RoleCard({
  href,
  emoji,
  title,
  description,
  cta,
  featured = false,
}: {
  href: string;
  emoji: string;
  title: string;
  description: string;
  cta: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-2xl border p-6 transition-all hover:-translate-y-0.5 hover:shadow-md ${
        featured
          ? "border-brand-200 bg-brand-50"
          : "border-sand-200 bg-white"
      }`}
    >
      <span className="mb-3 text-3xl" aria-hidden>
        {emoji}
      </span>
      <h2 className="mb-2 text-lg font-semibold text-sand-900">{title}</h2>
      <p className="mb-6 flex-1 text-sm leading-relaxed text-sand-600">
        {description}
      </p>
      <span
        className={`inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-medium transition-colors ${
          featured
            ? "bg-brand-700 text-white group-hover:bg-brand-800"
            : "border border-sand-300 bg-white text-sand-900 group-hover:bg-sand-100"
        }`}
      >
        {cta}
      </span>
    </Link>
  );
}
