"use client";

import { useEffect, useRef, useState } from "react";
import { formatBRL, formatMeses, formatX } from "@/lib/calculadora/format";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Disclaimer } from "./disclaimer";
import { SeloEvidencia } from "./selo-evidencia";

// Duração da contagem. Curta o bastante para não virar espera (§9: movimento
// contido), longa o bastante para o olho ver o número subir.
const DURACAO_MS = 900;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function prefereMenosMovimento(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/*
 * Conta de 0 até `alvo` na abertura. O valor intermediário é só apresentação —
 * quem manda no número é o motor, e o alvo é o que fica na tela ao fim.
 * Com `prefers-reduced-motion` não há contagem: o número já entra formado.
 */
function useContagem(alvo: number, ativo: boolean): number {
  // Lido uma vez, na montagem: `matchMedia` não existe no servidor e a
  // preferência não vai mudar no meio de uma animação de 900ms. Quem prefere
  // menos movimento não tem estado nenhum — recebe `alvo` direto no retorno, o
  // que também evita zerar o número por um quadro antes de a contagem começar.
  const [reduzido] = useState(prefereMenosMovimento);
  const [valor, setValor] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ativo || reduzido) return;

    const inicio = performance.now();

    function passo(agora: number) {
      const t = Math.min(1, (agora - inicio) / DURACAO_MS);
      setValor(alvo * easeOutCubic(t));
      if (t < 1) frameRef.current = requestAnimationFrame(passo);
    }
    frameRef.current = requestAnimationFrame(passo);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [alvo, ativo, reduzido]);

  return reduzido ? alvo : valor;
}

/*
 * O momento em que o número passa a existir.
 *
 * Aparece uma vez por time completado NESTA sessão (ver `celebracao.ts`) e
 * antes de qualquer envio — por isso a copy precisa dizer que nada foi enviado
 * ainda: a pessoa acabou de terminar o formulário, não de fechar negócio.
 *
 * O bloco escuro aqui dentro é o MESMO hero que está na página atrás. Fechar o
 * modal não troca de assunto: revela em tamanho real o que o modal mostrou em
 * miniatura.
 */
export function CelebracaoModal({
  open,
  onClose,
  nomeTime,
  multiTime,
  roi,
  paybackMeses,
  valorAno,
}: {
  open: boolean;
  onClose: () => void;
  nomeTime: string;
  multiTime: boolean;
  roi: number;
  paybackMeses: number | null;
  valorAno: number | null;
}) {
  const roiAnimado = useContagem(roi, open);

  const apoio = [
    { valor: formatMeses(paybackMeses), rotulo: "para se pagar" },
    { valor: formatBRL(valorAno), rotulo: "de valor em 12 meses" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={multiTime ? `A conta de ${nomeTime} fechou` : "Sua conta fechou"}
      width="max-w-lg"
    >
      <div className="flex flex-col gap-3 rounded-md bg-surface-positive p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">
            Retorno projetado no primeiro ano
          </span>
          <SeloEvidencia selo="estimativa" tom="destaque" />
        </div>
        <span className="text-(length:--text-score-xl) font-semibold leading-16 tabular-nums text-trend-positive-ink">
          {formatX(roiAnimado)}
        </span>
        {/* fade-in-up escalonado: os apoios chegam depois do número, não com
            ele. Sob prefers-reduced-motion a classe já vira `animation: none`
            (globals.css) e o atraso deixa de existir junto. */}
        <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-trend-positive/20 pt-3">
          {apoio.map((item, index) => (
            <div
              key={item.rotulo}
              className="fade-in-up flex flex-col gap-1"
              style={{ animationDelay: `${400 + index * 120}ms` }}
            >
              <span className="text-base font-semibold leading-4 tabular-nums text-slate-900">
                {item.valor}
              </span>
              <span className="text-xs text-slate-600">{item.rotulo}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm leading-6 text-slate-600">
        É a projeção que os seus números produzem, com todas as premissas
        declaradas na tela. Nada foi enviado ainda — atrás desta janela está de
        onde vem cada parcela, e a proposta continua sua para ajustar.
      </p>

      <div className="flex justify-end">
        <Button variant="primary" onClick={onClose}>
          Ver o resultado completo
        </Button>
      </div>

      {/* Invariante 10: o disclaimer acompanha TODA tela de resultado, e este
          modal é uma — traz ROI, payback e valor/ano. O parágrafo acima cobre
          P3 ("é projeção"), mas não a metade contratual; ela vem daqui. É
          justamente o momento de maior entusiasmo do fluxo. */}
      <Disclaimer />
    </Modal>
  );
}
