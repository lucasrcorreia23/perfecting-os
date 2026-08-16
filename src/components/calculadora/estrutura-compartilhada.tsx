"use client";

import { CAMPO_DEFS, CAMINHO_HELP, CAMINHO_LABEL } from "@/lib/calculadora/campos";
import { CAMINHOS } from "@/lib/calculadora/constants";
import { formatNumero } from "@/lib/calculadora/format";
import type { Caminho, EstruturaCompartilhada } from "@/lib/calculadora/types";
import { Field } from "@/components/ui/form";
import { SelectMenu } from "@/components/ui/select-menu";
import { cn } from "@/lib/utils";
import { CampoNumero } from "./campo-numero";

// Estrutura de capacitação compartilhada (§4.11). Quando os mesmos gestores
// atendem mais de um time, declarar a estrutura em cada time contaria a mesma
// economia N vezes. Aqui ela é declarada UMA vez para a conta; o rateio por
// peso de vendedores acontece em `estrutura.ts`, antes do cálculo.
//
// O bloco é editável a partir de qualquer time — é estado da conta, não do
// time —, e a linha de rateio mostra a fatia do time que está na tela.

// Quais campos compartilhados pertencem a cada passo do wizard.
export const PASSOS_DA_ESTRUTURA = [1, 3, 4] as const;

export function Alternador({
  ativa,
  onToggle,
}: {
  ativa: boolean;
  onToggle: (ativa: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-sm border p-4 transition-colors",
        ativa ? "border-[#2E63CD]/40 bg-[#2E63CD]/[0.04]" : "border-slate-200 bg-white",
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={ativa}
        onClick={() => onToggle(!ativa)}
        className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-4 rounded-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 sm:min-h-0 sm:py-2"
      >
        <span className="text-sm font-medium text-slate-800">
          Os mesmos gestores treinam mais de um time?
        </span>
        {/* Trilho 44×24 com knob de 16 e folga de 4: o curso vai de `left-1`
            (4) a `left-6` (24), porque 4 + 16 + 24 = 44. Tudo na grade e nada
            calculado à mão — o valor arbitrário anterior (`left-[1.375rem]`)
            era 44 − 20 − 2 resolvido no braço, e quebrava calado se o trilho
            mudasse de largura. */}
        <span
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            ativa ? "bg-[#2E63CD]" : "bg-slate-200",
          )}
          aria-hidden
        >
          <span
            className={cn(
              "absolute top-1 h-4 w-4 rounded-full bg-white shadow-[var(--shadow-sm)] transition-[left]",
              ativa ? "left-6" : "left-1",
            )}
          />
        </span>
      </button>
      <p className="text-xs leading-5 text-slate-500">
        {ativa
          ? "A estrutura é declarada uma vez para a conta. Os gestores e o custo da alternativa são rateados entre os times por número de vendedores — cada time mantém os próprios números de operação."
          : "Ative se a mesma equipe de gestores atende vários times. Sem isso, declarar os mesmos gestores em cada time contaria a mesma economia mais de uma vez."}
      </p>
    </div>
  );
}

