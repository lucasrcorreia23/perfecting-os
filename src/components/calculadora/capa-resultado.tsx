"use client";

import { useState, type ReactNode } from "react";
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
  formatDias,
  formatHoras,
  formatMeses,
  formatNumero,
  formatPct,
  formatX,
} from "@/lib/calculadora/format";
import { horasGestorDevolvidas } from "@/lib/calculadora/business-case";
import {
  explicarInvestimentoMes,
  explicarPayback,
  explicarRoi,
  explicarValorAno,
  type ExplicacaoValor,
} from "@/lib/calculadora/explicacoes";
import { horasDoTime } from "@/lib/calculadora/preco";
import type { ModeloCalculadora, TimeModelo } from "@/lib/calculadora/modelo";
import type { ResultadoTime } from "@/lib/calculadora/types";
import { Button } from "@/components/ui/button";
import { ExplicacaoInfo } from "./explicacao-info";
import { AlocacaoValor, fatiasDoValor, somarFatias } from "./graficos-resultado";
import { cn } from "@/lib/utils";
import { usePremissas } from "./premissas-context";

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
// ORDEM E UNIDADE DOS KPIs. O card 1 mostra a MENSALIDADE, e o anual desceu
// para a nota — inversão pedida pelo decisor em 20/08/2026: a pergunta que a
// pessoa traz para a tela é "quanto vou pagar por mês", e era ela que estava
// em 12px de nota debaixo de um total anual que ninguém desembolsa de uma vez.
//
// A versão anterior punha o ANUAL na manchete por uma razão que não se perdeu:
// é `consolidado.precoAno` o denominador de `consolidado.roi`, e com a
// mensalidade ao lado do valor anual quem confere dividindo acha DOZE vezes o
// ROI real. A mitigação foi escrever a conta por extenso no próprio card —
// `R$ 13.000` × `12 meses` na linha do número, `R$ 156.000 no ano` na nota.
//
// A MULTIPLICAÇÃO PASSOU A SER A DO CONTRATO em 21/08/2026 (decisão do
// decisor), e o `× 12 meses` cravado era uma inconsistência de verdade, não uma
// escolha de leitura: `PRAZO_DEFAULT` é 3, então o relatório PADRÃO afirmava
// `R$ 39.000` em quatro lugares (linha de parâmetros, card do payback, "Quanto
// custa" e o Resumo impresso) e `R$ 156.000` só aqui, sem nada na tela dizendo
// que eram duas janelas diferentes. Hoje o card fala a janela que a pessoa
// escolheu — `× {prazo} meses`, com o total do contrato na nota — e o
// denominador do ROI não se perdeu: ele migrou para a nota do card 3, que é
// onde a divisão é conferida. Cada número continua na tela, e agora cada um
// está debaixo do rótulo que o explica.
//
// O ano segue sendo a janela do CÁLCULO (`roi = valorAno ÷ precoMes × 12`,
// `calc.ts`) — o prazo não altera preço nem ROI (§4.9), ele é compromisso
// comercial. Por isso o "(12 meses)" da nota do ROI é obrigatório: sem ele,
// `valor anual ÷ R$ 156.000` ao lado de um contrato de 3 meses parece erro de
// conta em vez de duas janelas declaradas.
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
  sufixo,
  nota,
  explicacao,
  tom = "claro",
  manchete = false,
}: {
  rotulo: string;
  valor: string;
  /**
   * Operando que acompanha o número sem disputar tamanho com ele — hoje só o
   * `× {prazo} meses` do investimento. Fica na MESMA linha de propósito: separado,
   * viraria mais uma nota, e a multiplicação é justamente o que o card 1
   * precisa mostrar inteira.
   */
  sufixo?: string;
  nota: string;
  /**
   * "De onde saiu este número". Todo card da capa tem um: os quatro declaram
   * reais na linha do valor ou na nota, e cada um deles é uma afirmação que
   * alguém vai defender numa reunião. O ícone fica ao lado do RÓTULO — no
   * número ele viraria pontuação de um `pf-num-hero` de 40px.
   */
  explicacao?: ExplicacaoValor;
  tom?: keyof typeof TOM_KPI;
  manchete?: boolean;
}) {
  const t = TOM_KPI[tom];
  return (
    <div className={cn("flex flex-col gap-2 rounded-md p-5", t.caixa)}>
      <dt className={cn("pf-panel-title flex items-center gap-1.5", t.rotulo)}>
        {rotulo}
        {explicacao ? (
          // O card do investimento é a única superfície escura da capa, e um
          // ícone em `--pf-ink-faint` ali simplesmente sumiria.
          <ExplicacaoInfo
            explicacao={explicacao}
            tom={tom === "invertido" ? "invertido" : "padrao"}
          />
        ) : null}
      </dt>
      {/* O ROI é o número que a pessoa abriu o link para ver: ele sobe para o
          "número hero" do §3.2 e os outros três ficam no "valor de KPI".
          Quatro números do mesmo tamanho não têm manchete. */}
      <dd className={cn(manchete ? "pf-num-hero" : "pf-num-kpi", t.valor)}>
        {valor}
        {sufixo ? (
          // Herda a mono do pai (a pele só a entrega pelas classes `pf-num*`),
          // e o tom da NOTA, não o do valor: é operando de leitura, não outra
          // parcela. `text-sm` e não `pf-hint` porque as duas regras declaram
          // `font-size` e a da pele venceria por especificidade.
          <span className={cn("ml-2 text-sm font-semibold", t.nota)}>
            {sufixo}
          </span>
        ) : null}
      </dd>
      <dd className={cn("pf-hint", t.nota)}>{nota}</dd>
    </div>
  );
}

