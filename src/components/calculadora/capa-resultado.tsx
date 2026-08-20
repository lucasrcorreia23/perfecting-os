"use client";

import { useState } from "react";
import {
  ArrowDownIcon,
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  BanknotesIcon,
  CheckIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  LinkIcon,
  UserMinusIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { CENARIOS, PLANOS } from "@/lib/calculadora/constants";
import {
  formatBRL,
  formatBRLCompacto,
  formatHoras,
  formatMeses,
  formatNumero,
  formatPct,
  formatX,
} from "@/lib/calculadora/format";
import { horasGestorDevolvidas } from "@/lib/calculadora/business-case";
import { horasDoTime } from "@/lib/calculadora/preco";
import type { ModeloCalculadora, TimeModelo } from "@/lib/calculadora/modelo";
import type { ResultadoTime } from "@/lib/calculadora/types";
import { Button } from "@/components/ui/button";
import { AlocacaoValor, fatiasDoValor, somarFatias } from "./graficos-resultado";
import { cn } from "@/lib/utils";

// A capa do relatório: uma tela, uma resposta.
//
// Antes desta passagem a etapa de resultado abria direto na pilha de dez blocos
// — trajetória, as duas metades da soma, cascata, cenários, COI, preço, resumo.
// Tudo isso continua existindo, LOGO ABAIXO desta capa, na mesma rolagem. O que
// faltava era a dobra que responde antes de explicar: quem abre o link decide
// primeiro se o número interessa, e só então quer saber como ele foi construído.
//
// A capa e o cálculo já foram duas abas, e deixaram de ser em 20/08/2026: a
// segunda aba abria com um hero que repetia, noutro desenho, os quatro números
// que esta capa acabara de dar, e escolher entre as duas era uma decisão que a
// pessoa não tinha por que tomar. Por isso `onVerDetalhado` ROLA em vez de
// trocar de tela — o destino sempre esteve na mesma página.
//
// A capa foi reorganizada em 20/08/2026 e o movimento tem um nome: o cabeçalho
// da etapa SAIU de dentro do painel. Antes, um retângulo escuro carregava a
// etiqueta, a linha de parâmetros, os quatro KPIs e a ressalva — quatro papéis
// numa caixa só, e o título do relatório com o mesmo peso de um rótulo de KPI.
// Agora o capítulo é título de página (`pf-display` sobre o canvas) e os quatro
// números viram quatro CARDS irmãos, cada um com a própria nota.
//
// A superfície invertida sobrevive num card só — o do investimento (§13, a
// exceção de 20/08/2026 continua exclusiva da jornada pública; `link-detail`
// não renderiza a capa).
//
// ORDEM E UNIDADE DOS KPIs, que é onde a referência erra e nós não seguimos:
// os dois primeiros cards ficam na MESMA régua, o ano. O material de origem põe
// a mensalidade ao lado do valor anual, e quem confere dividindo acha doze
// vezes o ROI real. Aqui o card 1 mostra o investimento ANUAL — o mesmo
// denominador que `consolidado.roi` usa — e leva o mensal na nota. Na tela,
// card 2 ÷ card 1 = card 3.
//
// Os quatro cards abaixo dele são todos SLATE, e nenhum é acaso: nenhum deles é
// parcela do ROI. Assentos e horas são escopo; gestor liberado e gestores não
// contratados são economia declarada que o motor mantém FORA da conta
// (`linhasNaoSomadas`). Pintá-los de verde diria que somam — e o card de
// headcount até traz o selo dizendo que não.

type ResultadoOk = Extract<ResultadoTime, { status: "ok" }>;

function CardEscopo({
  icone: Icone,
  rotulo,
  valor,
  nota,
}: {
  icone: typeof UsersIcon;
  rotulo: string;
  valor: string;
  nota: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-(--pf-line) bg-(--pf-surface) p-5">
      {/* Caixa de DUAS linhas, sempre: os quatro cards dividem uma faixa, e
          basta um rótulo quebrar ("Gestores não contratados", na coluna
          estreita de `xl:grid-cols-4`) para o valor dele descer 20px e sair da
          linha dos outros três — quatro números que existem para ser
          comparados, e um deles fora do lugar. `items-start` porque com duas
          linhas de caixa e uma de texto o ícone centralizaria no vazio. */}
      <span className="pf-panel-title flex min-h-10 items-start gap-2 text-(--pf-ink-soft)">
        <Icone className="mt-0.5 h-4 w-4 shrink-0 text-(--pf-ink-faint)" aria-hidden />
        {rotulo}
      </span>
      <span className="pf-num-kpi text-(--pf-ink)">
        {valor}
      </span>
      <span className="pf-hint text-(--pf-ink-soft)">{nota}</span>
    </div>
  );
}

// Os quatro números da conta, um card cada.
//
// `tom` não é decoração: cada um dos três diz uma coisa diferente sobre o
// número que carrega.
//
// - "invertido" — o investimento. É a única superfície escura da capa, e é ela
//   que sustenta o verde de "entra na conta" a 4,9:1 nos vizinhos claros.
// - "editavel" — o ROI. Decisão do decisor em 20/08/2026: o card do
//   número-manchete adota o amarelo do material de referência. A consequência
//   é declarada — o amarelo deixa de ser EXCLUSIVO do campo editável —, e a
//   mitigação é o que sobra: o card fica com a borda fina de sempre e SEM a
//   sombra interna (`--pf-input-inset`), que é o que faz a célula parecer
//   afundada. É o conjunto (amarelo + borda de 1,5px + inset + mono azul) que
//   identifica "aqui você digita", e o card só herda o primeiro termo.
//   O número fica em `--pf-ink` e não em verde: `#0f9f2e` sobre `#fdf1ae` dá
//   2,4:1, abaixo do piso.
// - "claro" — os outros dois.
const TOM_KPI = {
  invertido: {
    caixa: "bg-(--pf-invert)",
    rotulo: "text-(--pf-invert-soft)",
    valor: "text-(--pf-invert-ink)",
    nota: "text-(--pf-invert-soft)",
  },
  editavel: {
    caixa: "border border-(--pf-input-border) bg-(--pf-input)",
    rotulo: "text-(--pf-ink-soft)",
    valor: "text-(--pf-ink)",
    nota: "text-(--pf-ink-soft)",
  },
  claro: {
    caixa: "border border-(--pf-line) bg-(--pf-surface)",
    rotulo: "text-(--pf-ink-soft)",
    valor: "text-(--pf-ink)",
    nota: "text-(--pf-ink-soft)",
  },
} as const;

function CardKpi({
  rotulo,
  valor,
  nota,
  tom = "claro",
  manchete = false,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  tom?: keyof typeof TOM_KPI;
  manchete?: boolean;
}) {
  const t = TOM_KPI[tom];
  return (
    <div className={cn("flex flex-col gap-2 rounded-md p-5", t.caixa)}>
      <dt className={cn("pf-panel-title", t.rotulo)}>{rotulo}</dt>
      {/* O ROI é o número que a pessoa abriu o link para ver: ele sobe para o
          "número hero" do §3.2 e os outros três ficam no "valor de KPI".
          Quatro números do mesmo tamanho não têm manchete. */}
      <dd className={cn(manchete ? "pf-num-hero" : "pf-num-kpi", t.valor)}>
        {valor}
      </dd>
      <dd className={cn("pf-hint", t.nota)}>{nota}</dd>
    </div>
  );
}

// As três ações do topo (20/08/2026, decisão do decisor a partir do material de
// referência). Nenhuma delas imprime — `data-no-print` vive no chamador.
//
// Duas notas sobre o que os nomes prometem:
//
// "Exportar / salvar PDF" está no lugar do "Imprimir" que vivia dentro do
// painel. O nome descreve o RESULTADO que a pessoa quer (o diálogo do sistema
// oferece "Salvar em PDF" em todos os navegadores relevantes) e não o
// periférico que quase ninguém usa.
//
// Ele NÃO chama `window.print()` daqui, e o botão antigo chamava — era um
// defeito calado pela discrição dele. O CSS que recorta a folha
// (`body * { visibility: hidden }` mais o recorte de `#resumo-verificavel`)
// mora dentro do `ResumoVerificavel`, que só existe na etapa 04: imprimir da
// etapa 03 saía como uma cópia crua da tela inteira, com régua de etapas,
// cabeçalho e botões. O botão leva ao artefato e o diálogo abre lá.
//
// "Copiar link" está no lugar do "Salvar no navegador" da referência, e a troca
// é de honestidade: o preenchimento JÁ é salvo, no servidor, a cada 800ms
// (`use-autosave.ts`), e volta de qualquer dispositivo. Um botão de salvar ao
// lado de um autosave ou mente ou cria uma segunda fonte da verdade que pode
// divergir da do link. O que a pessoa precisa guardar é o endereço.
//
// "Refazer simulação" NÃO apaga nada: reabre o quiz na primeira pergunta, com
// tudo preenchido. A linha abaixo dos botões diz isso em voz alta, porque o
// verbo sozinho promete uma folha em branco.
function Acoes({
  onExportar,
  onRefazer,
}: {
  onExportar: () => void;
  onRefazer: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2400);
    } catch {
      // Clipboard negado (http, permissão) não vira erro na tela: o endereço
      // está na barra do navegador, e um alerta aqui assustaria à toa.
    }
  };

  return (
    <div className="flex flex-col gap-2" data-no-print>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          icon={DocumentArrowDownIcon}
          onClick={onExportar}
        >
          Exportar / salvar PDF
        </Button>
        <Button
          variant="secondary"
          icon={copiado ? CheckIcon : LinkIcon}
          onClick={copiar}
        >
          {copiado ? "Link copiado" : "Copiar link"}
        </Button>
        <Button variant="secondary" icon={ArrowPathIcon} onClick={onRefazer}>
          Refazer simulação
        </Button>
      </div>
      {/* role="status": quando o link é copiado, quem usa leitor de tela
          precisa da confirmação — a troca de rótulo do botão sozinha não é
          anunciada se o foco já estiver nele. */}
      <p className="pf-hint text-(--pf-ink-faint)" role="status">
        {copiado
          ? "Endereço copiado. Abra-o de qualquer dispositivo para continuar."
          : "Suas respostas continuam salvas — refazer não apaga nada."}
      </p>
    </div>
  );
}

