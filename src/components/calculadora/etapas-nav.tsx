"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// O cabeçalho da jornada: as quatro etapas, sempre visíveis.
//
// Substitui a `TopProgress` (uma barra de 1px no topo, que dizia quanto falta
// mas não onde você está nem como voltar) e o stepper lateral de times.
//
// **A etapa só abre depois que as anteriores foram vencidas** (decisão do
// decisor, 20/08/2026, revertendo o "nenhuma etapa é bloqueada" que este
// comentário trazia). Voltar continua livre — uma etapa sem pendência atrás
// dela nunca tranca —, então o movimento mais comum de quem monta proposta,
// que é reconferir um número, segue de graça. O que a trava impede é o pulo
// para frente, que levava a pessoa a um relatório sem números e transformava
// o `ResultadoIncompleto` em destino em vez de rede.
//
// A trava é DUPLA, no molde do botão "Fórmulas (PDF)": o controle fica visível
// e `aria-disabled` (não `disabled` de verdade — assim continua focável, e é
// pelo teclado que se descobre por que ele não responde), e `irParaEtapa`
// repete a condição do lado do estado. Botão desabilitado é afordância, não
// controle de acesso.
//
// O desenho aprovado trazia DUAS afordâncias para os mesmos quatro destinos:
// pílulas na barra e a régua numerada abaixo dela. A pílula saiu em 20/08/2026,
// como este comentário já previa — das duas, era a que só repetia o destino,
// enquanto a régua repete o destino E lê progresso (cada trilho mostra o quanto
// daquela etapa já foi vencido, não a posição do cursor). Por isso é a régua que
// carrega agora o `aria-label` da navegação.

export type EtapaId = "mensalidade" | "quiz" | "relatorio" | "exportar";

// Sem caixa alta no texto: a §2 é inegociável e vale para eyebrow também — a
// caixa vem escrita, e quem faz o papel aqui é a mono e o número ao lado.
const ETAPAS: { id: EtapaId; numero: string; titulo: string }[] = [
  { id: "mensalidade", numero: "01", titulo: "Mensalidade" },
  { id: "quiz", numero: "02", titulo: "Quiz de ROI" },
  { id: "relatorio", numero: "03", titulo: "Relatório" },
  { id: "exportar", numero: "04", titulo: "Exportar & FAQ" },
];

/**
 * Quais etapas estão abertas, dado o quanto de cada uma já foi vencido.
 *
 * A regra é uma só: uma etapa abre quando TODAS as anteriores estão completas.
 * É ela que deixa voltar de graça (etapa antiga não tem pendência atrás de si)
 * e barra o pulo para frente. A etapa atual entra sempre — trancar o chão sob
 * os pés de quem já está lá seria pior que não ter trava.
 *
 * Exportada para `calculadora-app` repetir a condição na navegação.
 */
export function etapasLiberadas(
  preenchimento: Record<EtapaId, number>,
  etapaAtual: EtapaId,
): Record<EtapaId, boolean> {
  const saida = {} as Record<EtapaId, boolean>;
  let anterioresCompletas = true;
  for (const etapa of ETAPAS) {
    saida[etapa.id] = anterioresCompletas || etapa.id === etapaAtual;
    if (preenchimento[etapa.id] < 1) anterioresCompletas = false;
  }
  return saida;
}

// O que falta, nomeado. "Indisponível" informaria o obstáculo sem dizer a saída
// — mesmo raciocínio do `MOTIVO_FORMULAS`.
function motivoDaTrava(
  preenchimento: Record<EtapaId, number>,
  etapaId: EtapaId,
): string | null {
  const indice = ETAPAS.findIndex((e) => e.id === etapaId);
  const pendente = ETAPAS.slice(0, indice).find((e) => preenchimento[e.id] < 1);
  if (!pendente) return null;
  return `Abre quando você concluir a etapa ${pendente.numero} · ${pendente.titulo}.`;
}

