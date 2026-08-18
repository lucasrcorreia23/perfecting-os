"use client";

import { CAMPO_DEFS, CAMINHO_HELP, CAMINHO_LABEL } from "@/lib/calculadora/campos";
import { CAMINHOS, MARGEM_NAO_SEI } from "@/lib/calculadora/constants";
import type {
  CampoId,
  Caminho,
  EntradasTime,
  EstruturaCompartilhada,
} from "@/lib/calculadora/types";
import { cn } from "@/lib/utils";
import { Field } from "@/components/ui/form";
import { CampoNumero } from "./campo-numero";
import { Alternador, BlocoEstrutura } from "./estrutura-compartilhada";

function CampoDef({
  campo,
  entradas,
  onChange,
  autoFocus,
}: {
  campo: Exclude<CampoId, "caminho">;
  entradas: EntradasTime;
  onChange: (campo: CampoId, valor: EntradasTime[CampoId]) => void;
  autoFocus?: boolean;
}) {
  const def = CAMPO_DEFS[campo];
  return (
    <Field label={def.label} hint={def.help} htmlFor={`campo-${campo}`}>
      <CampoNumero
        id={`campo-${campo}`}
        valor={entradas[campo] as number | null}
        formato={def.formato}
        inteiro={def.inteiro}
        placeholder={def.placeholder}
        onChange={(valor) => onChange(campo, valor)}
        autoFocus={autoFocus}
      />
    </Field>
  );
}

export function PassoForm({
  passo,
  entradas,
  onChange,
  multiTime = false,
  estrutura,
  onChangeEstrutura,
  vendedoresDaConta = 0,
}: {
  passo: 1 | 2 | 3 | 4 | 5;
  entradas: EntradasTime;
  onChange: (campo: CampoId, valor: EntradasTime[CampoId]) => void;
  multiTime?: boolean;
  estrutura?: EstruturaCompartilhada;
  onChangeEstrutura?: (patch: Partial<EstruturaCompartilhada>) => void;
  vendedoresDaConta?: number;
}) {
  // Estrutura compartilhada (§4.11): só faz sentido com mais de um time. Ativa,
  // os campos do gestor e da alternativa saem do formulário por time e passam a
  // ser declarados uma vez para a conta.
  const compartilhada = multiTime && estrutura !== undefined && onChangeEstrutura !== undefined;
  const ativa = compartilhada && estrutura.ativa;

  const bloco = (passoBloco: 1 | 3 | 4) =>
    ativa ? (
      <BlocoEstrutura
        passo={passoBloco}
        estrutura={estrutura}
        onChange={onChangeEstrutura}
        vendedoresDoTime={entradas.numVendedores}
        vendedoresDaConta={vendedoresDaConta}
      />
    ) : null;

  if (passo === 1) {
    return (
      <div className="flex flex-col gap-4">
        {compartilhada ? (
          <Alternador
            ativa={estrutura.ativa}
            onToggle={(valor) => onChangeEstrutura({ ativa: valor })}
          />
        ) : null}
        {bloco(1)}
        {/* items-end: label de duas linhas não desalinha o input do vizinho. */}
        {ativa ? (
          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2">
            <CampoDef campo="numVendedores" entradas={entradas} onChange={onChange} autoFocus />
            <CampoDef campo="horasPraticaPorRepHoje" entradas={entradas} onChange={onChange} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2">
              <CampoDef campo="numVendedores" entradas={entradas} onChange={onChange} autoFocus />
              <CampoDef campo="numGestoresTreino" entradas={entradas} onChange={onChange} />
            </div>
            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
              <CampoDef campo="horasTreinoGestorMes" entradas={entradas} onChange={onChange} />
              <CampoDef campo="vendedoresPorGestorMes" entradas={entradas} onChange={onChange} />
              <CampoDef campo="horasPraticaPorRepHoje" entradas={entradas} onChange={onChange} />
            </div>
          </>
        )}
      </div>
    );
  }

  if (passo === 2) {
    return (
      <div className="flex flex-col gap-4">
        <CampoDef campo="receitaMensal" entradas={entradas} onChange={onChange} autoFocus />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CampoDef campo="ticketMedio" entradas={entradas} onChange={onChange} />
          <CampoDef campo="conversaoPct" entradas={entradas} onChange={onChange} />
        </div>
        <div className="flex flex-col gap-2">
          <CampoDef campo="margemPct" entradas={entradas} onChange={onChange} />
          {entradas.margemPct === null ? (
            <button
              type="button"
              onClick={() => onChange("margemPct", MARGEM_NAO_SEI)}
              className={cn(
                "self-start inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-slate-200 px-4 text-[13px] font-medium leading-5 text-slate-600 sm:min-h-8",
                "transition-colors hover:border-slate-300 hover:text-slate-800",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              )}
            >
              Não sei → usar {MARGEM_NAO_SEI}%
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (passo === 3) {
    return (
      <div className="flex flex-col gap-4">
        {bloco(3)}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {ativa ? null : (
            <CampoDef campo="salarioGestor" entradas={entradas} onChange={onChange} autoFocus />
          )}
          <CampoDef
            campo="salarioVendedor"
            entradas={entradas}
            onChange={onChange}
            autoFocus={ativa}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CampoDef campo="rampaMeses" entradas={entradas} onChange={onChange} />
          <CampoDef campo="contratacoesAno" entradas={entradas} onChange={onChange} />
        </div>
      </div>
    );
  }

  if (passo === 4) {
    const caminho = entradas.caminho;
    if (ativa) return <div className="flex flex-col gap-4">{bloco(4)}</div>;
    return (
      <div className="flex flex-col gap-4">
        <Field label={CAMINHO_LABEL} hint={CAMINHO_HELP}>
          <div role="radiogroup" aria-label={CAMINHO_LABEL} className="flex flex-col gap-2">
            {(Object.keys(CAMINHOS) as Caminho[]).map((id) => {
              const ativo = caminho === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => onChange("caminho", id)}
                  className={cn(
                    "flex min-h-[44px] cursor-pointer flex-col gap-1 rounded-sm border px-4 py-3 text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                    ativo
                      ? "border-[#2E63CD]/50 bg-[#2E63CD]/[0.04]"
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
        {caminho === "externo" ? (
          <CampoDef campo="custoExternoAno" entradas={entradas} onChange={onChange} />
        ) : null}
        {caminho === "evento" ? (
          <div className="flex flex-col gap-2">
            <CampoDef campo="custoEventoAno" entradas={entradas} onChange={onChange} />
            <p className="text-xs text-slate-500">
              Consideramos 50% desse valor como substituível por prática contínua.
              É uma premissa declarada, visível no resultado.
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CampoDef campo="cicloDias" entradas={entradas} onChange={onChange} />
        <CampoDef campo="leadsMes" entradas={entradas} onChange={onChange} />
      </div>
      <p className="text-xs text-slate-500">
        Os dois juntos, ou nenhum: com um só não dá para calcular o ganho de ciclo
        com honestidade.
      </p>
    </div>
  );
}