export function CapaResultado({
  modelo,
  timeAtivo,
  dataCalculo,
  onVerDetalhado,
  onAjustarProposta,
  onRefazer,
  onExportar,
}: {
  modelo: ModeloCalculadora;
  timeAtivo: TimeModelo;
  dataCalculo: string;
  onVerDetalhado: () => void;
  onAjustarProposta: () => void;
  /** Volta ao quiz na primeira pergunta. NÃO apaga nada — ver `Acoes`. */
  onRefazer: () => void;
  /** Leva à etapa 04, que monta o Resumo e abre o diálogo — ver `Acoes`. */
  onExportar: () => void;
}) {
  const multiTime = modelo.times.length > 1;
  const consolidado = modelo.consolidado;
  const completos = modelo.times.filter(
    (time): time is TimeModelo & { resultado: ResultadoOk } =>
      time.resultado.status === "ok",
  );

  // Conta fechada = todos os times completos. Com um time só, o consolidado e o
  // time dizem a mesma coisa; com vários, é o consolidado que manda (ponderado
  // por investimento, nunca média de ROIs — invariante 11).
  const conta =
    consolidado.status === "ok"
      ? {
          roi: consolidado.roi,
          valorAno: consolidado.valorAno,
          // O denominador do ROI, e não `preco.mensal × 12`: com vários times o
          // consolidado é ponderado (invariante 11), e recalcular à mão daria
          // um número que a divisão na tela não fecharia.
          precoAno: consolidado.precoAno,
          paybackMeses: consolidado.paybackMeses,
          assentos: consolidado.totalAssentos,
          vendedores: consolidado.totalVendedores,
          cobertura: consolidado.cobertura,
        }
      : null;

  const cenarioLabel =
    timeAtivo.sel.modo === "preset"
      ? `cenário ${CENARIOS[timeAtivo.sel.cenario].label}`
      : "parâmetros personalizados";

  const meta = conta
    ? [
        `${formatNumero(conta.vendedores, 0)} vendedores`,
        `${conta.assentos} assentos`,
        `${formatPct(conta.cobertura * 100, 0)} do time`,
        cenarioLabel,
        `contrato de ${modelo.prazoMeses} meses`,
        `cálculo de ${dataCalculo}`,
      ].join(" · ")
    : "Preencha os campos obrigatórios de um time para a conta fechar.";

  // ── As quatro leituras de escopo ──────────────────────────────────────────
  // Duas já existiam prontas no motor; duas são releitura de campos que o
  // gating já validou. Nenhuma inventa premissa.
  const horasPratica = completos.reduce(
    (soma, time) => soma + horasDoTime(time.proposta),
    0,
  );
  const gestorLiberado = completos.reduce(
    (soma, time) =>
      soma +
      horasGestorDevolvidas(
        time.entradas,
        time.proposta.plano,
        time.proposta.assentos,
        time.resultado.fatorEscopo.valor,
      ).horas,
    0,
  );
  const custoHoraGestor =
    completos[0]?.resultado.linhasNaoSomadas.find(
      (linha) => linha.id === "ancoragem_hora_roleplay",
    )?.detalhe?.custoHoraGestor ?? null;
  const headcount = completos.reduce(
    (acc, time) => {
      const linha = time.resultado.linhasNaoSomadas.find(
        (l) => l.id === "economia_headcount",
      );
      return {
        gestores: acc.gestores + (linha?.detalhe?.gestores ?? 0),
        valorAno: acc.valorAno + (linha?.valorAno ?? 0),
      };
    },
    { gestores: 0, valorAno: 0 },
  );

  const fatias = somarFatias(completos.map((time) => fatiasDoValor(time.resultado)));

  // A régua diária: o invariante 12 garante que retorno ÷ custo devolve o
  // mesmo ROI da conta, só noutra unidade.
  const gran = completos[0]?.resultado.granularidade ?? null;

  const timesOrdenados = [...completos].sort((a, b) => {
    const porVendedorA = a.resultado.valorAno / Math.max(1, a.entradas.numVendedores ?? 1);
    const porVendedorB = b.resultado.valorAno / Math.max(1, b.entradas.numVendedores ?? 1);
    return porVendedorB - porVendedorA;
  });
  const maiorValor = Math.max(1, ...timesOrdenados.map((t) => t.resultado.valorAno));

  return (
    // gap-2 como a pilha de baixo: eram dois ritmos verticais dentro do mesmo
    // pai, sem regra que explicasse a troca.
    <div className="flex flex-col gap-2">
      {/* ── O cabeçalho da etapa ─────────────────────────────────────────
          Fora de moldura, sobre o canvas: é o título do documento, não o
          rótulo de um painel. A etiqueta em pílula é `pf-label` — a caixa alta
          vem do CSS, nunca da string. */}
      <div className="flex flex-col gap-4 px-1 pb-2 sm:px-2">
        <span className="pf-label w-fit rounded-full border border-(--pf-line-strong) px-4 py-2 text-(--pf-ink-soft)">
          Etapa 03 · Relatório de ROI
        </span>
        <h1 className="pf-display text-(--pf-ink)">
          Investimento vs. retorno,{" "}
          <em className="not-italic text-(--pf-brand-ink)">lado a lado.</em>
        </h1>
        {/* Mono: é uma linha de parâmetros, não uma frase — e é assim que ela
            lê como ficha técnica em vez de subtítulo. */}
        <p className="pf-num text-sm text-(--pf-ink-soft)">{meta}</p>
        <Acoes onExportar={onExportar} onRefazer={onRefazer} />
      </div>

      {/* ── Os quatro números da conta ───────────────────────────────────
          Cada card carrega a própria NOTA, que é o que faz o número se
          explicar sozinho: sem ela, "R$ 13.000" ao lado de "R$ 1.131.818" não
          diz que um é mensal e o outro anual. */}
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <CardKpi
          tom="invertido"
          rotulo="Investimento / ano"
          valor={formatBRL(conta?.precoAno ?? null)}
          nota={
            modelo.preco.pisoAplicado
              ? `${formatBRL(modelo.preco.mensal)}/mês · piso contratual ativo`
              : `${formatBRL(modelo.preco.mensal)}/mês`
          }
        />
        <CardKpi
          rotulo="Valor gerado / ano"
          valor={formatBRL(conta?.valorAno ?? null)}
          nota={
            conta
              ? `${formatBRL(conta.valorAno / 12)} por mês, em margem + eficiência`
              : "margem nova mais custo que deixa de existir"
          }
        />
        <CardKpi
          tom="editavel"
          manchete
          rotulo="ROI"
          valor={formatX(conta?.roi ?? null)}
          nota="valor anual ÷ investimento anual"
        />
        <CardKpi
          rotulo="Payback"
          valor={formatMeses(conta?.paybackMeses ?? null)}
          nota={`contrato de ${modelo.prazoMeses} meses`}
        />
      </dl>

      {conta !== null && conta.roi < 1 ? (
        <p className="rounded-md border border-(--pf-line) bg-(--pf-surface) p-6 text-sm leading-6 text-(--pf-ink-soft) sm:p-8">
          Com estes números a projeção fica abaixo de 1×. Recomendamos medir um
          baseline num piloto antes de contratar.
        </p>
      ) : null}

      {/* ── Escopo: quatro leituras que NÃO somam ao ROI ─────────────────── */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <CardEscopo
          icone={UsersIcon}
          rotulo="Vendedores com assento"
          valor={conta ? formatNumero(conta.assentos, 0) : "—"}
          nota={conta ? `de ${formatNumero(conta.vendedores, 0)} no time` : "—"}
        />
        <CardEscopo
          icone={ClockIcon}
          rotulo="Prática por mês"
          valor={completos.length > 0 ? formatHoras(horasPratica) : "—"}
          nota="horas de treino entregues"
        />
        <CardEscopo
          icone={ArrowUturnLeftIcon}
          rotulo="Gestor liberado"
          valor={completos.length > 0 ? `${formatHoras(gestorLiberado)}/mês` : "—"}
          nota={
            custoHoraGestor !== null
              ? `${formatBRL(gestorLiberado * custoHoraGestor)} por mês`
              : "horas que saem da agenda dos gestores"
          }
        />
        <CardEscopo
          icone={UserMinusIcon}
          rotulo="Gestores não contratados"
          valor={completos.length > 0 ? formatNumero(headcount.gestores, 1) : "—"}
          nota={
            completos.length > 0
              ? `${formatBRLCompacto(headcount.valorAno)}/ano — fora do ROI`
              : "fora do ROI"
          }
        />
      </div>

      {/* ── De onde vem o valor + os times ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-2 @4xl:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-md border border-(--pf-line) bg-(--pf-surface) p-6 sm:p-8">
          <div className="flex flex-col gap-1">
            <h2 className="pf-panel-title text-(--pf-ink)">
              De onde vem o valor
            </h2>
            <p className="pf-lead text-(--pf-ink-soft)">
              {conta ? `${formatBRL(conta.valorAno)} por ano` : "—"}
            </p>
          </div>
          {fatias.length > 0 ? (
            <AlocacaoValor fatias={fatias} />
          ) : (
            <p className="pf-lead text-(--pf-ink-soft)">
              As parcelas aparecem quando a conta de um time fecha.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-md border border-(--pf-line) bg-(--pf-surface) p-6 sm:p-8">
          <div className="flex flex-col gap-1">
            <h2 className="pf-panel-title text-(--pf-ink)">
              {multiTime ? "Times" : "Time"}
            </h2>
            <p className="pf-lead text-(--pf-ink-soft)">
              Ordenados por valor por vendedor/ano
            </p>
          </div>
          {timesOrdenados.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-(--pf-ink-faint)">
                  <th scope="col" className="pb-2 font-semibold">Time</th>
                  <th scope="col" className="pb-2 text-right font-semibold">Assentos</th>
                  <th scope="col" className="pb-2 text-right font-semibold">Valor/ano</th>
                  <th scope="col" className="pb-2 text-right font-semibold">ROI</th>
                </tr>
              </thead>
              <tbody>
                {timesOrdenados.map((time) => (
                  <tr key={time.id} className="align-top">
                    <td className="py-2 pr-3">
                      <span className="flex flex-col gap-1.5">
                        <span className="font-medium text-(--pf-ink)">{time.nome}</span>
                        <span
                          className="h-1 rounded-full bg-trend-positive"
                          style={{
                            width: `${(time.resultado.valorAno / maiorValor) * 100}%`,
                          }}
                          aria-hidden
                        />
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums text-(--pf-ink-soft)">
                      {time.proposta.assentos}
                    </td>
                    <td className="py-2 text-right tabular-nums text-(--pf-ink)">
                      {formatBRLCompacto(time.resultado.valorAno)}
                    </td>
                    <td className="py-2 pl-3 text-right tabular-nums font-medium text-(--pf-ink)">
                      {formatX(time.resultado.roi)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="pf-lead text-(--pf-ink-soft)">
              Nenhum time fechou a conta ainda.
            </p>
          )}
        </section>
      </div>

      {/* ── A régua diária ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <CardEscopo
          icone={BanknotesIcon}
          rotulo="Custo por vendedor/dia"
          valor={gran ? formatBRL(gran.custoDiaPorVendedor, 2) : "—"}
          nota="dia útil, por assento"
        />
        <CardEscopo
          icone={UsersIcon}
          rotulo="Retorno por vendedor/dia"
          valor={gran ? formatBRL(gran.retornoDiaPorAssento, 2) : "—"}
          nota="dia útil, por assento"
        />
      </div>

      {/* ── Rodapé: a ressalva e as duas saídas ──────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-(--pf-line) bg-(--pf-surface) p-6 sm:p-8">
        <p className="max-w-xl text-sm leading-6 text-(--pf-ink-soft)">
          Estimativa · {cenarioLabel} · ganhos de rampa, ciclo e conversão já
          cortados em 30%. O plano contratado é{" "}
          {PLANOS[timeAtivo.proposta.plano].label}, com {modelo.prazoMeses} meses de
          contrato.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="tertiary" onClick={onAjustarProposta}>
            Ajustar proposta
          </Button>
          {/* Seta para BAIXO: o botão rola até o primeiro bloco do cálculo,
              e a seta para a direita prometia uma tela nova. */}
          <Button
            variant="primary"
            icon={ArrowDownIcon}
            iconPosition="right"
            onClick={onVerDetalhado}
          >
            Ver cálculo detalhado
          </Button>
        </div>
      </div>
    </div>
  );
}