// As três ações do topo (20/08/2026, decisão do decisor a partir do material de
// referência). Nenhuma delas imprime: a folha é recortada em `#resumo-verificavel`
// e tudo que está fora dele sai invisível — não é preciso marcar controle por
// controle.
//
// Duas notas sobre o que os nomes prometem:
//
// "Exportar / salvar PDF" é a ÚNICA porta da impressão desde 21/08/2026 — o
// "Imprimir" gêmeo que vivia no cabeçalho do Resumo saiu, porque dois botões
// para o mesmo `window.print()` a 4.000px um do outro só faziam a pessoa
// procurar qual dos dois era o certo. O nome descreve o RESULTADO que ela quer
// (o diálogo do sistema oferece "Salvar em PDF" em todos os navegadores
// relevantes) e não o periférico que quase ninguém usa.
//
// Ele chama `window.print()` daqui, e isso só é seguro porque o
// `ResumoVerificavel` está montado no fecho desta mesma página — invisível na
// tela, mas montado —, e o CSS que recorta a folha (`body { visibility:
// hidden }` mais o recorte de `#resumo-verificavel`) mora dentro dele. Sem esse
// bloco montado, imprimir daqui sairia como cópia crua da tela inteira, com
// régua de etapas, cabeçalho e botões.
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
    <div className="flex flex-col gap-2">
      {/* Coluna abaixo do `sm:`, fita acima dele. Em `flex-wrap` os três
          empilhavam com a largura do próprio rótulo (205 / 138 / 187px numa
          tela de 390px) e a borda direita saía serrilhada — três pílulas de
          tamanhos diferentes alinhadas só pela esquerda, que é o desenho que
          um `wrap` produz sem ninguém ter escolhido. Empilhados em largura
          cheia eles voltam a ler como um grupo, e o alvo de toque cresce de
          quebra. */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
  escopo = "consolidado",
  abas,
  onVerDetalhado,
  onAjustarProposta,
  onRefazer,
  onExportar,
}: {
  modelo: ModeloCalculadora;
  timeAtivo: TimeModelo;
  dataCalculo: string;
  /**
   * De quem a capa fala: a conta inteira ou o time ativo. Só existe escolha com
   * mais de um time — com um só os dois dizem a mesma coisa, e é o consolidado
   * que responde (`AbasEscopo` nem é renderizada).
   */
  escopo?: "consolidado" | "time";
  /** A fita `AbasEscopo`, injetada pelo chamador — ver o comentário dela. */
  abas?: ReactNode;
  onVerDetalhado: () => void;
  onAjustarProposta: () => void;
  /** Volta ao quiz na primeira pergunta. NÃO apaga nada — ver `Acoes`. */
  onRefazer: () => void;
  /** Leva à etapa 04, que monta o Resumo e abre o diálogo — ver `Acoes`. */
  onExportar: () => void;
}) {
  const p = usePremissas();
  const multiTime = modelo.times.length > 1;
  const consolidado = modelo.consolidado;
  const completos = modelo.times.filter(
    (time): time is TimeModelo & { resultado: ResultadoOk } =>
      time.resultado.status === "ok",
  );

  // O ALCANCE da capa: os times que os números aqui somam. Uma variável só, e
  // dela saem todas as leituras derivadas (horas, gestor liberado, headcount,
  // fatias, régua diária, tabela) — assim trocar de aba não deixa metade da
  // capa falando da conta e a outra metade de um time.
  const consolidada = escopo === "consolidado" || !multiTime;
  const alcance = consolidada
    ? completos
    : completos.filter((time) => time.id === timeAtivo.id);
  const resultadoDoTime = alcance.length === 1 ? alcance[0].resultado : null;

  // Conta fechada = todos os times completos. Com um time só, o consolidado e o
  // time dizem a mesma coisa; com vários, é o consolidado que manda (ponderado
  // por investimento, nunca média de ROIs — invariante 11). Na aba de um time,
  // a fonte é o resultado dele — e é por isso que um irmão pela metade deixa de
  // apagar os números de quem já fechou: só o "Consolidado" fica em travessão.
  const conta = consolidada
    ? consolidado.status === "ok"
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
      : null
    : resultadoDoTime !== null
      ? {
          roi: resultadoDoTime.roi,
          valorAno: resultadoDoTime.valorAno,
          precoAno: resultadoDoTime.precoAno,
          paybackMeses: resultadoDoTime.paybackMeses,
          assentos: timeAtivo.proposta.assentos,
          vendedores: timeAtivo.entradas.numVendedores ?? 0,
          cobertura: resultadoDoTime.cobertura,
        }
      : null;

  // A mensalidade da conta é da CONTA; na aba de um time, a fatia dele
  // (`rateioPorTime`). Somar `preco.mensal` num escopo de time diria que o
  // outro time é de graça.
  const mensalidade = consolidada
    ? modelo.preco.mensal
    : (resultadoDoTime?.precoMes ?? timeAtivo.precoMes);

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
    : // Herdado do placeholder que vivia no `ConsolidadoView` (removido em
      // 20/08/2026): com vários times o que falta nunca é "um time", é o
      // último — e o consolidado não fecha com resultado parcial.
      multiTime
      ? "O consolidado da conta aparece quando todos os times estiverem completos, nunca com resultado parcial."
      : "Preencha os campos obrigatórios de um time para a conta fechar.";

  // ── As quatro leituras de escopo ──────────────────────────────────────────
  // Duas já existiam prontas no motor; duas são releitura de campos que o
  // gating já validou. Nenhuma inventa premissa.
  const horasPratica = alcance.reduce(
    (soma, time) => soma + horasDoTime(time.proposta, p),
    0,
  );
  const gestorLiberado = alcance.reduce(
    (soma, time) =>
      soma +
      horasGestorDevolvidas(
        time.entradas,
        time.proposta.plano,
        time.proposta.assentos,
        time.resultado.fatorEscopo.valor,
        p,
      ).horas,
    0,
  );
  // O DENOMINADOR do multiplicador: as horas de prática que chegam ao vendedor
  // HOJE (`vendedores por gestor × gestores × horas por vendedor`), que a
  // cobertura do COI já deriva. É a comparação apples-to-apples do card ao
  // lado — hora de prática recebida contra hora de prática recebida —, e não a
  // agenda dos gestores (`capacidade.horasDisponiveisMes`), que é hora de
  // INSUMO: uma hora de gestor com seis vendedores na sala vira seis horas
  // recebidas, e dividir por ela contaria o escopo duas vezes.
  //
  // Tudo ou nada: se um time do alcance não tiver COI, o denominador seria
  // parcial e o multiplicador sairia inflado. A tela não mostra conta pela
  // metade — é a mesma regra do consolidado.
  const praticaHojeMes = alcance.every((time) => time.coi !== null)
    ? alcance.reduce((soma, time) => soma + time.coi!.cobertura.horasEntreguesMes, 0)
    : null;
  const multiplicador =
    praticaHojeMes !== null && praticaHojeMes > 0 ? horasPratica / praticaHojeMes : null;

  // A eficiência do motor, por mês. É ESTA a economia que o ROI paga pelas
  // horas do gestor — `min(caminho declarado, teto do plano)`, já com a
  // supervisão de 25% que continua sendo dele.
  //
  // Até 21/08/2026 o card multiplicava as horas devolvidas pela taxa de
  // ancoragem (`custoHoraPraticaGestor` = folha × fator de escopo), o que
  // cruzava unidades: hora de AGENDA vezes preço da hora de PRÁTICA. No golden
  // do §14 isso dava R$ 14.000/mês contra os R$ 4.725 que a eficiência de fato
  // credita — e o mesmo leitor que multiplicasse por 12 acharia R$ 168.000/ano
  // ao lado de uma linha "Eficiência" de R$ 56.700 na seção logo abaixo.
  const eficienciaMes =
    alcance.reduce((soma, time) => soma + time.resultado.eficienciaAno, 0) / 12;
  const headcount = alcance.reduce(
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

  const fatias = somarFatias(alcance.map((time) => fatiasDoValor(time.resultado)));

  // A régua diária: o invariante 12 garante que retorno ÷ custo devolve o
  // mesmo ROI da conta, só noutra unidade.
  const gran = alcance[0]?.resultado.granularidade ?? null;

  // ── As quatro explicações da capa ────────────────────────────────────────
  // Uma por KPI, e nenhuma nos cards de escopo abaixo: aqueles declaram horas,
  // assentos e cabeças, e as duas leituras em reais que eles carregam na nota
  // já são explicadas onde de fato pertencem — a eficiência no card dela, o
  // headcount no selo "não somado ao ROI" que a acompanha.
  //
  // Só existem quando existe número: com a conta em travessão, o balão
  // explicaria uma conta que a tela não fez. `explicarValorAno` troca a conta
  // sozinha na aba do consolidado com vários times — ali a soma é DOS TIMES, e
  // abrir as parcelas de um deles explicaria outro número.
  const umTime = alcance.length === 1 ? alcance[0] : null;

  const explInvestimento = explicarInvestimentoMes({
    mensalidade,
    preco: modelo.preco,
    rateado: !consolidada,
    premissas: p,
  });
  const explValor = conta
    ? explicarValorAno({
        valorAno: conta.valorAno,
        detalhe: umTime
          ? {
              eficienciaAno: umTime.resultado.eficienciaAno,
              parcelas: umTime.resultado.parcelas,
            }
          : null,
        premissas: p,
      })
    : null;
  const explRoi = conta
    ? explicarRoi({
        valorAno: conta.valorAno,
        precoAno: conta.precoAno,
        roi: conta.roi,
        ponderado: consolidada && multiTime,
      })
    : null;
  const explPayback = conta
    ? explicarPayback({
        precoAno: conta.precoAno,
        valorAno: conta.valorAno,
        paybackMeses: conta.paybackMeses,
        prazoMeses: modelo.prazoMeses,
      })
    : null;

  const timesOrdenados = [...alcance].sort((a, b) => {
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
        {/* O slot é das ABAS, e só delas. Com mais de um time elas dizem de
            quem é o relatório, que é a pergunta viva aqui.

            Com um time só o slot fica VAZIO desde 21/08/2026, e o que saiu
            dali era uma pílula "Etapa 03 · Relatório de ROI" — a mesma
            informação que a régua do topo dá 80px acima, em "03 Relatório".
            É a decisão que a jornada já tinha tomado uma vez, quando a pílula
            da própria régua saiu: das duas afordâncias, sai a que só repete o
            destino. O `pf-display` logo abaixo carrega o próprio peso. */}
        {abas}
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
          rotulo="Investimento / mês"
          explicacao={explInvestimento}
          valor={formatBRL(mensalidade)}
          sufixo={`× ${modelo.prazoMeses} meses`}
          // O total do CONTRATO, e por isso derivado da mensalidade em vez de
          // `conta.precoAno`: o desembolso é conhecido mesmo quando o
          // consolidado não fechou (um irmão pela metade), e o travessão que
          // saía daqui negava um número que "Quanto custa" mostrava inteiro
          // 4.000px abaixo.
          nota={
            modelo.preco.pisoAplicado
              ? `${formatBRL(mensalidade * modelo.prazoMeses)} no contrato · piso contratual ativo`
              : `${formatBRL(mensalidade * modelo.prazoMeses)} no contrato`
          }
        />
        <CardKpi
          rotulo="Valor gerado / ano"
          explicacao={explValor ?? undefined}
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
          explicacao={explRoi ?? undefined}
          valor={formatX(conta?.roi ?? null)}
          // A nota carrega o DENOMINADOR, com o número: desde que o card 1
          // passou a multiplicar pelo prazo (21/08/2026), este é o único lugar
          // da capa onde o investimento anual aparece — e é ele que o ROI
          // divide. O "(12 meses)" não é redundância: é o que separa a janela
          // do cálculo da janela do contrato, que raramente coincidem.
          //
          // Com vários times a frase ainda diz de onde vem o número: é Σ valor
          // ÷ Σ preço, nunca a média dos ROIs (invariante 11). Ela morava no
          // hero consolidado, que saiu em 20/08/2026 por repetir estes quatro
          // cards — e pertence ao card onde a divisão é conferida.
          nota={
            conta
              ? `valor anual ÷ ${formatBRL(conta.precoAno)} (12 meses)${
                  consolidada && multiTime ? ", somando os times" : ""
                }`
              : "valor anual ÷ investimento anual"
          }
        />
        <CardKpi
          rotulo="Payback"
          explicacao={explPayback ?? undefined}
          valor={formatMeses(conta?.paybackMeses ?? null)}
          // O VEREDITO, não o prazo outra vez. Desde que o card 1 passou a
          // multiplicar pelo prazo (21/08/2026), "contrato de 3 meses" era a
          // terceira aparição do mesmo dado na mesma faixa — a linha de
          // parâmetros acima já o traz. A nota de KPI existe para qualificar o
          // número do card, e o que qualifica um payback é caber ou não no
          // compromisso. O `AvisosCoerencia` logo abaixo continua dando a
          // frase inteira quando não cabe (`payback_excede_contrato`); aqui é
          // o eco de duas palavras que evita ler 6,2 meses ao lado de "3
          // meses" sem saber qual dos dois é o problema.
          nota={
            conta
              ? conta.paybackMeses > modelo.prazoMeses
                ? `além do contrato de ${modelo.prazoMeses} meses`
                : `dentro do contrato de ${modelo.prazoMeses} meses`
              : `contrato de ${modelo.prazoMeses} meses`
          }
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
          rotulo="Vendedores"
          valor={conta ? formatNumero(conta.assentos, 0) : "—"}
          nota={conta ? `de ${formatNumero(conta.vendedores, 0)} no time` : "—"}
        />
        {/*
            O multiplicador de capacidade, na nota. É a única leitura que a
            revisão de narrativa de 21/08/2026 trouxe e que sobrevive aos
            invariantes: ela é uma RAZÃO entre duas quantidades de horas que a
            tela já tinha, sem taxa nova e sem dinheiro — e é por não ter
            dinheiro que ela não pode ser lida como parcela que soma ao ROI.
            Precificar as mesmas horas (o "Capacidade Multiplicada" do
            documento) criaria um segundo valor anual maior que o primeiro, com
            a tela desmentindo a si mesma — o mesmo motivo pelo qual a nota ①
            do COI foi recusada em E-34.

            Sem denominador (gestores ou horas de treino em 0, que o gating
            aceita de propósito) a nota volta a ser a de sempre: melhor dizer o
            que o número é do que dividir por zero e inventar um "∞×".
        */}
        <CardEscopo
          icone={ClockIcon}
          rotulo="Prática por mês com IA"
          valor={alcance.length > 0 ? formatHoras(horasPratica) : "—"}
          nota={
            multiplicador !== null
              ? `${formatNumero(multiplicador, 1)}× o que a operação pratica hoje`
              : "horas de treino entregues"
          }
        />
        <CardEscopo
          icone={ArrowUturnLeftIcon}
          rotulo="Gestor liberado"
          valor={alcance.length > 0 ? `${formatHoras(gestorLiberado)}/mês` : "—"}
          // Quando não há custo de treino declarado hoje (caminho "nenhum", ou
          // custo externo zerado), a eficiência é zero por caminho legítimo — e
          // a nota dizia `R$ 0/mês — já no ROI` debaixo de um card que acabara
          // de prometer 80 h/mês devolvidas. Duas leituras possíveis, as duas
          // erradas: que a conta quebrou, ou que as horas não valem nada. Elas
          // valem; o que não existe é a despesa que elas substituiriam, e é
          // isso que a nota passa a dizer.
          nota={
            alcance.length === 0
              ? "horas que saem da agenda dos gestores"
              : eficienciaMes > 0
                ? `${formatBRL(eficienciaMes)}/mês — já no ROI`
                : "sem custo de treino declarado hoje — nada a devolver ao ROI"
          }
        />
        <CardEscopo
          icone={UserMinusIcon}
          rotulo="Gestores não contratados"
          valor={alcance.length > 0 ? formatNumero(headcount.gestores, 1) : "—"}
          nota={
            alcance.length > 0
              ? `${formatBRLCompacto(headcount.valorAno)}/ano — fora do ROI`
              : "fora do ROI"
          }
        />
      </div>

      {/* ── As médias da conta ───────────────────────────────────────────────
          Vieram do `ConsolidadoView` quando ele foi desmontado (20/08/2026).
          São leituras da conta INTEIRA — recalculadas dos totais, nunca médias
          de médias —, então só existem na aba do consolidado. Ficam aqui,
          coladas nos quatro cards de escopo, porque é a mesma pergunta noutra
          escala: de que tamanho é o que está sendo comprado. */}
      {consolidada && multiTime && consolidado.status === "ok" ? (
        <div className="flex flex-wrap gap-x-6 gap-y-1 px-1 pt-1 text-sm text-(--pf-ink-soft)">
          <span>
            Cobertura da conta:{" "}
            <span className="font-medium tabular-nums text-(--pf-ink)">
              {formatPct(consolidado.cobertura * 100, 0)}
            </span>
          </span>
          <span>
            Receita por vendedor:{" "}
            <span className="font-medium tabular-nums text-(--pf-ink)">
              {formatBRL(consolidado.receitaPorVendedor)}/mês
            </span>
          </span>
          <span>
            Conversão média:{" "}
            <span className="font-medium tabular-nums text-(--pf-ink)">
              {formatPct(consolidado.conversaoMediaPct, 1)}
            </span>
          </span>
          {consolidado.cicloMedioDias !== null ? (
            <span>
              Ciclo médio:{" "}
              <span className="font-medium tabular-nums text-(--pf-ink)">
                {formatDias(consolidado.cicloMedioDias)}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}

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
              {alcance.length > 1 ? "Times" : "Time"}
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