export function EtapasNav({
  etapaAtual,
  onIr,
  preenchimento,
  acoes,
}: {
  etapaAtual: EtapaId;
  onIr: (etapa: EtapaId) => void;
  /** Quanto de cada etapa já foi vencido, 0 a 1 — a régua de progresso. */
  preenchimento: Record<EtapaId, number>;
  acoes: ReactNode;
}) {
  const liberadas = etapasLiberadas(preenchimento, etapaAtual);

  return (
    <div className="flex flex-col">
      <header className="border-b border-(--pf-line)">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logotipo.svg"
              alt="Perfecting"
              width={224}
              height={36}
              priority
              className="h-6 w-auto"
            />
            <span className="hidden h-5 w-px bg-(--pf-line) sm:block" aria-hidden />
            <span className="hidden text-sm text-(--pf-ink-faint) sm:block">
              Calculadora de ROI
            </span>
          </div>

          <div className="flex items-center gap-2">{acoes}</div>
        </div>
      </header>

      <nav
        aria-label="Etapas da calculadora"
        className="mx-auto w-full max-w-7xl px-4 pb-2 pt-5 sm:px-6"
      >
        <ol className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
          {ETAPAS.map((etapa) => {
            const ativo = etapa.id === etapaAtual;
            const pct = Math.round(
              Math.min(1, Math.max(0, preenchimento[etapa.id])) * 100,
            );
            const liberada = liberadas[etapa.id];
            const motivo = liberada ? null : motivoDaTrava(preenchimento, etapa.id);
            return (
              <li key={etapa.id} className="flex flex-col gap-2">
                {/* 4px, não os 3 de antes: a régua é a única leitura de
                    progresso da tela e um fio de 3px lia como borda. E o valor
                    volta para a grade de 4 (§3). */}
                <span
                  className="h-1 w-full overflow-hidden rounded-full bg-(--pf-line)"
                  aria-hidden
                >
                  <span
                    className={cn(
                      "block h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none",
                      // Etapa vencida fica cheia e escura; a que está em curso
                      // mostra a fração em azul. São estados diferentes e a cor
                      // é o que os separa sem exigir contar pixels de largura.
                      pct >= 100 ? "bg-(--pf-ink)" : "bg-(--pf-brand)",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (liberada) onIr(etapa.id);
                  }}
                  aria-current={ativo ? "step" : undefined}
                  // `aria-disabled`, nunca `disabled`: o controle continua
                  // focável, e é assim que quem navega por teclado descobre a
                  // condição em vez de esbarrar num botão mudo.
                  aria-disabled={liberada ? undefined : true}
                  title={motivo ?? undefined}
                  className={cn(
                    // Archivo no rótulo, mono só no número (`pf-num`, abaixo).
                    // A monoespaçada existe para alinhar dígito com dígito em
                    // coluna; numa palavra ela não alinha nada e só afasta o
                    // rótulo do resto da tipografia da página.
                    // §5.4 do DESIGN_SYSTEM: o rótulo do rail é caixa alta.
                    // `pf-label` já é o nível 12px/700/+10% — a mesma etiqueta
                    // dos campos, que é o que a régua é: o nome de um destino.
                    "pf-label flex min-h-[44px] items-center gap-2 rounded-full text-left transition-colors sm:min-h-6",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pf-brand)/35",
                    liberada
                      ? "cursor-pointer"
                      : "cursor-not-allowed text-(--pf-ink-faint)/60",
                    liberada && ativo && "text-(--pf-ink)",
                    liberada &&
                      !ativo &&
                      "text-(--pf-ink-faint) hover:text-(--pf-ink-soft)",
                  )}
                >
                  <span
                    className={cn("pf-num", ativo && liberada && "text-(--pf-brand)")}
                    aria-hidden
                  >
                    {etapa.numero}
                  </span>
                  <span>{etapa.titulo}</span>
                  <span className="sr-only">
                    {`Etapa ${etapa.numero}, ${pct}% concluído.`}
                    {motivo ? ` ${motivo}` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