export function BlocoEstrutura({
  passo,
  estrutura,
  onChange,
  vendedoresDoTime,
  vendedoresDaConta,
}: {
  passo: 1 | 3 | 4;
  estrutura: EstruturaCompartilhada;
  onChange: (patch: Partial<EstruturaCompartilhada>) => void;
  vendedoresDoTime: number | null;
  vendedoresDaConta: number;
}) {
  const peso =
    vendedoresDaConta > 0 && vendedoresDoTime !== null
      ? vendedoresDoTime / vendedoresDaConta
      : null;

  const rateioTexto = (() => {
    if (peso === null) return "O rateio aparece quando os times declararem os vendedores.";
    const pct = `${formatNumero(peso * 100, 0)}%`;
    if (passo === 1 && estrutura.numGestoresTreino !== null) {
      return `Este time responde por ${formatNumero(estrutura.numGestoresTreino * peso, 2)} dos ${formatNumero(estrutura.numGestoresTreino, 0)} gestores — ${pct} dos vendedores da conta.`;
    }
    if (passo === 4) {
      const custo =
        estrutura.caminho === "externo"
          ? estrutura.custoExternoAno
          : estrutura.caminho === "evento"
            ? estrutura.custoEventoAno
            : null;
      if (custo !== null) {
        return `Este time responde por ${pct} desse custo — a fatia dos vendedores dele na conta.`;
      }
    }
    return `Este time responde por ${pct} dos vendedores da conta.`;
  })();

  return (
    <section className="flex flex-col gap-4 rounded-sm border border-[#2E63CD]/25 bg-[#2E63CD]/[0.03] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-semibold text-slate-500">
          Estrutura compartilhada da conta
        </h3>
        <span className="text-xs text-slate-400">vale para todos os times</span>
      </div>

      {passo === 1 ? (
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
          <CampoEstrutura
            campo="numGestoresTreino"
            estrutura={estrutura}
            onChange={onChange}
          />
          <CampoEstrutura
            campo="horasTreinoGestorMes"
            estrutura={estrutura}
            onChange={onChange}
          />
          <CampoEstrutura
            campo="vendedoresPorGestorMes"
            estrutura={estrutura}
            onChange={onChange}
          />
        </div>
      ) : null}

      {passo === 3 ? (
        <div className="md:w-1/2">
          <CampoEstrutura campo="salarioGestor" estrutura={estrutura} onChange={onChange} />
        </div>
      ) : null}

      {passo === 4 ? (
        <div className="flex flex-col gap-4">
          <Field label={CAMINHO_LABEL} hint={CAMINHO_HELP}>
            <div role="radiogroup" aria-label={CAMINHO_LABEL} className="flex flex-col gap-2">
              {(Object.keys(CAMINHOS) as Caminho[]).map((id) => {
                const ativo = estrutura.caminho === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => onChange({ caminho: id })}
                    className={cn(
                      "flex min-h-[44px] cursor-pointer flex-col gap-1 rounded-sm border px-4 py-3 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                      ativo
                        ? "border-[#2E63CD]/50 bg-white"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-medium",
                        ativo ? "text-[#2E63CD]" : "text-slate-800",
                      )}
                    >
                      {CAMINHOS[id].label}
                    </span>
                    <span className="text-xs text-slate-500">{CAMINHOS[id].descricao}</span>
                  </button>
                );
              })}
            </div>
          </Field>
          {estrutura.caminho === "externo" ? (
            <CampoEstrutura
              campo="custoExternoAno"
              estrutura={estrutura}
              onChange={onChange}
            />
          ) : null}
          {estrutura.caminho === "evento" ? (
            <div className="flex flex-col gap-2">
              <CampoEstrutura
                campo="custoEventoAno"
                estrutura={estrutura}
                onChange={onChange}
              />
              <p className="text-xs text-slate-500">
                Consideramos 50% desse valor como substituível por prática contínua.
                É uma premissa declarada, visível no resultado.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs leading-5 text-slate-500">{rateioTexto}</p>
    </section>
  );
}

// Mesma estrutura, empilhada para a sidebar de 300px: sem grid, e o caminho
// como select em vez de radiogroup — o padrão dos outros campos de lá.
export function CamposEstruturaSidebar({
  estrutura,
  onChange,
}: {
  estrutura: EstruturaCompartilhada;
  onChange: (patch: Partial<EstruturaCompartilhada>) => void;
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-xs font-semibold text-slate-500">
          Estrutura compartilhada
        </h4>
        <span className="text-xs text-slate-400">todos os times</span>
      </div>
      <CampoEstrutura campo="numGestoresTreino" estrutura={estrutura} onChange={onChange} />
      <CampoEstrutura campo="horasTreinoGestorMes" estrutura={estrutura} onChange={onChange} />
      <CampoEstrutura
        campo="vendedoresPorGestorMes"
        estrutura={estrutura}
        onChange={onChange}
      />
      <CampoEstrutura campo="salarioGestor" estrutura={estrutura} onChange={onChange} />
      <Field label={CAMINHO_LABEL} htmlFor="estrutura-caminho">
        <SelectMenu
          id="estrutura-caminho"
          size="sm"
          options={(Object.keys(CAMINHOS) as Caminho[]).map((id) => ({
            value: id,
            label: CAMINHOS[id].label,
          }))}
          value={estrutura.caminho ?? ""}
          onChange={(valor) => onChange({ caminho: valor === "" ? null : (valor as Caminho) })}
        />
      </Field>
      {estrutura.caminho === "externo" ? (
        <CampoEstrutura campo="custoExternoAno" estrutura={estrutura} onChange={onChange} />
      ) : null}
      {estrutura.caminho === "evento" ? (
        <CampoEstrutura campo="custoEventoAno" estrutura={estrutura} onChange={onChange} />
      ) : null}
    </section>
  );
}

type CampoNumericoDaEstrutura =
  | "numGestoresTreino"
  | "horasTreinoGestorMes"
  | "vendedoresPorGestorMes"
  | "salarioGestor"
  | "custoExternoAno"
  | "custoEventoAno";

function CampoEstrutura({
  campo,
  estrutura,
  onChange,
}: {
  campo: CampoNumericoDaEstrutura;
  estrutura: EstruturaCompartilhada;
  onChange: (patch: Partial<EstruturaCompartilhada>) => void;
}) {
  const def = CAMPO_DEFS[campo];
  return (
    <Field label={def.label} hint={def.help} htmlFor={`estrutura-${campo}`}>
      <CampoNumero
        id={`estrutura-${campo}`}
        valor={estrutura[campo]}
        formato={def.formato}
        inteiro={def.inteiro}
        placeholder={def.placeholder}
        onChange={(valor) => onChange({ [campo]: valor })}
      />
    </Field>
  );
}
