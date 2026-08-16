"use client";

import {
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { CAMPO_DEFS, MARGEM_LABEL } from "@/lib/calculadora/campos";
import { CAMINHOS, ENCARGOS, JORNADA_MENSAL_H, PLANOS } from "@/lib/calculadora/constants";
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
import { SeloEvidencia, type Selo } from "./selo-evidencia";

type ResultadoOk = Extract<ResultadoTime, { status: "ok" }>;

// ---------------------------------------------------------------------------
// Hero — o número-manchete. Margem é a manchete, nunca horas (P1).
// ---------------------------------------------------------------------------

export function HeroResultado({
  titulo,
  roi,
  paybackMeses,
  valorAno,
  precoAno,
  frase,
  chips,
}: {
  titulo: string;
  roi: number | null;
  paybackMeses: number | null;
  valorAno: number | null;
  precoAno?: number | null;
  frase: string | null;
  chips?: { label: string; href: string }[];
}) {
  const abaixoDe1 = roi !== null && roi < 1;
  // Um número manda e três apoiam. Antes eram três de peso quase igual e
  // nenhum vencia. O investimento entrou porque é a outra metade da fração —
  // sem ele o ROI é afirmação, não conta verificável (§1, worthy performance).
  const apoio = [
    { valor: formatMeses(paybackMeses), rotulo: "para se pagar" },
    { valor: formatBRL(valorAno), rotulo: "de valor em 12 meses" },
    {
      valor: precoAno != null ? `${formatBRL(precoAno / 12)}/mês` : null,
      rotulo: "de investimento",
    },
  ].filter((item): item is { valor: string; rotulo: string } => item.valor !== null);

  return (
    // Fundo BRANCO, como toda superfície do sistema (§5): o verde a 4% sobre o
    // #f3f6fc da página não produzia contraste nenhum — lia como card apagado,
    // não como destaque. O acento fica na borda e no número.
    <section className="flex flex-col gap-5 rounded-sm border border-[#0F9F2E]/30 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <h3 className="text-sm font-medium text-slate-700">{titulo}</h3>
        <SeloEvidencia selo="estimativa" />
        <span className="text-xs text-slate-400">
          Projeção com premissas declaradas. Não é medição.
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div className="flex flex-col gap-1">
          <span
            className="font-semibold tabular-nums leading-none text-[#0F9F2E]"
            style={{ fontSize: "var(--text-score-lg)" }}
          >
            {formatX(roi)}
          </span>
          <span className="text-xs text-slate-500">retorno projetado no primeiro ano</span>
        </div>
        {/* A leitura simples do ROI. Repetir aqui valor e investimento seria
            dizer duas vezes o que a faixa de apoio abaixo já diz. */}
        {roi != null ? (
          <p className="min-w-[13rem] flex-1 text-xs leading-relaxed text-slate-500">
            Cada{" "}
            <span className="font-medium tabular-nums text-slate-700">R$ 1</span>{" "}
            investido projeta{" "}
            <span className="font-medium tabular-nums text-slate-700">
              {formatBRL(roi, 2)}
            </span>{" "}
            de volta em 12 meses.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-slate-100 pt-4">
        {apoio.map((item) => (
          <div key={item.rotulo} className="flex flex-col gap-0.5">
            <span className="text-base font-semibold tabular-nums leading-none text-slate-900">
              {item.valor}
            </span>
            <span className="text-xs text-slate-500">{item.rotulo}</span>
          </div>
        ))}
      </div>

      {frase ? <p className="text-sm leading-relaxed text-slate-600">{frase}</p> : null}

      {chips && chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <a
              key={chip.href}
              href={chip.href}
              className="inline-flex min-h-[44px] items-center rounded-full border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 sm:min-h-0 sm:py-1.5"
            >
              {chip.label}
            </a>
          ))}
        </div>
      ) : null}

      {abaixoDe1 ? (
        <p className="text-xs text-slate-500">
          Com estes números a projeção fica abaixo de 1×. Recomendamos medir um
          baseline num piloto antes de contratar.
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
    <section className="flex flex-col gap-4 rounded-md border border-slate-200 bg-white p-6 sm:p-8">
      <div className="flex flex-col gap-1">
        <span
          className="font-semibold tabular-nums leading-none text-slate-300"
          style={{ fontSize: "var(--text-score-lg)" }}
        >
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
            className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-slate-200 bg-slate-50/60 px-4 py-3"
          >
            <span className="flex flex-col gap-0.5">
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
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-[#2E63CD] transition-colors hover:text-[#1e4a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 sm:min-h-0 sm:py-1.5"
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

// Valor à DIREITA, em coluna própria e tabular: seis linhas de formatos
// diferentes só escaneiam quando os números se alinham verticalmente. O texto
// explicativo desce, para não disputar a linha do número.
function Linha({
  titulo,
  selo,
  valor,
  detalhe,
  nota,
  destaque = false,
}: {
  titulo: string;
  selo?: Selo;
  valor?: string;
  detalhe?: string;
  nota?: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-t pt-3 first:border-t-0 first:pt-0",
        destaque ? "border-slate-200" : "border-slate-100",
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
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
              "shrink-0 text-right tabular-nums",
              destaque
                ? "text-base font-semibold text-slate-900"
                : "text-sm font-semibold text-slate-900",
            )}
          >
            {valor}
          </span>
        ) : null}
      </div>
      {detalhe ? <p className="text-xs leading-relaxed text-slate-500">{detalhe}</p> : null}
      {nota ? <p className="text-xs leading-relaxed text-slate-400">{nota}</p> : null}
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
    <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        {/* Um selo por card: "projeção" valia para todas as linhas e virava
            ruído repetido. Linhas que fogem disso mantêm o próprio selo. */}
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-sm font-semibold text-slate-900">
            Eficiência: o que você deixa de gastar
          </h3>
          <SeloEvidencia selo="projecao" />
        </div>
        <p className="text-xs text-slate-500">
          Capacidade e cobertura de treino da sua operação, desde o dia zero.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Linha
          titulo="Economia declarada, pelo caminho que você escolheu"
          valor={`+${formatBRL(resultado.eficienciaAno)}/ano`}
          destaque
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
              : `Seus números de treino ficaram fora da faixa de validade (0,25–6 h de gestor por hora de prática), então usamos a premissa declarada de ${formatNumero(2.1, 1)} h de gestor por hora de prática.`
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
          detalhe={`Gestor conduzindo manualmente: ${formatBRL(ancoragem?.detalhe?.custoHoraGestor ?? null, 0)}/hora · Perfecting: ${formatBRL(ancoragem?.detalhe?.custoHoraPerfecting ?? null, 0)}/hora.`}
          nota="Tabela de ancoragem: comparação de custo, nunca somada ao ROI."
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
    <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-sm font-semibold text-slate-900">
            Performance: o que o time passa a ganhar
          </h3>
          <SeloEvidencia selo="projecao" />
        </div>
        <p className="text-xs text-slate-500">
          Vendedores treinados vendem melhor e rampam mais rápido. Estimulamos,
          não controlamos; por isso os haircuts.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Linha
          titulo={`Ganho de ticket médio (+${formatNumero(deltas.ticketPct * 100, 0)}%)`}
          valor={`+${formatBRL(parcelas.margemTicketAno)}/ano`}
          detalhe="Margem sobre a receita atual, com a cobertura de assentos aplicada."
        />
        <Linha
          titulo={`Ganho de conversão (+${formatNumero(deltas.convPp, 1)} p.p.)`}
          valor={`+${formatBRL(parcelas.ganhoConversaoAno)}/ano`}
          detalhe={
            conv !== null
              ? `${formatPct(conv, 1)} → ${formatPct(conv + deltas.convPp, 1)} nas mesmas oportunidades trabalhadas, com haircut de 30%.`
              : undefined
          }
        />
        <Linha
          titulo={`Rampa ${formatNumero(deltas.rampaPct * 100, 0)}% mais curta`}
          valor={`+${formatBRL(parcelas.margemRampaAno)}/ano`}
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
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-sm border border-slate-200 bg-white px-5 py-4 text-sm">
      {parcelas.map((parcela, index) => (
        <span key={parcela.rotulo} className="flex items-center gap-3">
          {index > 0 ? <span className="text-slate-300">+</span> : null}
          <span className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-slate-500">{parcela.rotulo}</span>
            <span className="font-medium tabular-nums text-slate-800">
              {formatBRL(parcela.valor)}
            </span>
          </span>
        </span>
      ))}
      <span className="text-slate-300">=</span>
      <span className="flex flex-wrap items-baseline gap-1.5">
        <span className="font-semibold tabular-nums text-[#0F9F2E]">
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
        <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#973C00]" aria-hidden />
      ) : (
        <ArrowTrendingUpIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
      )}
      <div className="flex flex-col gap-0.5">
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
            "text-xs leading-relaxed",
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
  const relevantes = avisos.filter(
    (aviso) => aviso.tipo === "receita_por_vendedor" || aviso.tipo === "funil_fecha_mais",
  );
  if (relevantes.length === 0) return null;

  function texto(aviso: AvisoCoerencia): string {
    if (aviso.tipo === "receita_por_vendedor") {
      return `A receita por vendedor (${formatBRL(aviso.valor)}/mês) está fora da faixa usual de R$ 5 mil a R$ 1 milhão. Confira receita e nº de vendedores.`;
    }
    if (aviso.tipo === "funil_fecha_mais") {
      return `Seu funil fecha mais do que chega: ${formatNumero(aviso.oportunidadesMes, 0)} oportunidades trabalhadas/mês contra ${formatNumero(aviso.leadsMes, 0)} que entram. Confira conversão e volume.`;
    }
    return "";
  }

  return (
    <div className="flex flex-col gap-2">
      {relevantes.map((aviso, index) => (
        <p
          key={index}
          className="flex items-start gap-2 rounded-sm border border-[#973C00]/25 bg-[#FFFBEB] px-4 py-3 text-xs leading-relaxed text-[#973C00]"
        >
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {texto(aviso)}
        </p>
      ))}
    </div>
  );
}

