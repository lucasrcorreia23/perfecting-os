"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EstadoCalculadora } from "@/lib/calculadora/types";

// Autosave contínuo do estado no servidor: debounce ~800 ms, uma requisição
// em voo por vez (a mais nova espera a atual), retry simples e flush com
// keepalive no beforeunload. A pessoa pode fechar e voltar de qualquer
// dispositivo — o link é o estado.

const DEBOUNCE_MS = 800;
const RETRY_MS = 4_000;

export type AutosaveStatus = "idle" | "salvando" | "salvo" | "erro";

export function useAutosave({
  token,
  estado,
  ativo,
  submittedAtInicial,
}: {
  token: string;
  estado: EstadoCalculadora;
  ativo: boolean;
  submittedAtInicial: string | null;
}) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [salvoEm, setSalvoEm] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(submittedAtInicial);

  const estadoRef = useRef(estado);
  const emVooRef = useRef(false);
  const pendenteRef = useRef(false);
  const sujoRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primeiraRenderRef = useRef(true);
  const postRef = useRef<((enviar: boolean) => Promise<boolean>) | null>(null);

  useEffect(() => {
    estadoRef.current = estado;
  }, [estado]);

  const endpoint = `/api/publico/calculadora/${token}/estado`;

  const post = useCallback(
    async (enviar: boolean): Promise<boolean> => {
      if (emVooRef.current) {
        pendenteRef.current = true;
        return false;
      }
      emVooRef.current = true;
      sujoRef.current = false;
      setStatus("salvando");
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: estadoRef.current, enviar }),
        });
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as {
          data?: { saved_at?: string; submitted_at?: string | null };
        };
        setSalvoEm(body.data?.saved_at ?? new Date().toISOString());
        if (body.data?.submitted_at !== undefined) {
          setSubmittedAt(body.data.submitted_at);
        }
        setStatus("salvo");
        return true;
      } catch {
        setStatus("erro");
        sujoRef.current = true;
        // Retry único e espaçado; a próxima digitação também re-agenda.
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => void postRef.current?.(false), RETRY_MS);
        return false;
      } finally {
        emVooRef.current = false;
        if (pendenteRef.current) {
          pendenteRef.current = false;
          void postRef.current?.(false);
        }
      }
    },
    [endpoint],
  );

  useEffect(() => {
    postRef.current = post;
  }, [post]);

  // Debounce nas mudanças de estado (pula a primeira render: nada mudou).
  useEffect(() => {
    if (!ativo) return;
    if (primeiraRenderRef.current) {
      primeiraRenderRef.current = false;
      return;
    }
    sujoRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void post(false), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [estado, ativo, post]);

  // Flush no fechamento da aba: fetch keepalive sobrevive ao unload.
  useEffect(() => {
    function flush() {
      if (!sujoRef.current) return;
      sujoRef.current = false;
      void fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: estadoRef.current, enviar: false }),
        keepalive: true,
      }).catch(() => {});
    }
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [endpoint]);

  // Envio explícito (fura o debounce). Espera a requisição em voo terminar.
  const enviar = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) clearTimeout(timerRef.current);
    while (emVooRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    return post(true);
  }, [post]);

  return { status, salvoEm, submittedAt, enviar };
}
