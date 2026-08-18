"use client";

import { useEffect, useRef, useState } from "react";
import { CHAT_SAFETY_NOTICE } from "@proyecto/shared-types";
import { ApiError } from "../../lib/api-client";
import { useConversation, useSendMessage } from "../../lib/hooks/use-chat";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { ReportAnalystDialog } from "./ReportAnalystDialog";
import {
  formatVisitDate,
  ProposalBubble,
  ProposeDateForm,
} from "./VisitDateProposal";

interface ChatPanelProps {
  visitId: string;
  // Solo el ciudadano puede reportar: es quien abre su casa.
  canReport?: boolean;
}

export function ChatPanel({ visitId, canReport = false }: ChatPanelProps) {
  const { data: conversation, isLoading, isError } = useConversation(visitId);
  const sendMessage = useSendMessage(visitId);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageCount = conversation?.messages.length ?? 0;

  // Al llegar un mensaje nuevo, bajar solo hasta el final.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageCount]);

  const handleSend = () => {
    const body = draft.trim();
    if (!body) return;
    sendMessage.mutate({ body }, { onSuccess: () => setDraft("") });
  };

  if (isLoading) return <Spinner label="Cargando conversacion..." />;
  if (isError || !conversation) {
    return (
      <p className="text-sm text-red-600">No pudimos cargar la conversación.</p>
    );
  }

  const errorMessage =
    sendMessage.error instanceof ApiError ? sendMessage.error.message : undefined;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white">
      <div className="flex items-center gap-3 border-b border-sand-200 px-4 py-3">
        {conversation.counterpart.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage
          <img
            src={conversation.counterpart.photo_url}
            alt={conversation.counterpart.name}
            className="h-10 w-10 rounded-full border border-sand-200 object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sand-200 text-sm font-semibold text-sand-600">
            {conversation.counterpart.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-medium text-sand-900">
            {conversation.counterpart.name}
          </p>
          <p className="text-xs text-sand-500">
            Coordinen aquí el día y la hora de la visita.
          </p>
        </div>
      </div>

      {conversation.scheduled_at && (
        <p className="border-b border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium capitalize text-emerald-900">
          📅 Visita acordada: {formatVisitDate(conversation.scheduled_at)}
        </p>
      )}

      {/* Aviso fijo: es la unica defensa visible contra la estafa. */}
      <p className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs leading-relaxed text-amber-900">
        ⚠ {CHAT_SAFETY_NOTICE}
      </p>

      <div className="flex max-h-96 min-h-48 flex-col gap-2 overflow-y-auto bg-sand-50 p-4">
        {conversation.messages.length === 0 && (
          <p className="my-auto text-center text-sm text-sand-500">
            Todavía no hay mensajes. Escribe el primero para acordar la visita.
          </p>
        )}
        {conversation.messages.map((message) =>
          message.kind === "DATE_PROPOSAL" ? (
            <ProposalBubble
              key={message.id}
              message={message}
              visitId={visitId}
            />
          ) : (
          <div
            key={message.id}
            className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${
              message.is_mine
                ? "self-end bg-brand-700 text-white"
                : "self-start border border-sand-200 bg-white text-sand-900"
            }`}
          >
            <p className="whitespace-pre-wrap text-sm">{message.body}</p>
            <p
              className={`mt-1 text-[10px] ${
                message.is_mine ? "text-brand-100" : "text-sand-400"
              }`}
            >
              {new Date(message.created_at).toLocaleString("es-CO", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          ),
        )}
        <div ref={bottomRef} />
      </div>

      {canReport && (
        <ReportAnalystDialog
          visitId={visitId}
          analystName={conversation.counterpart.name}
        />
      )}

      {conversation.is_closed ? (
        <p className="border-t border-sand-200 px-4 py-3 text-sm text-sand-500">
          Esta conversación está cerrada.
        </p>
      ) : (
        <div className="border-t border-sand-200 p-3">
          {errorMessage && (
            <p className="mb-2 text-sm text-red-600">{errorMessage}</p>
          )}
          {conversation.can_propose_date && (
            <div className="mb-2 flex">
              <ProposeDateForm visitId={visitId} />
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              className="min-h-12 flex-1 resize-none rounded-xl border border-sand-300 px-3 py-3 text-base"
              rows={1}
              placeholder="Escribe un mensaje..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={handleSend}
              isLoading={sendMessage.isPending}
              disabled={!draft.trim()}
              className="px-5"
            >
              Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
