"use client";

import { useState } from "react";
import {
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { CAMPO_DEFS } from "@/lib/calculadora/campos";
import {
  CAMINHOS,
  FATOR_ESCOPO_PREMISSA,
  PLANOS,
} from "@/lib/calculadora/constants";
import { PASSOS } from "@/lib/calculadora/estado";
import {
  formatBRL,
  formatMeses,
  formatNumero,
  formatPct,
  formatX,
} from "@/lib/calculadora/format";
import type {
  AvisoCoerencia,
  CampoId,
  EntradasTime,
  ResultadoTime,
} from "@/lib/calculadora/types";
import { cn } from "@/lib/utils";
import { HintTooltip } from "@/components/ui/tooltip";
import { MedidorChecagem } from "./graficos-resultado";
import { BlocoRecolhivel } from "./secao-resultado";

type ResultadoOk = Extract<ResultadoTime, { status: "ok" }>;

// ---------------------------------------------------------------------------
// Hero — o número-manchete. Margem é a manchete, nunca horas (P1).
// ---------------------------------------------------------------------------

// Dois tons para a MESMA composição.
//
// O claro é a superfície padrão do sistema (§5) e serve a vista interna, onde o
// hero se repete por time dentro de um dossiê de cards brancos — quatro blocos
// escuros empilhados ali seriam peso sem hierarquia.
//
// O destaque é o bloco-resposta: o que a pessoa passou cinco passos
// construindo. Ele se separa dos outros pelo TAMANHO do número
// (`--text-score-xl`, um degrau acima de tudo na página) e por um wash azul na
// diagonal sobre branco — não por superfície nem por moldura próprias. A borda
// é a mesma `slate-200` do resto da pilha.
//
// Duas tentativas anteriores: superfície verde inteira (`bg-surface-positive`),
// que obrigava toda a paleta interna a migrar para `-ink` e ainda assim lia
// como bloco de outro produto; e contorno em gradiente azul→verde sobre esse
// verde, em que as duas pontas do gradiente brigavam com o fundo. Sobre branco
// o wash resolve o mesmo problema sem nenhuma das duas cobranças.
//
// Classes por slot, nunca condicional apendada: `cn` é clsx puro, sem
// tailwind-merge, então `bg-white` e um `bg-*` empilhados não se resolvem por
// ordem de argumento.
//
// A semântica de cor sobrevive à troca (§1, "verde = entra na conta"): só o
// valor gerado é verde. Payback é tempo e investimento é custo — os dois ficam
// slate-900 nos dois tons.
const TOM = {
  claro: {
    card: "rounded-sm border border-trend-positive/30 bg-white p-6",
    gap: "gap-4",
    titulo: "text-slate-700",
    nota: "text-slate-400",
    numero: "text-(length:--text-score-lg) leading-[3.5rem] text-trend-positive",
    regua: "sm:border-l sm:border-slate-100",
    apoioPositivo: "text-trend-positive",
    apoioNeutro: "text-slate-900",
    // Rótulo de KPI é o que nomeia o número: em slate-500 ele quase some
    // debaixo de um valor em peso 600. Um degrau acima resolve sem competir.
    rotulo: "text-slate-600",
    frase: "text-slate-700",
    chip: "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 focus-visible:ring-primary/35",
    ressalva: "text-slate-500",
    checagem: "border-slate-100 text-slate-500",
    checagemAlerta: "border-[#973C00]/25 text-[#973C00]",
  },
  destaque: {
    // `bg-white` é a COR e o wash é a IMAGEM por cima dela — propriedades
    // diferentes, então os dois convivem sem depender da ordem das classes.
    // O gradiente morre em 60%: passando disso o canto inferior direito perde
    // o branco e o wash vira fundo tingido, que é outra coisa.
    //
    // O que distingue este bloco é a SUPERFÍCIE, não um brilho atrás do glifo.
    // O halo radial verde que ficava sob o múltiplo era decoração: sem deslocamento
    // e sem borrão que signifique profundidade, ele só pintava um oval em volta de
    // um número que já é o maior da página. Tirado, o destaque continua inteiro —
    // e passa a valer para o bloco todo em vez de um caractere.
    card: "rounded-md border border-slate-200 bg-white bg-linear-to-br from-primary/8 to-transparent to-60% p-6 sm:p-8",
    gap: "gap-6",
    titulo: "text-slate-800",
    nota: "text-slate-500",
    // Sobre branco o verde volta a ser `text-trend-positive`: `-ink` existe
    // para segurar contraste sobre o verde claro, que saiu daqui.
    numero:
      "text-(length:--text-score-lg) leading-[3.5rem] @2xl:text-(length:--text-score-xl) @2xl:leading-[4.5rem] text-trend-positive",
    regua: "sm:border-l sm:border-slate-100",
    apoioPositivo: "text-trend-positive",
    apoioNeutro: "text-slate-900",
    // Rótulo de KPI é o que nomeia o número: em slate-500 ele quase some
    // debaixo de um valor em peso 600. Um degrau acima resolve sem competir.
    rotulo: "text-slate-600",
    frase: "text-slate-700",
    chip: "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 focus-visible:ring-primary/35",
    ressalva: "text-slate-500",
    checagem: "border-slate-100 text-slate-500",
    checagemAlerta: "border-[#973C00]/25 text-[#973C00]",
  },
} as const;

export function HeroResultado({
  titulo,
  roi,
  paybackMeses,
  valorAno,
  precoAno,
  frase,
  racional,
  chips,
  checagem,
  tom = "claro",
}: {
  titulo: string;
  roi: number | null;
  paybackMeses: number | null;
  valorAno: number | null;
  precoAno?: number | null;
  frase: string | null;
  // Como se chegou neste múltiplo, em um balão ao lado do número. É a primeira
  // pergunta de quem vai bancar a conta, e ela não pode custar uma rolagem
  // até "De onde vem o número" para ser respondida.
  racional?: string;
  chips?: { label: string; href: string }[];
  // Checagem de realidade (§4.7) como rodapé do hero: é uma frase sobre o
  // número que está logo acima. Card próprio para um parágrafo era altura
  // paga sem hierarquia comprada.
  checagem?: { pct: number; alerta: boolean };
  tom?: "claro" | "destaque";
}) {
  const cores = TOM[tom];
  const abaixoDe1 = roi !== null && roi < 1;
  return (
    <section className={cn("flex flex-col", cores.gap, cores.card)}>
      {/* Sem selo nem ressalva aqui: "projeção, não medição" está no
          disclaimer do resumo, e repetido no alto do bloco-resposta virava a
          primeira coisa lida — a tela abria pedindo desculpa pelo número. O
          racional migrou para o balão ao lado do múltiplo, que é onde a
          pergunta de fato nasce. */}
      <h3 className={cn("text-center text-base font-semibold", cores.titulo)}>
        {titulo}
      </h3>

      {/* O ROI É uma fração, e o hero mostra a fração.
          
          O layout anterior punha o múltiplo à esquerda e três KPIs soltos à
          direita, todos do mesmo peso: a relação entre eles ficava implícita e
          quem confere tinha de dividir de cabeça para ver a conta fechar.
          Aqui o numerador e o denominador aparecem nos dois lados de um sinal
          de divisão de verdade, e o resultado vem depois do igual — a mesma
          leitura de uma memória de cálculo, que é o documento que esta pessoa
          lê todos os dias.

          Centralizado porque é o veredito: não é uma linha de tabela, é a
          resposta que a pessoa passou cinco passos construindo. */}
      <div className="flex flex-col items-center gap-6 py-2 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-4">
          <div className="flex flex-col gap-1">
            <span
              className={cn(
                "text-2xl font-semibold tabular-nums sm:text-3xl",
                cores.apoioPositivo,
              )}
            >
              {formatBRL(valorAno)}
            </span>
            <span className={cn("text-sm", cores.rotulo)}>valor no ano</span>
          </div>

          <span className={cn("text-2xl font-light sm:text-3xl", cores.nota)} aria-hidden>
            ÷
          </span>

          <div className="flex flex-col gap-1">
            <span
              className={cn(
                "text-2xl font-semibold tabular-nums sm:text-3xl",
                cores.apoioNeutro,
              )}
            >
              {formatBRL(precoAno ?? null)}
            </span>
            <span className={cn("text-sm", cores.rotulo)}>investimento no ano</span>
          </div>

          {/* O igual anda GRUPADO com o resultado. Solto, ele era só mais um
              item do wrap: em coluna estreita a conta quebrava depois dele e a
              primeira linha terminava num operador pendurado, sem nada à
              direita, enquanto o múltiplo descia sozinho. Operador e resultado
              são uma coisa só — quebram juntos ou não quebram. */}
          <div className="flex items-center gap-x-5">
            <span className={cn("text-2xl font-light sm:text-3xl", cores.nota)} aria-hidden>
              =
            </span>

            {/* `relative` para o balão do tooltip se ancorar aqui. */}
            <div className="relative flex flex-col gap-1">
              <span className={cn("font-semibold tabular-nums", cores.numero)}>
                {formatX(roi)}
              </span>
              <span
                className={cn(
                  "flex items-center justify-center gap-1.5 text-sm",
                  cores.rotulo,
                )}
              >
                no primeiro ano
                {racional ? <HintTooltip text={racional} align="right" /> : null}
              </span>
            </div>
          </div>
        </div>

        {/* Payback numa faixa própria: é a pergunta seguinte à do múltiplo, e
            como quarta coluna da conta ele confundia — não é fator da divisão,
            é consequência dela. */}
        <p className={cn("text-base leading-7", cores.frase)}>
          A conta se paga em{" "}
          <span className={cn("font-semibold tabular-nums", cores.apoioNeutro)}>
            {formatMeses(paybackMeses)}
          </span>
          {frase ? ` · ${frase}` : ""}
        </p>

        {chips && chips.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {chips.map((chip) => (
              <a
                key={chip.href}
                href={chip.href}
                className={cn(
                  "inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium transition-colors sm:min-h-9",
                  "focus-visible:outline-none focus-visible:ring-2",
                  cores.chip,
                )}
              >
                {chip.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>

      {abaixoDe1 ? (
        <p className={cn("text-center text-sm leading-6", cores.ressalva)}>
          Com estes números a projeção fica abaixo de 1×. Recomendamos medir um
          baseline num piloto antes de contratar.
        </p>
      ) : null}

      {checagem ? (
        <div className={cn("flex flex-col gap-3 border-t pt-6", cores.checagem)}>
          <p
            className={cn(
              "flex items-start gap-2 text-sm leading-6",
              checagem.alerta ? cores.checagemAlerta : cores.checagem,
              "border-t-0 pt-0",
            )}
          >
            {checagem.alerta ? (
              <ExclamationTriangleIcon className="mt-1 h-4 w-4 shrink-0" aria-hidden />
            ) : null}
            <span>
              <span className="font-medium">Checagem de realidade:</span> os ganhos de
              performance projetados equivalem a{" "}
              <span className="font-semibold tabular-nums">
                {formatPct(checagem.pct, 1)}
              </span>{" "}
              da margem anual do time hoje.{" "}
              {checagem.alerta
                ? "Acima de 25% a projeção pede ceticismo: vale reduzir o cenário antes de decidir."
                : "É uma faixa plausível para um time que passa a praticar com consistência."}
            </span>
          </p>
          {/* A régua desenhada põe o número contra o limite que o CFO conhece:
              a frase sozinha exigia comparar 11,5% com 25% de cabeça. */}
          <MedidorChecagem pct={checagem.pct} />
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Gating: sem as parcelas obrigatórias não há número — travessão e a lista
// do que falta (§4.6). Nunca resultado parcial.
// ---------------------------------------------------------------------------

export function ResultadoIncompleto({
  faltando,
  onIrParaPasso,
}: {
  faltando: CampoId[];
  onIrParaPasso?: (passo: 1 | 2 | 3 | 4 | 5) => void;
}) {
  const porPasso = PASSOS.map((passo) => ({
    passo,
    campos: faltando.filter((campo) => passo.campos.includes(campo)),
  })).filter((grupo) => grupo.campos.length > 0);

  function labelDe(campo: CampoId): string {
    if (campo === "caminho") return "A alternativa sem a Perfecting";
    return CAMPO_DEFS[campo].label;
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-(length:--text-score-lg) font-semibold leading-12 tabular-nums text-slate-300">
          —
        </span>
        <p className="text-sm text-slate-500">
          O resultado aparece quando todos os campos obrigatórios estiverem
          preenchidos. Nunca mostramos projeção parcial.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {porPasso.map(({ passo, campos }) => (
          <li
            key={passo.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-sm bg-slate-50/60 px-4 py-3"
          >
            <span className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-800">
                Passo {passo.id}
                {passo.titulo ? ` · ${passo.titulo}` : ""}
              </span>
              <span className="text-xs text-slate-500">
                Falta: {campos.map(labelDe).join(" · ")}
              </span>
            </span>
            {onIrParaPasso ? (
              <button
                type="button"
                onClick={() => onIrParaPasso(passo.id)}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full px-3 text-[13px] font-medium leading-5 text-[#2E63CD] transition-colors hover:text-[#1e4a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 sm:min-h-8"
              >
                <PencilSquareIcon className="h-4 w-4" aria-hidden />
                Preencher
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Linha de detalhamento (usada nos dois cards)
// ---------------------------------------------------------------------------

// Cabeçalho de parcela: o nome à esquerda, o TOTAL à direita. O número sobe
// para cá porque é a resposta do bloco — antes ele era só mais uma linha no
// meio da lista, com o mesmo peso das explicações que o sustentam.
function CabecalhoParcela({
  titulo,
  ajuda,
  valor,
}: {
  titulo: string;
  ajuda: string;
  valor: string;
}) {
  return (
    // `relative`: o balão do HintTooltip se ancora aqui.
    <div className="relative flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-slate-100 pb-3">
      <span className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-slate-800">{titulo}</h3>
        <HintTooltip text={ajuda} />
      </span>
      <span className="text-lg font-semibold tabular-nums text-trend-positive">
        {valor}
      </span>
    </div>
  );
}

// Linha de leitura tabular: rótulo, quanto muda, quanto vale. Substitui a
// pilha título → valor → detalhe → nota, que gastava quatro linhas por item e
// afogava a única informação que se soma de cima a baixo.
//
// Exportada para o bloco do Custo da Inação, que lista parcelas com a mesma
// pauta: uma sexta variante de linha rótulo/valor só faria as colunas pararem
// de bater entre as seções.
export function LinhaCompacta({
  rotulo,
  delta,
  valor,
  nota,
  tom = "neutro",
}: {
  rotulo: string;
  delta?: string;
  valor: string;
  nota?: string;
  tom?: "neutro" | "positivo";
}) {
  return (
    // Grade de duas trilhas, não `flex-wrap` + `justify-between`. Com flex, um
    // rótulo comprido (os dois que carregam selo) empurrava o valor para uma
    // segunda linha: metade das linhas da lista virava duas, o olho perdia a
    // pauta e as duas colunas da seção paravam de bater linha a linha. Na
    // grade quem quebra é o RÓTULO, dentro da própria trilha, e o valor fica
    // onde sempre esteve — a lista volta a ter uma linha por parcela.
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1">
      <dt className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
        {rotulo}
        {delta ? (
          <span className="tabular-nums font-medium text-slate-500">{delta}</span>
        ) : null}
      </dt>
      <dd
        className={cn(
          "text-right text-sm font-semibold tabular-nums",
          tom === "positivo" ? "text-trend-positive" : "text-slate-900",
        )}
      >
        {valor}
        {nota ? (
          <span className="ml-2 font-normal text-slate-500">{nota}</span>
        ) : null}
      </dd>
    </div>
  );
}

function achaLinha(resultado: ResultadoOk, id: string) {
  return resultado.linhasNaoSomadas.find((linha) => linha.id === id);
}

// ---------------------------------------------------------------------------
// Eficiência: o que você deixa de gastar (coluna esquerda). Copy sem
// redução de headcount: eficiência é cobertura e capacidade (P2).
// ---------------------------------------------------------------------------

export function EficienciaCard({
  resultado,
  entradas,
  plano,
  rateio,
}: {
  resultado: ResultadoOk;
  entradas: EntradasTime;
  plano: keyof typeof PLANOS;
  // Presente quando a estrutura de capacitação é compartilhada (§4.11): os
  // números deste card já vêm rateados, e isso precisa estar dito na tela.
  rateio?: { gestoresDaConta: number | null; pctVendedores: number } | null;
}) {
  const [detalhe, setDetalhe] = useState(false);
  const fator = resultado.fatorEscopo;
  const horasGestorMes = (entradas.horasTreinoGestorMes ?? 0) * (entradas.numGestoresTreino ?? 0);
  const repsCobertosHoje =
    (entradas.vendedoresPorGestorMes ?? 0) * (entradas.numGestoresTreino ?? 0);
  const horasPlanoPorRep = PLANOS[plano].horasMes;
  const repsCobriveisNaCarga =
    horasPlanoPorRep * fator.valor > 0 ? horasGestorMes / (horasPlanoPorRep * fator.valor) : 0;
  const filaHoje =
    repsCobriveisNaCarga > 0 ? (entradas.numVendedores ?? 0) / repsCobriveisNaCarga : null;
  const ancoragem = achaLinha(resultado, "ancoragem_hora_roleplay");
  const headcount = achaLinha(resultado, "economia_headcount");
  const teto = achaLinha(resultado, "teto_eficiencia");
  const tetoMordeu = resultado.eficienciaAno >= (teto?.valorAno ?? Infinity) - 0.005;
  const caminho = entradas.caminho;

  return (
    <section className="flex flex-col gap-4">
      <CabecalhoParcela
        titulo="Eficiência: o que deixa de ser gasto"
        ajuda="Projeção. O custo do caminho que você seguiria sem a Perfecting, limitado pelo valor da prática que o plano entrega."
        valor={`+${formatBRL(resultado.eficienciaAno)}/ano`}
      />

      <dl className="flex flex-col gap-3">
        <LinhaCompacta
          rotulo="Caminho declarado"
          valor={caminho ? CAMINHOS[caminho].label : "—"}
        />
        <LinhaCompacta
          rotulo="Teto do plano"
          valor={formatBRL(teto?.valorAno ?? null)}
          nota={tetoMordeu ? "a economia parou aqui" : undefined}
        />
      </dl>

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-500">Não somado ao ROI</p>
        <dl className="flex flex-col gap-3">
          <LinhaCompacta
            rotulo="Custo por hora de prática"
            valor={`gestor ${formatBRL(ancoragem?.detalhe?.custoHoraGestor ?? null, 2)} · Perfecting ${formatBRL(ancoragem?.detalhe?.custoHoraPerfecting ?? null, 2)}`}
          />
          <LinhaCompacta
            rotulo="Gestores que deixaria de contratar"
            valor={
              headcount?.valorAno != null
                ? `${formatNumero(headcount.detalhe?.gestores ?? null, 1)} · ${formatBRL(headcount.valorAno)}/ano`
                : "—"
            }
          />
        </dl>
      </div>

      {/* A prosa que sustenta as linhas acima sai do fluxo: com ela aberta,
          eram sete parágrafos antes de o leitor chegar ao segundo card. Quem
          precisa auditar abre; quem quer o número já o tem no cabeçalho. */}
      <BlocoRecolhivel
        id="eficiencia-detalhe"
        titulo="Como chegamos nesse número"
        aberto={detalhe}
        onToggle={() => setDetalhe((atual) => !atual)}
      >
        <div className="flex flex-col gap-3 pl-6">
          {rateio ? (
            <p className="text-sm leading-6 text-slate-600">
              Os {formatNumero(rateio.gestoresDaConta, 0)} gestores da conta atendem mais
              de um time: {formatNumero(rateio.pctVendedores * 100, 0)}% da economia cabe
              a este. Sem o rateio, a mesma estrutura seria contada uma vez por time.
            </p>
          ) : null}
          <p className="text-sm leading-6 text-slate-600">
            {fator.origem === "declarado"
              ? `Seus gestores cobrem ${formatNumero(repsCobertosHoje, 0)} vendedores por mês, com ${formatNumero(entradas.horasPraticaPorRepHoje, 1)} h de prática cada — cada hora de prática consome ${formatNumero(fator.valor, 1)} h de gestor. Na carga do plano ${PLANOS[plano].label}, as mesmas horas cobririam ${formatNumero(repsCobriveisNaCarga, 1)}.`
              : `Seus números de treino ficaram fora da faixa de validade (0,25–6 h de gestor por hora de prática), então usamos a premissa de ${formatNumero(FATOR_ESCOPO_PREMISSA, 1)} h.`}
            {fator.treinoEmGrupo
              ? " Fator abaixo de 1 indica treino em grupo: a comparação por hora não captura prática coletiva."
              : ""}
          </p>
          {filaHoje !== null && filaHoje > 0 ? (
            <p className="text-sm leading-6 text-slate-600">
              Nessa carga, cobrir o time inteiro levaria {formatMeses(filaHoje)}. Com{" "}
              {formatNumero(resultado.cobertura * 100, 0)}% praticando em paralelo, a fila
              some — e os {formatNumero(horasGestorMes, 0)} h/mês de gestor voltam para a
              gestão.
            </p>
          ) : null}
          <p className="text-sm leading-6 text-slate-500">
            As duas últimas linhas ficam fora do ROI de propósito: a comparação por hora
            já está contada na economia do caminho declarado, e nenhum cálculo aqui
            pressupõe reduzir a equipe.
          </p>
        </div>
      </BlocoRecolhivel>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Performance: o que o time passa a ganhar (coluna direita)
// ---------------------------------------------------------------------------

export function PerformanceCard({
  resultado,
  entradas,
}: {
  resultado: ResultadoOk;
  entradas: EntradasTime;
}) {
  const [detalhe, setDetalhe] = useState(false);
  const { parcelas, deltas } = resultado;
  const conv = entradas.conversaoPct;
  const receitaRepPleno =
    entradas.numVendedores && entradas.receitaMensal
      ? entradas.receitaMensal / entradas.numVendedores
      : null;
  const receitaAntecipadaPorRep =
    receitaRepPleno !== null ? (entradas.rampaMeses ?? 0) * deltas.rampaPct * receitaRepPleno : null;
  const rampaEvitada = achaLinha(resultado, "custo_rampa_evitado");
  const timeEmRampa = achaLinha(resultado, "custo_time_em_rampa");
  const temFunil = parcelas.ganhoCicloAno !== null;
  // Abaixo de 7 dias o ciclo anda em percentual, não em dias inteiros: a frase
  // "N dias em vez de M" só vale no ramo de dias (Excel Engine!C53).
  const cicloEmDias = temFunil && deltas.cicloDiasMenos > 0;
  const cicloTetoMordeu = temFunil && (parcelas.ganhoCicloAno ?? 0) < 0.005;
  // Excel Engine!C69: o teto de funil cortou o ganho sem zerá-lo. Sem dizer os
  // dois números, a trava fica invisível — o leitor vê um ciclo menor que a
  // capacidade liberada e não tem como conferir por quê.
  const tetoFunil = resultado.tetoFunil;
  const cicloTetoCortou = !cicloTetoMordeu && tetoFunil !== null && tetoFunil.limitou;

  return (
    <section className="flex flex-col gap-4">
      <CabecalhoParcela
        titulo="Performance: o que passa a ser ganho"
        ajuda="Projeção. Vendedores treinados vendem melhor e rampam mais rápido. Estimulamos, não controlamos; por isso o desconto de 30% em três das quatro alavancas."
        valor={`+${formatBRL(resultado.G)}/ano`}
      />

      {/* Uma linha por alavanca: nome, quanto muda, quanto vale. Antes cada
          uma trazia um parágrafo de explicação, e quatro parágrafos empilhados
          escondiam justamente a tabela que o CFO quer somar de cima a baixo. */}
      <dl className="flex flex-col gap-3">
        <LinhaCompacta
          rotulo="Ticket médio"
          delta={`+${formatNumero(deltas.ticketPct * 100, 0)}%`}
          valor={`+${formatBRL(parcelas.margemTicketAno)}/ano`}
          tom="positivo"
        />
        <LinhaCompacta
          rotulo="Conversão"
          delta={`+${formatNumero(deltas.convPp, 1)} p.p.`}
          valor={`+${formatBRL(parcelas.ganhoConversaoAno)}/ano`}
          tom="positivo"
        />
        <LinhaCompacta
          rotulo="Rampa"
          delta={`−${formatNumero(deltas.rampaPct * 100, 0)}%`}
          valor={`+${formatBRL(parcelas.margemRampaAno)}/ano`}
          tom="positivo"
        />
        <LinhaCompacta
          rotulo="Ciclo de venda"
          delta={
            temFunil
              ? cicloEmDias
                ? `−${deltas.cicloDiasMenos} ${deltas.cicloDiasMenos === 1 ? "dia" : "dias"}`
                : `−${formatNumero(deltas.cicloPct * 100, 0)}%`
              : undefined
          }
          valor={
            temFunil ? `+${formatBRL(parcelas.ganhoCicloAno)}/ano` : "preencha o funil"
          }
          tom={temFunil ? "positivo" : "neutro"}
        />
      </dl>

      <BlocoRecolhivel
        id="performance-detalhe"
        titulo="Como chegamos nesse número"
        aberto={detalhe}
        onToggle={() => setDetalhe((atual) => !atual)}
      >
        <div className="flex flex-col gap-3 pl-6">
          <p className="text-sm leading-6 text-slate-600">
            {conv !== null
              ? `Conversão de ${formatPct(conv, 1)} para ${formatPct(conv + deltas.convPp, 1)} nas mesmas oportunidades. `
              : ""}
            {receitaAntecipadaPorRep !== null
              ? `Cada vendedor novo antecipa ${formatBRL(receitaAntecipadaPorRep)} de receita. `
              : ""}
            Tudo sobre a margem declarada, com a cobertura de assentos aplicada e desconto
            de 30% em rampa, conversão e ciclo.
          </p>
          {temFunil ? (
            <p className="text-sm leading-6 text-slate-600">
              {cicloTetoMordeu
                ? "O ganho de ciclo parou no teto de funil: sem oportunidade sobrando, fechar mais rápido não gera receita nova."
                : cicloTetoCortou
                  ? `O teto de funil definiu essa parcela: o ciclo mais curto liberaria ${formatNumero(tetoFunil!.ganhoCapacidadeVendasMes, 1)} vendas/mês de capacidade, e as oportunidades ociosas sustentam ${formatNumero(tetoFunil!.tetoVendasMes, 1)}. Entra o menor dos dois.`
                  : "Do ciclo só vira receita a capacidade que o funil consegue alimentar."}
            </p>
          ) : null}
          {rampaEvitada?.valorAno != null || timeEmRampa?.valorAno != null ? (
            <p className="text-sm leading-6 text-slate-500">
              Fora da conta: {formatBRL(timeEmRampa?.valorAno ?? null)}/ano de folha em
              vendedores que ainda não rendem o que consomem. Esse salário não é
              economizado — encurtar a rampa faz a mesma folha render antes, e essa
              receita já está no total acima.
            </p>
          ) : null}
        </div>
      </BlocoRecolhivel>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Checagem de realidade (§4.7) + avisos de coerência
// ---------------------------------------------------------------------------

export function ChecagemRealidade({ resultado }: { resultado: ResultadoOk }) {
  return (
    <section
      className={cn(
        "flex items-start gap-3 rounded-sm border p-4",
        resultado.checagemAlerta
          ? "border-[#973C00]/25 bg-[#FFFBEB]"
          : "border-slate-200 bg-white",
      )}
    >
      {resultado.checagemAlerta ? (
        <ExclamationTriangleIcon className="mt-1 h-5 w-5 shrink-0 text-[#973C00]" aria-hidden />
      ) : (
        <ArrowTrendingUpIcon className="mt-1 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
      )}
      <div className="flex flex-col gap-1">
        <span
          className={cn(
            "text-sm font-medium",
            resultado.checagemAlerta ? "text-[#973C00]" : "text-slate-800",
          )}
        >
          Checagem de realidade
        </span>
        <p
          className={cn(
            "text-sm leading-6",
            resultado.checagemAlerta ? "text-[#973C00]/90" : "text-slate-600",
          )}
        >
          Os ganhos de performance projetados equivalem a{" "}
          <span className="font-semibold tabular-nums">
            {formatPct(resultado.checagemRealidadePct, 1)}
          </span>{" "}
          da margem anual do time hoje.{" "}
          {resultado.checagemAlerta
            ? "Acima de 25% a projeção pede ceticismo: vale reduzir o cenário antes de decidir."
            : "É uma faixa plausível para um time que passa a praticar com consistência."}
        </p>
        <MedidorChecagem pct={resultado.checagemRealidadePct} />
      </div>
    </section>
  );
}

export function AvisosCoerencia({ avisos }: { avisos: AvisoCoerencia[] }) {
  // Os três avisos do §4.7 — alertam sem travar edição. `fator_treino_grupo`
  // fica de fora de propósito: é ressalva metodológica sobre o que a
  // comparação por hora não captura, não incoerência de dado, e já tem lugar
  // próprio na linha "Cobertura de treino declarada". Âmbar ali leria como
  // erro de preenchimento onde não há erro nenhum.
  const relevantes = avisos.filter(
    (aviso) =>
      aviso.tipo === "receita_por_vendedor" ||
      aviso.tipo === "funil_fecha_mais" ||
      aviso.tipo === "fator_fora_faixa" ||
      aviso.tipo === "payback_excede_contrato",
  );
  if (relevantes.length === 0) return null;

  function texto(aviso: AvisoCoerencia): string {
    if (aviso.tipo === "receita_por_vendedor") {
      return `A receita por vendedor (${formatBRL(aviso.valor)}/mês) está fora da faixa usual de R$ 5 mil a R$ 1 milhão. Confira receita e nº de vendedores.`;
    }
    if (aviso.tipo === "funil_fecha_mais") {
      return `Seu funil fecha mais do que chega: ${formatNumero(aviso.oportunidadesMes, 0)} oportunidades trabalhadas/mês contra ${formatNumero(aviso.leadsMes, 0)} que entram. Confira conversão e volume.`;
    }
    if (aviso.tipo === "fator_fora_faixa") {
      return `Seus números de treino dão ${formatNumero(aviso.declarado, 1)} h de gestor por hora de prática, fora da faixa de validade de 0,25 a 6. Usamos a premissa declarada de ${formatNumero(FATOR_ESCOPO_PREMISSA, 1)} h no lugar. Confira horas de treino, gestores e vendedores cobertos.`;
    }
    if (aviso.tipo === "payback_excede_contrato") {
      return `O payback projetado (${formatMeses(aviso.paybackMeses)}) passa do prazo escolhido de ${aviso.prazoMeses} meses: o contrato termina antes de a conta se pagar. Um prazo maior, mais assentos ou um cenário revisto deixam a proposta defensável.`;
    }
    return "";
  }

  return (
    <div className="flex flex-col gap-2">
      {relevantes.map((aviso, index) => (
        <p
          key={index}
          className="flex items-start gap-2 rounded-sm border border-[#973C00]/25 bg-[#FFFBEB] px-4 py-3 text-sm leading-6 text-[#973C00]"
        >
          <ExclamationTriangleIcon className="mt-1 h-4 w-4 shrink-0" aria-hidden />
          {texto(aviso)}
        </p>
      ))}
    </div>
  );
}

