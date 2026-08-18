"use client";

import { useRef } from "react";
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
  erro,
}: {
  campo: Exclude<CampoId, "caminho">;
  entradas: EntradasTime;
  onChange: (campo: CampoId, valor: EntradasTime[CampoId]) => void;
  autoFocus?: boolean;
  erro?: string;
}) {
  const def = CAMPO_DEFS[campo];
  const id = `campo-${campo}`;
  // A explicação é linha visível, não ícone: no wizard a pessoa está decidindo
  // O QUE responder, e esconder a frase que define o campo atrás de um alvo de
  // 16px cobrava um tab stop por campo para devolver uma linha de texto.
  return (
    <Field
      label={def.label}
      help={def.help}
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
        descritoPor={[def.help ? `${id}-ajuda` : null, erro ? `${id}-erro` : null]
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
  multiTime = false,
  estrutura,
  onChangeEstrutura,
  vendedoresDaConta = 0,
  erros = {},
}: {
  passo: 1 | 2 | 3 | 4 | 5;
  entradas: EntradasTime;
  onChange: (campo: CampoId, valor: EntradasTime[CampoId]) => void;
  multiTime?: boolean;
  estrutura?: EstruturaCompartilhada;
  onChangeEstrutura?: (patch: Partial<EstruturaCompartilhada>) => void;
  vendedoresDaConta?: number;
  // Erro por campo, preenchido quando a pessoa tenta avançar com pendência.
  erros?: Partial<Record<CampoId, string>>;
}) {
  // Refs das opções de caminho, para a seta mover o foco junto da seleção.
  const opcoesRef = useRef<(HTMLButtonElement | null)[]>([]);

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
        {/* Subgrade: rótulo, ajuda, input e erro dividem as MESMAS faixas em
            toda a linha. O `items-end` que morava aqui alinhava só os inputs —
            bastava a ajuda ter três linhas num campo e duas no vizinho para os
            rótulos saírem em alturas diferentes. */}
        {ativa ? (
          <div className="grid grid-cols-1 grid-rows-[auto_auto_auto_auto] gap-x-4 gap-y-6 md:grid-cols-2">
            <CampoDef campo="numVendedores" entradas={entradas} onChange={onChange} autoFocus erro={erros.numVendedores} />
            <CampoDef campo="horasPraticaPorRepHoje" entradas={entradas} onChange={onChange} erro={erros.horasPraticaPorRepHoje} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 grid-rows-[auto_auto_auto_auto] gap-x-4 gap-y-6 md:grid-cols-2">
              <CampoDef campo="numVendedores" entradas={entradas} onChange={onChange} autoFocus erro={erros.numVendedores} />
              <CampoDef campo="numGestoresTreino" entradas={entradas} onChange={onChange} erro={erros.numGestoresTreino} />
            </div>
            <div className="grid grid-cols-1 grid-rows-[auto_auto_auto_auto] gap-x-4 gap-y-6 md:grid-cols-3">
              <CampoDef campo="horasTreinoGestorMes" entradas={entradas} onChange={onChange} erro={erros.horasTreinoGestorMes} />
              <CampoDef campo="vendedoresPorGestorMes" entradas={entradas} onChange={onChange} erro={erros.vendedoresPorGestorMes} />
              <CampoDef campo="horasPraticaPorRepHoje" entradas={entradas} onChange={onChange} erro={erros.horasPraticaPorRepHoje} />
            </div>
          </>
        )}
      </div>
    );
  }

  if (passo === 2) {
    return (
      <div className="flex flex-col gap-4">
        <CampoDef campo="receitaMensal" entradas={entradas} onChange={onChange} autoFocus erro={erros.receitaMensal} />
        <div className="grid grid-cols-1 grid-rows-[auto_auto_auto_auto] gap-x-4 gap-y-6 md:grid-cols-2">
          <CampoDef campo="ticketMedio" entradas={entradas} onChange={onChange} erro={erros.ticketMedio} />
          <CampoDef campo="conversaoPct" entradas={entradas} onChange={onChange} erro={erros.conversaoPct} />
        </div>
        <div className="flex flex-col gap-2">
          <CampoDef campo="margemPct" entradas={entradas} onChange={onChange} erro={erros.margemPct} />
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
        <div className="grid grid-cols-1 grid-rows-[auto_auto_auto_auto] gap-x-4 gap-y-6 md:grid-cols-2">
          {ativa ? null : (
            <CampoDef campo="salarioGestor" entradas={entradas} onChange={onChange} autoFocus erro={erros.salarioGestor} />
          )}
          <CampoDef
            campo="salarioVendedor"
            entradas={entradas}
            onChange={onChange}
            autoFocus={ativa} erro={erros.salarioVendedor} />
        </div>
        <div className="grid grid-cols-1 grid-rows-[auto_auto_auto_auto] gap-x-4 gap-y-6 md:grid-cols-2">
          <CampoDef campo="rampaMeses" entradas={entradas} onChange={onChange} erro={erros.rampaMeses} />
          <CampoDef campo="contratacoesAno" entradas={entradas} onChange={onChange} erro={erros.contratacoesAno} />
        </div>
      </div>
    );
  }

  if (passo === 4) {
    const caminho = entradas.caminho;
    if (ativa) return <div className="flex flex-col gap-4">{bloco(4)}</div>;
    return (
      <div className="flex flex-col gap-4">
        <Field
          label={CAMINHO_LABEL}
          help={CAMINHO_HELP}
          error={erros.caminho}
          escala="leitura"
        >
          {/* Radiogroup de verdade: UM tab stop para o grupo (roving tabindex)
              e setas para trocar a opção. Quatro botões tabbáveis passavam a
              semântica mas não o comportamento — quem navega por teclado
              atravessava quatro paradas para responder uma pergunta. */}
          <div
            role="radiogroup"
            aria-label={CAMINHO_LABEL}
            aria-invalid={erros.caminho ? true : undefined}
            className="flex flex-col gap-2"
            onKeyDown={(event) => {
              const teclas = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
              if (!teclas.includes(event.key)) return;
              event.preventDefault();
              const ids = Object.keys(CAMINHOS) as Caminho[];
              const atual = caminho === null ? -1 : ids.indexOf(caminho);
              const passoTecla = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
              const proximo = ids[(atual + passoTecla + ids.length) % ids.length];
              onChange("caminho", proximo);
              opcoesRef.current[ids.indexOf(proximo)]?.focus();
            }}
          >
            {(Object.keys(CAMINHOS) as Caminho[]).map((id, indice) => {
              const ativo = caminho === id;
              // Sem nada escolhido o primeiro carrega o tab stop, senão o
              // grupo inteiro sai da ordem de foco.
              const focavel = caminho === null ? indice === 0 : ativo;
              return (
                <button
                  key={id}
                  ref={(node) => {
                    opcoesRef.current[indice] = node;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  tabIndex={focavel ? 0 : -1}
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
                  <span className="text-sm leading-6 text-slate-600">
                    {CAMINHOS[id].descricao}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>
        {caminho === "externo" ? (
          <CampoDef campo="custoExternoAno" entradas={entradas} onChange={onChange} erro={erros.custoExternoAno} />
        ) : null}
        {caminho === "evento" ? (
          <div className="flex flex-col gap-2">
            <CampoDef campo="custoEventoAno" entradas={entradas} onChange={onChange} erro={erros.custoEventoAno} />
            <p className="text-sm leading-6 text-slate-600">
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
      <div className="grid grid-cols-1 grid-rows-[auto_auto_auto_auto] gap-x-4 gap-y-6 md:grid-cols-2">
        <CampoDef campo="cicloDias" entradas={entradas} onChange={onChange} erro={erros.cicloDias} />
        <CampoDef campo="leadsMes" entradas={entradas} onChange={onChange} erro={erros.leadsMes} />
      </div>
    </div>
  );
}
