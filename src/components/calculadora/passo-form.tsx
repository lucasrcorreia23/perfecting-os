"use client";

import { CAMPO_DEFS, CAMINHO_HELP, CAMINHO_LABEL } from "@/lib/calculadora/campos";
import { CAMINHOS, MARGEM_NAO_SEI } from "@/lib/calculadora/constants";
import type { CampoId, Caminho, EntradasTime, PassoId } from "@/lib/calculadora/types";
import { cn } from "@/lib/utils";
import { Field } from "@/components/ui/form";
import { CampoNumero } from "./campo-numero";
import { GrupoOpcoes } from "./opcao-cards";

// As perguntas 1 a 7 do quiz — as que editam `EntradasTime`. A 8 (plano,
// cenário, prazo) edita a PROPOSTA e vive em `pergunta-proposta.tsx`.
//
// Cada pergunta tem no máximo dois campos numéricos. O que antes era o "passo
// 1" pedia cinco de uma vez, e a estrutura compartilhada (§4.11) ainda
// ramificava o formulário no meio deles; ela saiu daqui para a etapa avançada,
// que é o único lugar onde existe mais de um time.

// A grade de duas colunas do quiz. `grid-rows-[auto_auto_auto_auto]` é
// requisito do `alinhado` do `Field`: rótulo, input, ajuda e erro dividem as
// MESMAS faixas em toda a linha — nessa ordem desde 20/08/2026, quando a
// descrição desceu para baixo do campo. É o subgrid que dá o alinhamento
// superior: a faixa do rótulo tem a altura do rótulo mais alto da linha, então
// os campos começam todos na mesma altura mesmo com um rótulo de duas linhas.
const GRADE = "grid grid-cols-1 grid-rows-[auto_auto_auto_auto] gap-x-4 gap-y-6 md:grid-cols-2";

function CampoDef({
  campo,
  entradas,
  onChange,
  autoFocus,
  erro,
  help,
}: {
  campo: Exclude<CampoId, "caminho">;
  entradas: EntradasTime;
  onChange: (campo: CampoId, valor: EntradasTime[CampoId]) => void;
  autoFocus?: boolean;
  erro?: string;
  /** Sobrescreve a ajuda do registro — só onde o CONTEXTO da tela muda o que
   *  precisa ser dito (o vendedor herdado da etapa 1, por exemplo). */
  help?: string;
}) {
  const def = CAMPO_DEFS[campo];
  const id = `campo-${campo}`;
  const ajuda = help ?? def.help;
  // A explicação é linha visível, não ícone: no quiz a pessoa está decidindo O
  // QUE responder, e esconder a frase que define o campo atrás de um alvo de
  // 16px cobrava um tab stop por campo para devolver uma linha de texto.
  return (
    <Field
      label={def.label}
      help={ajuda}
      error={erro}
      htmlFor={id}
      escala="leitura"
      alinhado
    >
      <CampoNumero
        id={id}
        valor={entradas[campo] as number | null}
        formato={def.formato}
        inteiro={def.inteiro}
        placeholder={def.placeholder}
        onChange={(valor) => onChange(campo, valor)}
        autoFocus={autoFocus}
        invalido={erro !== undefined}
        descritoPor={[ajuda ? `${id}-ajuda` : null, erro ? `${id}-erro` : null]
          .filter(Boolean)
          .join(" ")}
      />
    </Field>
  );
}

