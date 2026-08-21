"use client";

import { useState } from "react";
import { ArrowLeftIcon, PencilSquareIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { CAMPO_DEFS, CAMINHO_LABEL, TIMES_HELP } from "@/lib/calculadora/campos";
import { CAMINHOS, MAX_TIMES, PLANOS } from "@/lib/calculadora/constants";
import { NOME_MAX } from "@/lib/calculadora/estado";
import type { ModeloCalculadora, TimeModelo } from "@/lib/calculadora/modelo";
import type {
  CampoId,
  Caminho,
  CenarioSelecionado,
  EntradasTime,
  EstruturaCompartilhada,
  PlanoId,
} from "@/lib/calculadora/types";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form";
import { HintTooltip } from "@/components/ui/tooltip";
import { SelectMenu } from "@/components/ui/select-menu";
import { cn } from "@/lib/utils";
import { CampoNumero } from "./campo-numero";
import { CenarioSliders } from "./cenario-sliders";
import { BlocoRecolhivel } from "./secao-resultado";
import { Alternador, BlocoEstrutura } from "./estrutura-compartilhada";
import { usePremissas } from "./premissas-context";

// Etapa 02b — ajustes avançados. Opcional, e alcançada só pela pergunta 8.
//
// É o lugar onde os times passam a existir. Antes desta passagem eles viviam
// num stepper lateral montado ao lado de TODAS as perguntas: quem simulava um
// time só — que é o caso comum, e o `TIMES_HELP` diz isso — pagava uma coluna
// de 264px e um mapa de times × passos para não usar nenhum dos dois. Aqui a
// grade mostra a operação inteira de uma vez, que é o que faz sentido quando já
// existem dois ou três times para comparar.
//
// A estrutura compartilhada (§4.11) também migrou para cá pelo mesmo motivo:
// ela só tem sentido com mais de um time, e ramificava o formulário no meio do
// preenchimento.

// Os campos numéricos de um time, na ordem em que a grade os mostra. Plano e
// caminho ficam de fora porque são select, não número.
const CAMPOS_GRADE: Exclude<CampoId, "caminho">[] = [
  "numVendedores",
  "numGestoresTreino",
  "horasTreinoGestorMes",
  "vendedoresPorGestorMes",
  "horasPraticaPorRepHoje",
  "salarioGestor",
  "receitaMensal",
  "ticketMedio",
  "conversaoPct",
  "margemPct",
  "rampaMeses",
  "contratacoesAno",
  "salarioVendedor",
  "leadsMes",
  "cicloDias",
];

const CAMINHO_OPCOES = (Object.keys(CAMINHOS) as Caminho[]).map((id) => ({
  value: id,
  label: CAMINHOS[id].label,
}));

// Nome do time, editável inline no lugar do antigo `<h3>` estático. Segue o
// padrão "adjust state during render" do `CampoNumero`: o texto local só é
// atropelado por fora quando o campo não está focado, então o autosave (que
// pode devolver o mesmo nome já sanitizado) nunca briga com quem está
// digitando. Comita no blur/Enter — renomear é uma ação discreta, não um
// campo que precisa de autosave a cada tecla — e cancela (volta ao nome
// atual) no Escape ou se o campo ficar vazio: a sanitização de verdade
// (`sanitizarNomeTime`) já roda no boundary do autosave server-side.
function CampoNomeTime({
  id,
  nome,
  onChange,
}: {
  id: string;
  nome: string;
  onChange: (nome: string) => void;
}) {
  const [texto, setTexto] = useState(nome);
  const [focado, setFocado] = useState(false);
  const [nomeAnterior, setNomeAnterior] = useState(nome);
  if (nome !== nomeAnterior) {
    setNomeAnterior(nome);
    if (!focado) setTexto(nome);
  }

  const confirmar = (valor: string) => {
    const limpo = valor.trim();
    if (limpo === "" || limpo === nome) {
      setTexto(nome);
      return;
    }
    setTexto(limpo);
    onChange(limpo);
  };

  return (
    <input
      id={id}
      type="text"
      value={texto}
      maxLength={NOME_MAX}
      aria-label="Nome do time"
      autoComplete="off"
      onFocus={() => setFocado(true)}
      onChange={(event) => setTexto(event.target.value)}
      onBlur={() => {
        setFocado(false);
        confirmar(texto);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          setTexto(nome);
          event.currentTarget.blur();
        }
      }}
      className={cn(
        "pf-title w-56 max-w-full min-w-0 truncate rounded-sm border border-transparent bg-transparent px-1 -mx-1 text-(--pf-ink) outline-none transition-colors",
        "hover:border-(--pf-line-strong)",
        "focus-visible:border-(--pf-brand) focus-visible:ring-2 focus-visible:ring-(--pf-brand)/35",
      )}
    />
  );
}

