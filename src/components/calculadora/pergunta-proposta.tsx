"use client";

import { useState } from "react";
import {
  CENARIOS,
  PLANOS,
  PRAZO_COPY,
  PRAZOS_MESES,
} from "@/lib/calculadora/constants";
import { formatPp } from "@/lib/calculadora/format";
import type {
  Cenario,
  CenarioSelecionado,
  PlanoId,
  PropostaTime,
} from "@/lib/calculadora/types";
import { Field } from "@/components/ui/form";
import { GrupoOpcoes, GrupoPlanos } from "./opcao-cards";
import { usePremissas } from "./premissas-context";
import type { PremissasRacional } from "@/lib/calculadora/premissas";

// A pergunta 8: como contratar, e quão otimista projetar.
//
// É a única pergunta do quiz que NÃO edita `EntradasTime` — ela escreve na
// proposta (plano), no prazo da conta e no cenário. Por isso mora fora do
// `passo-form`, e por isso não tem entrada em `camposFaltando`: não há o que
// "faltar" num campo que já nasce com default.
//
// Assentos NÃO se escolhem aqui (20/08/2026): vazio já significa "o time
// inteiro", que é a resposta certa para quase todo mundo, e pedir o número
// no quiz cobrava uma decisão de escopo antes de a pessoa ter visto o
// resultado. Quem precisa de um grupo menor ajusta na etapa avançada, onde o
// campo continua — junto dos outros ajustes por time.
//
// Desde 20/08/2026 é AQUI que a proposta se monta. No resultado, "Quanto
// custa" virou leitura — os controles que recalculavam o número ao vivo
// naquela tela sumiram junto com a sidebar.

const ORDEM: Cenario[] = ["conservador", "realista", "otimista"];

/** Os quatro deltas de um preset, na frase que o card mostra. */
function deltasDoCenario(cenario: Cenario, p: PremissasRacional): string {
  const c = p.cenarios[cenario];
  return [
    `ticket +${Math.round(c.ticketPct * 100)}%`,
    `rampa +${Math.round(c.rampaPct * 100)}%`,
    `ciclo +${Math.round(c.cicloPct * 100)}%`,
    `conversão ${formatPp(c.convPp)}`,
  ].join(" · ");
}

export function PerguntaProposta({
  proposta,
  prazoMeses,
  sel,
  planoHerdado,
  onChangePlano,
  onChangePrazo,
  onChangeCenario,
}: {
  proposta: PropostaTime;
  prazoMeses: number;
  sel: CenarioSelecionado;
  planoHerdado: boolean;
  onChangePlano: (plano: PlanoId) => void;
  onChangePrazo: (prazo: number) => void;
  onChangeCenario: (sel: CenarioSelecionado) => void;
}) {
  // O cenário ativo mesmo quando a pessoa mexeu nos sliders da etapa avançada:
  // ali o modo vira "personalizado" e o preset sobrevive como `base`.
  const cenarioAtivo = sel.modo === "preset" ? sel.cenario : sel.base;

  // "Herdado da etapa 1" para de valer no instante em que a pessoa troca o
  // plano aqui — senão a linha apresentaria como herança uma escolha feita
  // nesta tela. O sinal que vem do caller é `assentos === null`, e com o campo
  // de assentos fora do quiz nada mais aqui dentro derrubaria a frase.
  const [planoTrocadoAqui, setPlanoTrocadoAqui] = useState(false);
  const p = usePremissas();

  return (
    <div className="flex flex-col gap-8">
      <Field
        label="Cenário de projeção"
        help="O Conservador é o piso — é com ele que se decide. Os outros dois mostram a faixa."
        escala="leitura"
      >
        <GrupoOpcoes<Cenario>
          nome="Cenário de projeção"
          valor={cenarioAtivo}
          onChange={(cenario) => onChangeCenario({ modo: "preset", cenario })}
          opcoes={ORDEM.map((id) => ({
            id,
            label: CENARIOS[id].label,
            descricao: deltasDoCenario(id, p),
            selo: id === "conservador" ? "Recomendado" : undefined,
          }))}
        />
      </Field>

      <Field
        label="Duração do contrato"
        help="Prazo não altera o preço: o que ele compra é trava de reajuste e nível de serviço."
        escala="leitura"
      >
        <GrupoOpcoes<number>
          nome="Duração do contrato"
          valor={prazoMeses}
          onChange={onChangePrazo}
          opcoes={PRAZOS_MESES.map((meses) => ({
            id: meses,
            label: `${meses} meses`,
            descricao: PRAZO_COPY[meses],
          }))}
        />
      </Field>

      <Field
        label="Plano (cadência de treino)"
        help={
          planoHerdado && !planoTrocadoAqui
            ? `Herdado da etapa 1: ${PLANOS[proposta.plano].label}. Pode trocar aqui.`
            : "Horas de prática por assento, por mês."
        }
        escala="leitura"
      >
        <GrupoPlanos
          valor={proposta.plano}
          onChange={(plano) => {
            setPlanoTrocadoAqui(true);
            onChangePlano(plano);
          }}
          unidade="por assento / mês"
        />
      </Field>
    </div>
  );
}
