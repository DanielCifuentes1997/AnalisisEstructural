"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ADMIN_NAV } from "../../../../components/admin/nav";
import { AppHeader } from "../../../../components/ui/AppHeader";
import { Card } from "../../../../components/ui/Card";
import { Spinner } from "../../../../components/ui/Spinner";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { apiClient } from "../../../../lib/api-client";
import { useAuthStore } from "../../../../lib/auth-store";
import { useRequireAdminRole } from "../../../../lib/hooks/use-require-admin-role";

export default function AdminConversationsPage() {
  const isAdmin = useRequireAdminRole();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["admin", "conversations"],
    queryFn: () => apiClient.listAdminConversations(accessToken as string),
    enabled: Boolean(accessToken),
  });

  const { data: detail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["admin", "conversation", openId],
    queryFn: () =>
      apiClient.getAdminConversation(accessToken as string, openId as string),
    enabled: Boolean(accessToken) && Boolean(openId),
  });

  if (!isAdmin) return <Spinner label="Verificando permisos..." />;

  return (
    <div className="min-h-screen bg-sand-50">
      <AppHeader subtitle="Administración" homeHref="/admin" nav={ADMIN_NAV} />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-sand-900">
          Conversaciones
        </h1>
        <p className="mb-6 text-sm text-sand-600">
          Puedes leer los chats para detectar intentos de estafa o
          comportamientos indebidos. Los participantes no reciben tus lecturas.
        </p>

        {isLoading && <Spinner label="Cargando conversaciones..." />}

        {conversations && conversations.length === 0 && (
          <Card className="text-center">
            <p className="text-sm text-sand-600">
              Todavía no hay conversaciones con mensajes.
            </p>
          </Card>
        )}

        <div className="flex flex-col gap-3">
          {conversations?.map((conversation) => (
            <Card key={conversation.visit_id}>
              <button
                className="flex w-full items-start justify-between gap-3 text-left"
                onClick={() =>
                  setOpenId(
                    openId === conversation.visit_id
                      ? null
                      : conversation.visit_id,
                  )
                }
              >
                <div className="min-w-0">
                  <p className="font-medium text-sand-900">
                    {conversation.citizen_name} ↔ {conversation.volunteer_name}
                  </p>
                  <p className="text-xs text-sand-500">
                    {conversation.messages_count} mensajes ·{" "}
                    {new Date(conversation.created_at).toLocaleDateString(
                      "es-CO",
                    )}
                    {conversation.released_at ? " · caso liberado" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge state={conversation.request_state} />
                  <span className="text-sand-400">
                    {openId === conversation.visit_id ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {openId === conversation.visit_id && (
                <div className="mt-4 border-t border-sand-100 pt-4">
                  {isLoadingDetail && <Spinner label="Cargando mensajes..." />}
                  {detail && (
                    <div className="flex flex-col gap-2">
                      {detail.messages.length === 0 && (
                        <p className="text-sm text-sand-500">Sin mensajes.</p>
                      )}
                      {detail.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${
                            message.sender_role === "VOLUNTEER"
                              ? "self-end bg-brand-50 text-sand-900"
                              : "self-start bg-sand-100 text-sand-900"
                          }`}
                        >
                          <p className="text-xs font-semibold text-sand-500">
                            {message.author}
                            {message.sender_role === "VOLUNTEER"
                              ? " (analista)"
                              : ""}
                          </p>
                          <p className="whitespace-pre-wrap text-sm">
                            {message.body}
                          </p>
                          <p className="mt-1 text-[10px] text-sand-400">
                            {new Date(message.created_at).toLocaleString(
                              "es-CO",
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
