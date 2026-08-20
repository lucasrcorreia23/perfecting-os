"use client";

import {
  CENARIOS,
  MAX_ASSENTOS,
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
import { CampoNumero } from "./campo-numero";
import { GrupoOpcoes, GrupoPlanos } from "./opcao-cards";

// A pergunta 8: como contratar, e quão otimista projetar.
//
// É a única pergunta do quiz que NÃO edita `EntradasTime` — ela escreve na
// proposta (plano, assentos), no prazo da conta e no cenário. Por isso mora
// fora do `passo-form`, e por isso não tem entrada em `camposFaltando`: não há
// o que "faltar" num campo que já nasce com default.
//
// Desde 20/08/2026 é AQUI que a proposta se monta. No resultado, "Quanto
// custa" virou leitura — os controles que recalculavam o número ao vivo
// naquela tela sumiram junto com a sidebar.

const ORDEM: Cenario[] = ["conservador", "realista", "otimista"];

/** Os quatro deltas de um preset, na frase que o card mostra. */
function deltasDoCenario(cenario: Cenario): string {
  const c = CENARIOS[cenario];
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
  assentosDefault,
  assentosLimitados,
  numVendedores,
  planoHerdado,
  onChangePlano,
  onChangeAssentos,
  onChangePrazo,
  onChangeCenario,
}: {
  proposta: PropostaTime;
  prazoMeses: number;
  sel: CenarioSelecionado;
  assentosDefault: boolean;
  assentosLimitados: boolean;
  numVendedores: number | null;
  planoHerdado: boolean;
  onChangePlano: (plano: PlanoId) => void;
  onChangeAssentos: (assentos: number) => void;
  onChangePrazo: (prazo: number) => void;
  onChangeCenario: (sel: CenarioSelecionado) => void;
}) {
  // O cenário ativo mesmo quando a pessoa mexeu nos sliders da etapa avançada:
  // ali o modo vira "personalizado" e o preset sobrevive como `base`.
  const cenarioAtivo = sel.modo === "preset" ? sel.cenario : sel.base;

  // O campo mostra o valor CRU, e vazio é uma escolha válida ("o time inteiro").
  // Dizer "pré-preenchido" enquanto a caixa está vazia seria a tela desmentindo
  // a si mesma — é a mesma copy que "Quanto custa" já usava.
  const ajudaAssentos = assentosLimitados
    ? `Travado no tamanho do time (${numVendedores}): a cobertura satura em 1, e assento acima disso não gera retorno.`
    : assentosDefault && numVendedores !== null
      ? `Vazio = o time inteiro (${numVendedores}). Você pode começar com um grupo menor e expandir.`
      : "Quantos vendedores terão acesso à prática.";

  return (
    <div className="flex flex-col gap-8">
      <Field
        label="Assentos Perfecting"
        help={ajudaAssentos}
        htmlFor="campo-assentos"
        escala="leitura"
      >
        <CampoNumero
          id="campo-assentos"
          valor={proposta.assentos}
          formato="numero"
          inteiro
          placeholder="Ex.: 30"
          onChange={(valor) => onChangeAssentos(Math.min(valor ?? 0, MAX_ASSENTOS))}
          autoFocus
          descritoPor="campo-assentos-ajuda"
        />
      </Field>

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
            descricao: deltasDoCenario(id),
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
          planoHerdado
            ? `Herdado da etapa 1: ${PLANOS[proposta.plano].label}. Pode trocar aqui.`
            : "Horas de prática por assento, por mês."
        }
        escala="leitura"
      >
        <GrupoPlanos
          valor={proposta.plano}
          onChange={onChangePlano}
          unidade="por assento / mês"
        />
      </Field>
    </div>
  );
}