function CardTime({
  time,
  estruturaAtiva,
  onChangeCampo,
  onChangeNome,
  onChangePlano,
  onChangeAssentos,
  onChangeCenario,
  onRemover,
}: {
  time: TimeModelo;
  estruturaAtiva: boolean;
  onChangeCampo: (campo: CampoId, valor: EntradasTime[CampoId]) => void;
  onChangeNome: (nome: string) => void;
  onChangePlano: (plano: PlanoId) => void;
  onChangeAssentos: (assentos: number | null) => void;
  onChangeCenario: (sel: CenarioSelecionado) => void;
  onRemover?: () => void;
}) {
  // Com a estrutura ligada, os campos dela saem da grade do time: eles passam a
  // ser declarados uma vez para a conta, e mostrá-los aqui convidaria a editar
  // um valor que o rateio ia sobrescrever.
  const [deltasAbertos, setDeltasAbertos] = useState(false);
  const p = usePremissas();
  const planoOpcoes = (Object.keys(PLANOS) as PlanoId[]).map((id) => ({
    value: id,
    label: `${PLANOS[id].label} · ${p.horasPlanos[id]}h`,
  }));
  const compartilhados: CampoId[] = estruturaAtiva
    ? ["numGestoresTreino", "horasTreinoGestorMes", "vendedoresPorGestorMes", "salarioGestor"]
    : [];
  const caminhoNaGrade = !estruturaAtiva;
  const entradas = time.estadoTime.entradas;
  const caminho = entradas.caminho;

  return (
    <section className="flex flex-col gap-5 rounded-md border border-(--pf-line) bg-(--pf-surface) p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="group flex min-w-0 items-center gap-1.5">
          <CampoNomeTime id={`av-nome-${time.id}`} nome={time.nome} onChange={onChangeNome} />
          <PencilSquareIcon
            aria-hidden
            className="h-4 w-4 shrink-0 text-(--pf-ink-faint) opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          />
        </div>
        {onRemover ? (
          <Button variant="tertiary" size="sm" icon={TrashIcon} onClick={onRemover}>
            Remover
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 grid-rows-[auto_auto_auto_auto] gap-x-4 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
        <Field
          label="Plano"
          htmlFor={`av-plano-${time.id}`}
          escala="leitura"
          alinhado
        >
          <SelectMenu
            id={`av-plano-${time.id}`}
            options={planoOpcoes}
            value={time.proposta.plano}
            onChange={(valor) => onChangePlano(valor as PlanoId)}
            ariaLabel={`Plano de ${time.nome}`}
          />
        </Field>
        <Field
          label="Assentos"
          help={
            time.assentosLimitados
              ? "Travado no tamanho do time."
              : time.assentosDefault
                ? "1 por vendedor."
                : undefined
          }
          htmlFor={`av-assentos-${time.id}`}
          escala="leitura"
          alinhado
        >
          <CampoNumero
            id={`av-assentos-${time.id}`}
            valor={time.estadoTime.proposta.assentos}
            formato="numero"
            inteiro
            placeholder="Ex.: 30"
            onChange={onChangeAssentos}
          />
        </Field>

        {CAMPOS_GRADE.filter((campo) => !compartilhados.includes(campo)).map((campo) => {
          const def = CAMPO_DEFS[campo];
          const id = `av-${campo}-${time.id}`;
          return (
            <Field key={campo} label={def.label} htmlFor={id} escala="leitura" alinhado>
              <CampoNumero
                id={id}
                valor={entradas[campo] as number | null}
                formato={def.formato}
                inteiro={def.inteiro}
                placeholder={def.placeholder}
                onChange={(valor) => onChangeCampo(campo, valor)}
              />
            </Field>
          );
        })}

        {caminhoNaGrade ? (
          <Field
            label="Treinamento hoje"
            htmlFor={`av-caminho-${time.id}`}
            escala="leitura"
            alinhado
          >
            <SelectMenu
              id={`av-caminho-${time.id}`}
              options={CAMINHO_OPCOES}
              value={caminho ?? ""}
              onChange={(valor) => onChangeCampo("caminho", valor as Caminho)}
              ariaLabel={CAMINHO_LABEL}
            />
          </Field>
        ) : null}

        {caminhoNaGrade && caminho === "externo" ? (
          <Field
            label={CAMPO_DEFS.custoExternoAno.label}
            htmlFor={`av-custoExternoAno-${time.id}`}
            escala="leitura"
            alinhado
          >
            <CampoNumero
              id={`av-custoExternoAno-${time.id}`}
              valor={entradas.custoExternoAno}
              formato="moeda"
              placeholder={CAMPO_DEFS.custoExternoAno.placeholder}
              onChange={(valor) => onChangeCampo("custoExternoAno", valor)}
            />
          </Field>
        ) : null}
        {caminhoNaGrade && caminho === "evento" ? (
          <Field
            label={CAMPO_DEFS.custoEventoAno.label}
            htmlFor={`av-custoEventoAno-${time.id}`}
            escala="leitura"
            alinhado
          >
            <CampoNumero
              id={`av-custoEventoAno-${time.id}`}
              valor={entradas.custoEventoAno}
              formato="moeda"
              placeholder={CAMPO_DEFS.custoEventoAno.placeholder}
              onChange={(valor) => onChangeCampo("custoEventoAno", valor)}
            />
          </Field>
        ) : null}
      </div>

      {/* Os sliders de cenário vivem aqui desde 20/08/2026. Estavam no
          resultado, recalculando o número ao vivo debaixo do próprio número —
          agora a projeção se escolhe antes de ver a resposta, e a resposta para
          de se mexer enquanto se lê. */}
      <BlocoRecolhivel
        id={`av-deltas-${time.id}`}
        titulo="Ajuste fino de deltas (em branco = preset do cenário)"
        aberto={deltasAbertos}
        onToggle={() => setDeltasAbertos((atual) => !atual)}
      >
        <CenarioSliders
          sel={time.sel}
          entradas={time.entradas}
          onChange={onChangeCenario}
        />
      </BlocoRecolhivel>
    </section>
  );
}

export function EtapaAvancada({
  modelo,
  estrutura,
  onChangeEstrutura,
  onChangeCampo,
  onChangeNome,
  onChangePlano,
  onChangeAssentos,
  onChangeCenario,
  onAddTime,
  onRemoverTime,
  onVoltar,
  onVerRelatorio,
  vendedoresDaConta,
}: {
  modelo: ModeloCalculadora;
  estrutura: EstruturaCompartilhada;
  onChangeEstrutura: (patch: Partial<EstruturaCompartilhada>) => void;
  onChangeCampo: (timeId: string, campo: CampoId, valor: EntradasTime[CampoId]) => void;
  onChangeNome: (timeId: string, nome: string) => void;
  onChangePlano: (timeId: string, plano: PlanoId) => void;
  onChangeAssentos: (timeId: string, assentos: number | null) => void;
  onChangeCenario: (timeId: string, sel: CenarioSelecionado) => void;
  onAddTime: () => void;
  onRemoverTime: (time: TimeModelo) => void;
  onVoltar: () => void;
  onVerRelatorio: () => void;
  vendedoresDaConta: number;
}) {
  const multiTime = modelo.times.length > 1;
  const ativa = multiTime && estrutura.ativa;

  return (
    <div className="fade-in-up mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span
          className="pf-panel-title text-(--pf-brand)"
          aria-hidden
        >
          Etapa opcional · modo avançado
        </span>
        <h1 className="pf-display text-(--pf-ink)">
          Mais times e ajuste fino de deltas
        </h1>
        <p className="pf-lead text-(--pf-ink-soft)">
          O primeiro time já vem preenchido com as respostas do quiz. Adicione
          outros (até {MAX_TIMES}) e, se quiser, sobrescreva os deltas do cenário —
          em branco vale a predefinição.
        </p>
      </div>

      {multiTime ? (
        <div className="flex flex-col gap-4 rounded-md border border-(--pf-line) bg-(--pf-surface) p-5 sm:p-6">
          <Alternador
            ativa={estrutura.ativa}
            onToggle={(valor) => onChangeEstrutura({ ativa: valor })}
          />
          {ativa ? (
            <div className="flex flex-col gap-4">
              {(["gestores", "salario", "caminho"] as const).map((secao) => (
                <BlocoEstrutura
                  key={secao}
                  secao={secao}
                  estrutura={estrutura}
                  onChange={onChangeEstrutura}
                  vendedoresDoTime={modelo.times[0].entradas.numVendedores}
                  vendedoresDaConta={vendedoresDaConta}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {modelo.times.map((time) => (
          <CardTime
            key={time.id}
            time={time}
            estruturaAtiva={ativa}
            onChangeCampo={(campo, valor) => onChangeCampo(time.id, campo, valor)}
            onChangeNome={(nome) => onChangeNome(time.id, nome)}
            onChangePlano={(plano) => onChangePlano(time.id, plano)}
            onChangeAssentos={(assentos) => onChangeAssentos(time.id, assentos)}
            onChangeCenario={(sel) => onChangeCenario(time.id, sel)}
            onRemover={multiTime ? () => onRemoverTime(time) : undefined}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onAddTime}
          disabled={modelo.times.length >= MAX_TIMES}
          className={cn(
            "inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-dashed border-(--pf-line) px-5 text-sm font-medium text-(--pf-ink-soft) transition-colors",
            "hover:border-(--pf-ink-faint)/50 hover:text-(--pf-ink)",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pf-brand)/35",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <PlusIcon className="h-4 w-4" aria-hidden />
          Adicionar time
        </button>
        {/* Irmão do botão, nunca filho: botão dentro de botão é HTML inválido. */}
        <HintTooltip text={TIMES_HELP} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--pf-line) pt-5">
        <Button variant="secondary" icon={ArrowLeftIcon} onClick={onVoltar}>
          Voltar ao quiz
        </Button>
        <Button variant="primary" onClick={onVerRelatorio}>
          Ver meu relatório de ROI
        </Button>
      </div>
    </div>
  );
}
