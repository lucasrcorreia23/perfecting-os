"use client";

import {
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { CAMPO_DEFS, MARGEM_LABEL } from "@/lib/calculadora/campos";
import {
  CAMINHOS,
  ENCARGOS,
  FATOR_ESCOPO_PREMISSA,
  JORNADA_MENSAL_H,
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
import { SeloEvidencia, type Selo } from "./selo-evidencia";

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
    numero: "text-(length:--text-score-lg) leading-12 text-trend-positive",
    regua: "sm:border-l sm:border-slate-100",
    apoioPositivo: "text-trend-positive",
    apoioNeutro: "text-slate-900",
    rotulo: "text-slate-500",
    frase: "text-slate-600",
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
    card: "rounded-md border border-slate-200 bg-white bg-linear-to-br from-primary/8 to-transparent to-60% p-6 sm:p-8",
    gap: "gap-6",
    titulo: "text-slate-800",
    nota: "text-slate-500",
    // Sobre branco o verde volta a ser `text-trend-positive`: `-ink` existe
    // para segurar contraste sobre o verde claro, que saiu daqui.
    numero: "text-(length:--text-score-xl) leading-16 text-trend-positive",
    regua: "sm:border-l sm:border-slate-100",
    apoioPositivo: "text-trend-positive",
    apoioNeutro: "text-slate-900",
    rotulo: "text-slate-500",
    frase: "text-slate-600",
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
  chips?: { label: string; href: string }[];
  // Checagem de realidade (§4.7) como rodapé do hero: é uma frase sobre o
  // número que está logo acima. Card próprio para um parágrafo era altura
  // paga sem hierarquia comprada.
  checagem?: { pct: number; alerta: boolean };
  tom?: "claro" | "destaque";
}) {
  const cores = TOM[tom];
  const abaixoDe1 = roi !== null && roi < 1;
  // Um número manda e três apoiam. Antes eram três de peso quase igual e
  // nenhum vencia. O investimento entrou porque é a outra metade da fração —
  // sem ele o ROI é afirmação, não conta verificável (§1, worthy performance).
  // Só o valor gerado é verde. Payback é tempo, não parcela; investimento é
  // custo — os três lado a lado, em cores diferentes, dizem qual é qual sem
  // precisar de rótulo extra.
  const apoio = [
    { valor: formatMeses(paybackMeses), rotulo: "para se pagar", positivo: false },
    { valor: formatBRL(valorAno), rotulo: "de valor em 12 meses", positivo: true },
    {
      valor: precoAno != null ? `${formatBRL(precoAno / 12)}/mês` : null,
      rotulo: "de investimento",
      positivo: false,
    },
  ].filter(
    (item): item is { valor: string; rotulo: string; positivo: boolean } =>
      item.valor !== null,
  );

  return (
    <section className={cn("flex flex-col", cores.gap, cores.card)}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={cn("text-sm font-semibold", cores.titulo)}>{titulo}</h3>
        <SeloEvidencia selo="estimativa" tom={tom} />
        <span className={cn("text-xs", cores.nota)}>
          Projeção com premissas declaradas. Não é medição.
        </span>
      </div>

      {/* Um número manda e os três apoiam NA MESMA LINHA — separá-los em blocos
          empilhados custava altura para repetir a mesma hierarquia. O que separa
          os dois papéis é um fio vertical, não distância: à esquerda a resposta,
          à direita as evidências dela. Sem o fio, o `1,29×` e o `9,3 meses`
          liam como quatro KPIs de peso parecido. */}
      <div className="flex flex-wrap items-end gap-6">
        <div className="flex flex-col gap-1">
          <span
            className={cn(
              "font-semibold tabular-nums",
              cores.numero,
            )}
          >
            {formatX(roi)}
          </span>
          <span className={cn("text-xs", cores.rotulo)}>
            retorno projetado no primeiro ano
          </span>
        </div>
        <div
          className={cn(
            "flex flex-wrap items-end gap-x-8 gap-y-4 sm:pl-8",
            cores.regua,
          )}
        >
          {apoio.map((item) => (
            <div key={item.rotulo} className="flex flex-col gap-1">
              <span
                className={cn(
                  "text-lg font-semibold leading-5 tabular-nums",
                  item.positivo ? cores.apoioPositivo : cores.apoioNeutro,
                )}
              >
                {item.valor}
              </span>
              <span className={cn("text-xs", cores.rotulo)}>{item.rotulo}</span>
            </div>
          ))}
        </div>
      </div>

      {frase ? (
        <p className={cn("text-sm leading-6", cores.frase)}>{frase}</p>
      ) : null}

      {chips && chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <a
              key={chip.href}
              href={chip.href}
              className={cn(
                "inline-flex min-h-[44px] items-center rounded-full border px-4 text-xs font-medium transition-colors sm:min-h-8",
                "focus-visible:outline-none focus-visible:ring-2",
                cores.chip,
              )}
            >
              {chip.label}
            </a>
          ))}
        </div>
      ) : null}

      {abaixoDe1 ? (
        <p className={cn("text-xs", cores.ressalva)}>
          Com estes números a projeção fica abaixo de 1×. Recomendamos medir um
          baseline num piloto antes de contratar.
        </p>
      ) : null}

      {checagem ? (
        <p
          className={cn(
            "flex items-start gap-2 border-t pt-4 text-xs leading-5",
            checagem.alerta ? cores.checagemAlerta : cores.checagem,
          )}
        >
          {checagem.alerta ? (
            <ExclamationTriangleIcon className="mt-1 h-4 w-4 shrink-0" aria-hidden />
          ) : null}
          <span>
            <span className="font-medium">Checagem de realidade:</span> os ganhos de
            performance projetados equivalem a{" "}
            <span className="font-semibold tabular-nums">{formatPct(checagem.pct, 1)}</span>{" "}
            da margem anual do time hoje.{" "}
            {checagem.alerta
              ? "Acima de 25% a projeção pede ceticismo: vale reduzir o cenário antes de decidir."
              : "É uma faixa plausível para um time que passa a praticar com consistência."}
          </span>
        </p>
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
    if (campo === "margemFaixa") return MARGEM_LABEL;
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
                Passo {passo.id} · {passo.titulo}
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

// TUDO empilhado: título → valor → detalhe → nota. Uma direção de leitura só.
//
// O valor já morou à direita, em coluna própria, pela promessa de escanear os
// números alinhados na vertical. Numa coluna de ~460px essa promessa não se
// cumpre: os títulos ocupam duas ou três linhas, o número acompanha a PRIMEIRA
// delas e a coluna de valores sai desalinhada de qualquer jeito. O custo real
// era misturar direções — a linha com valor lia da esquerda para a direita, a
// linha sem valor (só título + detalhe) lia de cima para baixo, e o olho
// trocava de eixo a cada parcela.
//
// Empilhado, o número fica colado no rótulo que o nomeia e todas as parcelas
// leem igual. Quem separa uma linha da outra é o espaço (`gap-6` na lista); o
// `tabular-nums` continua, para os valores baterem coluna a coluna quando
// caírem na mesma largura.
function Linha({
  titulo,
  selo,
  valor,
  detalhe,
  nota,
  destaque = false,
  tom = "neutro",
}: {
  titulo: string;
  selo?: Selo;
  valor?: string;
  detalhe?: string;
  nota?: string;
  destaque?: boolean;
  // `positivo` = esta parcela ENTRA na conta do ROI. É o mesmo recorte que o
  // selo "não somado ao ROI" já faz em texto — por isso nenhuma linha com esse
  // selo recebe verde: a cor contradiria o selo ao lado. Custo nunca é verde
  // nem vermelho, é slate.
  tom?: "neutro" | "positivo";
}) {
  return (
    // Fio SÓ no subtotal. Antes havia um entre cada duas linhas — sete parcelas
    // viravam sete fios, e a lista lia como grade de planilha. Agora o espaço
    // separa as parcelas e o fio volta a significar uma coisa só: aqui fecha
    // uma conta.
    <div
      className={cn(
        "flex flex-col gap-1.5",
        // `first:` porque em Eficiência a linha de destaque é a PRIMEIRA: o fio
        // ali não fecharia conta nenhuma, só desenharia uma régua colada no
        // cabeçalho do bloco.
        destaque && "border-t border-slate-200 pt-6 first:border-t-0 first:pt-0",
      )}
    >
      <span className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "text-sm text-slate-800",
            destaque ? "font-semibold" : "font-medium",
          )}
        >
          {titulo}
        </span>
        {selo ? <SeloEvidencia selo={selo} /> : null}
      </span>
      {valor ? (
        <span
          className={cn(
            "font-semibold tabular-nums",
            destaque ? "text-base" : "text-sm",
            tom === "positivo" ? "text-trend-positive" : "text-slate-900",
          )}
        >
          {valor}
        </span>
      ) : null}
      {detalhe ? <p className="text-xs leading-5 text-slate-500">{detalhe}</p> : null}
      {nota ? <p className="text-xs leading-5 text-slate-400">{nota}</p> : null}
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
  const fator = resultado.fatorEscopo;
  const horasGestorMes = (entradas.horasTreinoGestorMes ?? 0) * (entradas.numGestoresTreino ?? 0);
  const repsCobertosHoje =
    (entradas.vendedoresPorGestorMes ?? 0) * (entradas.numGestoresTreino ?? 0);
  const horasPlanoPorRep = PLANOS[plano].horasMes;
  const repsCobriveisNaCarga =
    horasPlanoPorRep * fator.valor > 0 ? horasGestorMes / (horasPlanoPorRep * fator.valor) : 0;
  const filaHoje =
    repsCobriveisNaCarga > 0 ? (entradas.numVendedores ?? 0) / repsCobriveisNaCarga : null;
  const custoHoraGestor = ((entradas.salarioGestor ?? 0) * ENCARGOS) / JORNADA_MENSAL_H;
  const ancoragem = achaLinha(resultado, "ancoragem_hora_roleplay");
  const headcount = achaLinha(resultado, "economia_headcount");
  const teto = achaLinha(resultado, "teto_eficiencia");
  const tetoMordeu = resultado.eficienciaAno >= (teto?.valorAno ?? Infinity) - 0.005;
  const caminho = entradas.caminho;

  return (
    <section className="flex flex-col gap-5">
      {/* Origem e enquadramento saem do fluxo e viram um balão: lado a lado, as
          duas colunas gastavam três linhas de cabeçalho cada uma antes do
          primeiro número, e o selo "Projeção" repetido nas duas lia como ruído.
          A declaração não some — abre o texto do balão e o nome acessível do
          gatilho (invariante 5). As linhas que fogem da projeção mantêm o
          próprio selo à vista, que é onde o selo de fato informa.
          `relative`: o balão do HintTooltip se ancora no pai. */}
      <div className="relative flex items-start gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          Eficiência: o que você deixa de gastar
        </h3>
        <HintTooltip text="Projeção. Capacidade e cobertura de treino da sua operação, desde o dia zero." />
      </div>

      <div className="flex flex-col gap-6">
        <Linha
          titulo="Economia declarada"
          valor={`+${formatBRL(resultado.eficienciaAno)}/ano`}
          destaque
          tom="positivo"
          detalhe={
            caminho
              ? `${CAMINHOS[caminho].label}.${tetoMordeu ? " Limitada pelo teto: a economia nunca supera o valor da prática que o plano entrega." : ""}`
              : undefined
          }
        />
        {rateio ? (
          <Linha
            titulo="Estrutura compartilhada com os outros times"
            detalhe={`Os ${formatNumero(rateio.gestoresDaConta, 0)} gestores da conta atendem mais de um time, então a economia é rateada por vendedores: ${formatNumero(rateio.pctVendedores * 100, 0)}% dela cabe a este time. Sem o rateio, a mesma estrutura seria contada uma vez por time.`}
          />
        ) : null}
        <Linha
          titulo="Cobertura de treino declarada"
          selo={fator.origem === "declarado" ? "dado_do_cliente" : "premissa"}
          detalhe={
            fator.origem === "declarado"
              ? `Hoje seus gestores cobrem ${formatNumero(repsCobertosHoje, 0)} vendedores por mês, com ${formatNumero(entradas.horasPraticaPorRepHoje, 1)} h de prática cada: cada hora de prática consome ${formatNumero(fator.valor, 1)} h de gestor. Na carga do plano ${PLANOS[plano].label}, as mesmas horas de gestor cobririam ${formatNumero(repsCobriveisNaCarga, 1)} vendedores.`
              : `Seus números de treino ficaram fora da faixa de validade (0,25–6 h de gestor por hora de prática), então usamos a premissa declarada de ${formatNumero(FATOR_ESCOPO_PREMISSA, 1)} h de gestor por hora de prática.`
          }
          nota={
            fator.treinoEmGrupo
              ? "Fator abaixo de 1 indica treino em grupo: a comparação por hora não captura a diferença entre prática coletiva e individual."
              : undefined
          }
        />
        {filaHoje !== null && filaHoje > 0 ? (
          <Linha
            titulo="Fila para treinar o time inteiro"
            detalhe={`Na carga do plano, seus gestores levariam ${formatMeses(filaHoje)} para cobrir o time inteiro. Com ${formatNumero(resultado.cobertura * 100, 0)}% do time praticando em paralelo, a fila some.`}
          />
        ) : null}
        {horasGestorMes > 0 ? (
          <Linha
            titulo="Horas de gestor devolvidas à gestão"
            valor={`${formatNumero(horasGestorMes, 0)} h/mês`}
            detalhe={`Equivalentes a ${formatBRL(horasGestorMes * custoHoraGestor)}/mês em tempo de gestor.`}
          />
        ) : null}
        <Linha
          titulo="Custo por hora de roleplay entregue"
          selo="nao_somado"
          detalhe={`Gestor conduzindo manualmente: ${formatBRL(ancoragem?.detalhe?.custoHoraGestor ?? null, 0)}/hora · Perfecting: ${formatBRL(ancoragem?.detalhe?.custoHoraPerfecting ?? null, 0)}/hora.`}
          nota="Tabela de ancoragem: serve para comparar preço por hora, não para somar. A economia que entra no ROI é a do caminho declarado, logo acima — somar as duas contaria o mesmo benefício duas vezes."
        />
        <Linha
          titulo="Economia de headcount de gestores"
          selo="nao_somado"
          valor={
            headcount?.valorAno !== null && headcount !== undefined
              ? `${formatNumero(headcount.detalhe?.gestores ?? null, 1)} gestores · ${formatBRL(headcount.valorAno)}/ano`
              : "—"
          }
          detalhe="Gestores que você deixa de precisar contratar para entregar a mesma prática."
          nota="A Perfecting multiplica a capacidade dos seus gestores. Nenhum cálculo aqui pressupõe redução da equipe."
        />
      </div>
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
  const cicloNovo = temFunil ? (entradas.cicloDias ?? 0) - deltas.cicloDiasMenos : null;
  const cicloTetoMordeu = temFunil && (parcelas.ganhoCicloAno ?? 0) < 0.005;

  return (
    <section className="flex flex-col gap-5">
      <div className="relative flex items-start gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          Performance: alavancas para o time
        </h3>
        <HintTooltip text="Projeção. Vendedores treinados vendem melhor e rampam mais rápido. Estimulamos, não controlamos; por isso os haircuts." />
      </div>

      <div className="flex flex-col gap-6">
        <Linha
          titulo={`Ganho de ticket médio (+${formatNumero(deltas.ticketPct * 100, 0)}%)`}
          valor={`+${formatBRL(parcelas.margemTicketAno)}/ano`}
          tom="positivo"
          detalhe="Margem sobre a receita atual, com a cobertura de assentos aplicada."
        />
        <Linha
          titulo={`Ganho de conversão (+${formatNumero(deltas.convPp, 1)} p.p.)`}
          valor={`+${formatBRL(parcelas.ganhoConversaoAno)}/ano`}
          tom="positivo"
          detalhe={
            conv !== null
              ? `${formatPct(conv, 1)} → ${formatPct(conv + deltas.convPp, 1)} nas mesmas oportunidades trabalhadas, com haircut de 30%.`
              : undefined
          }
        />
        <Linha
          titulo={`Rampa ${formatNumero(deltas.rampaPct * 100, 0)}% mais curta`}
          valor={`+${formatBRL(parcelas.margemRampaAno)}/ano`}
          tom="positivo"
          detalhe={
            receitaAntecipadaPorRep !== null
              ? `Cada vendedor novo antecipa ${formatBRL(receitaAntecipadaPorRep)} de receita, no seu volume de contratações, com haircut de 30%.`
              : undefined
          }
        />
        {temFunil ? (
          <Linha
            titulo={`Ciclo de venda ${formatNumero((deltas.cicloDiasMenos / (entradas.cicloDias || 1)) * 100, 0)}% mais curto`}
            valor={`+${formatBRL(parcelas.ganhoCicloAno)}/ano`}
            tom="positivo"
            detalhe={`${cicloNovo} dias em vez de ${entradas.cicloDias}.${
              cicloTetoMordeu
                ? " Limitado pelo teto de funil: sem oportunidades sobrando, encurtar o ciclo não gera receita nova."
                : " Só vira receita a capacidade que o funil consegue alimentar."
            }`}
          />
        ) : (
          <Linha
            titulo="Ciclo de venda"
            detalhe="Preencha o passo de funil (ciclo + oportunidades) para projetar esta alavanca."
          />
        )}
        {/* Fecha as quatro alavancas antes das linhas que NÃO entram na conta:
            o subtotal é a régua que separa o que soma do que só informa. */}
        <Linha
          titulo="Total de performance"
          valor={`+${formatBRL(resultado.G)}/ano`}
          destaque
          tom="positivo"
        />
        <Linha
          titulo="Salário de rampa economizado"
          selo="nao_somado"
          valor={rampaEvitada?.valorAno != null ? `+${formatBRL(rampaEvitada.valorAno)}/ano` : "—"}
          nota="O salário do vendedor em rampa não é economizado: a mesma folha rende antes, e isso já está contado como receita antecipada. Somar seria contar duas vezes."
        />
        <Linha
          titulo="Custo do time em rampa"
          selo="nao_somado"
          valor={timeEmRampa?.valorAno != null ? formatBRL(timeEmRampa.valorAno) + "/ano" : "—"}
          detalhe="O que fica na folha de quem ainda não rende o que consome."
          nota="Esse salário não é economizado: o vendedor é pago de qualquer forma. Encurtar a rampa faz a mesma folha render antes, e essa receita antecipada já está no total de performance. Somar aqui seria contar duas vezes."
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Equação de fecho (§4.6): valor_ano = eficiência + performance. Fica abaixo
// das duas colunas porque é o que as amarra — sem ela, o leitor tem dois
// cards e nenhuma soma.
// ---------------------------------------------------------------------------

export function EquacaoValor({ resultado }: { resultado: ResultadoOk }) {
  const parcelas = [
    { rotulo: "Eficiência", valor: resultado.eficienciaAno },
    { rotulo: "Performance", valor: resultado.G },
  ];
  return (
    // Faixa, não card: é a soma dos dois blocos acima, e um contorno próprio a
    // fazia ler como um terceiro irmão de mesmo peso.
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-sm bg-slate-50/60 px-6 py-4 text-sm">
      {parcelas.map((parcela, index) => (
        <span key={parcela.rotulo} className="flex items-center gap-3">
          {index > 0 ? <span className="text-slate-300">+</span> : null}
          <span className="flex flex-wrap items-baseline gap-2">
            <span className="text-slate-500">{parcela.rotulo}</span>
            {/* As parcelas também são verdes: as duas entram na conta, e a
                equação lia "verde = cinza + cinza". O peso, não a cor, é o
                que separa a soma do resultado. */}
            <span className="font-medium tabular-nums text-trend-positive">
              {formatBRL(parcela.valor)}
            </span>
          </span>
        </span>
      ))}
      <span className="text-slate-300">=</span>
      <span className="flex flex-wrap items-baseline gap-2">
        <span className="font-semibold tabular-nums text-trend-positive">
          {formatBRL(resultado.valorAno)}
        </span>
        <span className="text-xs text-slate-500">de valor projetado no ano</span>
      </span>
    </div>
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
            "text-xs leading-5",
            resultado.checagemAlerta ? "text-[#973C00]/90" : "text-slate-500",
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
      aviso.tipo === "fator_fora_faixa",
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
    return "";
  }

  return (
    <div className="flex flex-col gap-2">
      {relevantes.map((aviso, index) => (
        <p
          key={index}
          className="flex items-start gap-2 rounded-sm border border-[#973C00]/25 bg-[#FFFBEB] px-4 py-3 text-xs leading-5 text-[#973C00]"
        >
          <ExclamationTriangleIcon className="mt-1 h-4 w-4 shrink-0" aria-hidden />
          {texto(aviso)}
        </p>
      ))}
    </div>
  );
}