export function PassoForm({
  passo,
  entradas,
  onChange,
  vendedoresHerdados = false,
  erros = {},
}: {
  passo: PassoId;
  entradas: EntradasTime;
  onChange: (campo: CampoId, valor: EntradasTime[CampoId]) => void;
  /** O número de vendedores chegou preenchido da etapa 1. */
  vendedoresHerdados?: boolean;
  // Erro por campo, preenchido quando a pessoa tenta avançar com pendência.
  erros?: Partial<Record<CampoId, string>>;
}) {
  if (passo === 1) {
    return (
      <div className="flex flex-col gap-6">
        <div className={GRADE}>
          <CampoDef
            campo="numVendedores"
            entradas={entradas}
            onChange={onChange}
            autoFocus
            erro={erros.numVendedores}
            help={
              vendedoresHerdados
                ? "Preenchido a partir da etapa 1 — ajuste se precisar."
                : undefined
            }
          />
          <CampoDef
            campo="numGestoresTreino"
            entradas={entradas}
            onChange={onChange}
            erro={erros.numGestoresTreino}
          />
        </div>
        {/* Largura inteira, como no desenho: é uma pergunta de outra natureza
            (tempo, não headcount) e emparelhá-la com um dos dois acima sugeria
            que os três se leem juntos. */}
        <CampoDef
          campo="horasTreinoGestorMes"
          entradas={entradas}
          onChange={onChange}
          erro={erros.horasTreinoGestorMes}
        />
      </div>
    );
  }

  if (passo === 2) {
    return (
      <div className={GRADE}>
        <CampoDef
          campo="vendedoresPorGestorMes"
          entradas={entradas}
          onChange={onChange}
          autoFocus
          erro={erros.vendedoresPorGestorMes}
        />
        <CampoDef
          campo="horasPraticaPorRepHoje"
          entradas={entradas}
          onChange={onChange}
          erro={erros.horasPraticaPorRepHoje}
        />
      </div>
    );
  }

  if (passo === 3) {
    const caminho = entradas.caminho;
    return (
      <div className="flex flex-col gap-6">
        <div className={GRADE}>
          <CampoDef
            campo="salarioGestor"
            entradas={entradas}
            onChange={onChange}
            autoFocus
            erro={erros.salarioGestor}
          />
          <CampoDef
            campo="salarioVendedor"
            entradas={entradas}
            onChange={onChange}
            erro={erros.salarioVendedor}
          />
        </div>
        <Field
          label={CAMINHO_LABEL}
          help={CAMINHO_HELP}
          error={erros.caminho}
          escala="leitura"
        >
          <GrupoOpcoes<Caminho>
            nome={CAMINHO_LABEL}
            valor={caminho}
            onChange={(id) => onChange("caminho", id)}
            invalido={erros.caminho !== undefined}
            opcoes={(Object.keys(CAMINHOS) as Caminho[]).map((id) => ({
              id,
              label: CAMINHOS[id].label,
              descricao: CAMINHOS[id].descricao,
            }))}
          />
        </Field>
        {caminho === "externo" ? (
          <CampoDef
            campo="custoExternoAno"
            entradas={entradas}
            onChange={onChange}
            erro={erros.custoExternoAno}
          />
        ) : null}
        {caminho === "evento" ? (
          <div className="flex flex-col gap-2">
            <CampoDef
              campo="custoEventoAno"
              entradas={entradas}
              onChange={onChange}
              erro={erros.custoEventoAno}
            />
            <p className="text-xs leading-5 text-(--pf-ink-soft)">
              Consideramos 50% desse valor como substituível por prática contínua.
              É uma premissa declarada, visível no resultado.
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  if (passo === 4) {
    return (
      <div className={GRADE}>
        <CampoDef
          campo="receitaMensal"
          entradas={entradas}
          onChange={onChange}
          autoFocus
          erro={erros.receitaMensal}
        />
        <CampoDef
          campo="ticketMedio"
          entradas={entradas}
          onChange={onChange}
          erro={erros.ticketMedio}
        />
      </div>
    );
  }

  if (passo === 5) {
    return (
      <div className="flex flex-col gap-4">
        <div className={GRADE}>
          <CampoDef
            campo="conversaoPct"
            entradas={entradas}
            onChange={onChange}
            autoFocus
            erro={erros.conversaoPct}
          />
          <CampoDef
            campo="margemPct"
            entradas={entradas}
            onChange={onChange}
            erro={erros.margemPct}
          />
        </div>
        {entradas.margemPct === null ? (
          <button
            type="button"
            onClick={() => onChange("margemPct", MARGEM_NAO_SEI)}
            className={cn(
              "self-start inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-(--pf-line) px-4 text-sm font-medium leading-5 text-(--pf-ink-soft) sm:min-h-8",
              "transition-colors hover:border-(--pf-ink-faint)/40 hover:text-(--pf-ink)",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pf-brand)/35",
            )}
          >
            Não sei → usar {MARGEM_NAO_SEI}%
          </button>
        ) : null}
      </div>
    );
  }

  if (passo === 6) {
    return (
      <div className={GRADE}>
        <CampoDef
          campo="rampaMeses"
          entradas={entradas}
          onChange={onChange}
          autoFocus
          erro={erros.rampaMeses}
        />
        <CampoDef
          campo="contratacoesAno"
          entradas={entradas}
          onChange={onChange}
          erro={erros.contratacoesAno}
        />
      </div>
    );
  }

  // Pergunta 7 — opcional, regra dos dois ou nenhum. O ciclo mora aqui junto
  // das oportunidades porque é o PAR que liga a alavanca: sozinho, nenhum dos
  // dois calcula compressão de ciclo.
  return (
    <div className={GRADE}>
      <CampoDef
        campo="leadsMes"
        entradas={entradas}
        onChange={onChange}
        autoFocus
        erro={erros.leadsMes}
      />
      <CampoDef
        campo="cicloDias"
        entradas={entradas}
        onChange={onChange}
        erro={erros.cicloDias}
      />
    </div>
  );
}
