"use client";

import { useMemo } from "react";
import {
  AdjustmentsHorizontalIcon,
  ArrowPathRoundedSquareIcon,
  ArrowRightIcon,
  ArrowTrendingUpIcon,
  ArrowUpIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  LanguageIcon,
  MicrophoneIcon,
  ShieldExclamationIcon,
  SpeakerWaveIcon,
  Squares2X2Icon,
  TrophyIcon,
  ViewfinderCircleIcon,
} from "@heroicons/react/24/outline";
import { CASE_JANELA_MESES } from "@/lib/calculadora/constants";
import { formatBRL, formatHoras } from "@/lib/calculadora/format";
import { precoConta } from "@/lib/calculadora/preco";
import type { PlanoId } from "@/lib/calculadora/types";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form";
import type { HeroIcon } from "@/components/ui/types";
import { CampoNumero } from "./campo-numero";
import { IlustracaoTrajetoria } from "./ilustracao-trajetoria";
import { GrupoPlanos } from "./opcao-cards";
import { usePremissas } from "./premissas-context";

// Etapa 01 — a mensalidade antes do ROI.
//
// Substitui a `IntroScreen`, que abria com "o que é / quanto demora" e pedia só
// um clique. Dois campos aqui e a pessoa já sabe o investimento: é a pergunta
// que ela veio fazer, e respondê-la primeiro é o que compra as oito perguntas
// seguintes. O ROI ainda não existe nesta tela — o preço não depende de
// nenhuma premissa da operação, só do volume de horas × a taxa do tier.
//
// Os dois campos gravam no time 1 (`numVendedores`) e na proposta dele
// (`plano`), então a etapa 02 já chega com a pergunta 1 e a 8 semipreenchidas.

// O que entra em qualquer plano. A lista responde à pergunta que os três cards
// de cadência abrem logo ao lado: escolher a cadência menor parece escolher uma
// versão menor do produto, e não é — o que muda entre os planos é volume de
// horas, implementação e nível de serviço, nunca o que o time pode fazer. Sem
// esta lista, o desconto do plano Leve lê como recurso a menos.
//
// Fica na coluna da esquerda, sobre o canvas, e NÃO num painel pintado: a
// exceção do azul cheio da §13 foi aberta para o painel da mensalidade "aqui e
// em lugar nenhum mais", e dois blocos preenchidos na mesma tela desfariam o
// destaque do que a pessoa veio buscar. O que carrega a marca é o glifo.
const INCLUSO: { Icone: HeroIcon; rotulo: string }[] = [
  { Icone: MicrophoneIcon, rotulo: "Roleplay de voz com IA" },
  { Icone: ArrowPathRoundedSquareIcon, rotulo: "Tentativas ilimitadas por cenário" },
  { Icone: AdjustmentsHorizontalIcon, rotulo: "Níveis de dificuldade" },
  { Icone: ShieldExclamationIcon, rotulo: "Objeções configuradas" },
  { Icone: ClipboardDocumentCheckIcon, rotulo: "Notas por critério" },
  { Icone: ChatBubbleLeftRightIcon, rotulo: "Análise de objeções" },
  { Icone: LanguageIcon, rotulo: "Análise de linguagem" },
  { Icone: SpeakerWaveIcon, rotulo: "Transcrição e áudio completos" },
  { Icone: ArrowTrendingUpIcon, rotulo: "Histórico e evolução" },
  { Icone: TrophyIcon, rotulo: "Ranking do time" },
  { Icone: Squares2X2Icon, rotulo: "Painel do gestor" },
  { Icone: ViewfinderCircleIcon, rotulo: "Radar de competências" },
];

export function EtapaMensalidade({
  clientName,
  expiresAt,
  numVendedores,
  plano,
  prazoMeses,
  temProgresso,
  onChangeVendedores,
  onChangePlano,
  onComecar,
}: {
  clientName: string | null;
  expiresAt: string;
  numVendedores: number | null;
  plano: PlanoId;
  prazoMeses: number;
  temProgresso: boolean;
  onChangeVendedores: (valor: number | null) => void;
  onChangePlano: (plano: PlanoId) => void;
  onComecar: () => void;
}) {
  const p = usePremissas();
  // Assentos = vendedores nesta prévia: é o default que `assentosEfetivos`
  // aplica adiante, e inventar outro número aqui faria o preço da etapa 1
  // divergir do da etapa 8 sem nada na tela explicando por quê.
  const preco = useMemo(
    () =>
      numVendedores !== null && numVendedores > 0
        ? precoConta([{ id: "previa", plano, assentos: numVendedores }], prazoMeses, p)
        : null,
    [numVendedores, plano, prazoMeses, p],
  );

  return (
    <div className="fade-in-up grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="flex flex-col gap-6">
        {/*
          A ilustração abre a coluna, logo acima da manchete: ela mostra em
          desenho a premissa que a manchete afirma em palavras — o programa não
          move um número isolado, ele muda a trajetória —, e o vão entre as duas
          curvas é justamente o que as oito perguntas seguintes vão medir.
        */}
        <IlustracaoTrajetoria />
        <h1 className="pf-display text-(--pf-ink)">
          Descubra o valor que a{" "}
          <span className="text-(--pf-brand)">Perfecting</span> pode gerar para
          seu time
        </h1>

        {/*
          Duas colunas a partir do `sm:`, uma abaixo dele: em 360px, rótulo de
          quatro palavras em meia largura quebra em três linhas e a lista deixa
          de ser varrida de relance, que é a única coisa que ela precisa fazer.

          O glífo mora num disco de superfície, sem fio: sobre o canvas azul
          quem separa é a claridade (a superfície é mais clara que a página em
          todo ponto da rampa, §13), e o `--pf-brand-tint` que os selos usam
          empataria com `--pf-canvas-deep` — são dois azuis quase iguais. Borda
          também não: `--pf-line-strong` é o fio de CONTROLE, e nada aqui clica.
        */}
        <div className="flex flex-col gap-4">
          {/* Caixa mista na STRING, caixa alta no CSS. "SEUS" e "ia" escritos
              assim viravam pronúncia — leitor de tela soletra a sigla em caixa
              alta e lê "ia" como palavra. O `pf-panel-title` já faz o
              `text-transform`, então a string só precisa estar certa. */}
          <span id="incluso-em-todos-os-planos" className="pf-panel-title text-(--pf-brand)">
            Seus vendedores powered by IA
          </span>
          <ul
            aria-labelledby="incluso-em-todos-os-planos"
            className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2"
          >
            {INCLUSO.map(({ Icone, rotulo }) => (
              <li key={rotulo} className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--pf-surface-alt) text-(--pf-brand)"
                  aria-hidden
                >
                  <Icone className="h-4 w-4" />
                </span>
                {/* §8.12b: auxiliar em text-sm e o cinza parando no -soft. */}
                <span className="text-sm leading-6 text-(--pf-ink-soft)">{rotulo}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-6 rounded-md border border-(--pf-line) bg-(--pf-surface) p-6 shadow-[var(--shadow-sm)] sm:p-8">
        {/* O eyebrow "Etapa 1 · seu escopo" saiu em 21/08/2026. Ele era
            `aria-hidden`, ou seja decoração declarada, e decoração que
            CONTRADIZ: a régua do topo chama esta etapa de "01 Mensalidade", e o
            painel a chamava de "seu escopo" — dois nomes para o mesmo destino,
            a 100px um do outro. O rótulo do primeiro campo já diz o que a etapa
            pede, e o painel azul abaixo já diz o que ela devolve. */}
        <Field
          label="Quantos vendedores tem a sua operação?"
          help="Vendedores ativos que entrarão no programa."
          htmlFor="campo-escopo-vendedores"
          escala="leitura"
        >
          <CampoNumero
            id="campo-escopo-vendedores"
            valor={numVendedores}
            formato="numero"
            inteiro
            placeholder="Ex.: 30"
            onChange={onChangeVendedores}
            descritoPor="campo-escopo-vendedores-ajuda"
          />
        </Field>

        <Field label="Cadência de treino desejada" escala="leitura">
          <GrupoPlanos valor={plano} onChange={onChangePlano} />
        </Field>

        {/*
          O painel do preço em AZUL DA MARCA (decisão do decisor, 20/08/2026):
          reinstala o "painel do preço" que o protótipo previa, com escopo
          estreito neste bloco. Das três razões pelas quais a §13 o tinha
          cortado, duas não alcançam aqui — esta etapa é EXCLUSIVA da jornada
          pública (`link-detail` não a renderiza, então nenhum fallback precisa
          expressar a inversão) e a etapa 01 não é bloco de resultado, é o painel
          de RESPOSTA de um passo, o mesmo papel da capa. A terceira, o "nunca
          preencher blocos grandes de azul" da §1, é a exceção aberta aqui.

          O tom é o `--pf-brand-deep`, não o `--pf-brand`: sobre o azul médio a
          linha "Volume / Taxa efetiva" só passa dos 4,5:1 se virar branco, e aí
          empata com a mensalidade logo acima. Os porquês, com os números, ficam
          no comentário de `--pf-on-brand` em `globals.css`.

          Travessão enquanto não há vendedores — nunca zero (P6). O vazio, que é
          como a tela abre, tem desenho próprio (abaixo).
        */}
        <div className="flex flex-col gap-4 rounded-md bg-(--pf-brand-deep) p-6 sm:p-7">
          <span className="pf-panel-title text-(--pf-on-brand-soft)" aria-hidden>
            Mensalidade estimada
          </span>
          {preco ? (
            <span className="pf-num-hero text-(--pf-on-brand)">
              {formatBRL(preco.mensal)}
            </span>
          ) : (
            /*
              O estado vazio — e ele é o primeiro que se vê, porque
              `numVendedores` nasce null. O painel estreava com QUATRO
              travessões (o herói e as três leituras derivadas): um travessão
              sozinho em 40px de mono não lê como "ainda não há valor", lê como
              elemento quebrado, e os três de baixo repetiam a mesma notícia em
              fila.

              O slot guarda a FORMA do valor: `R$ —` é o mesmo travessão que
              `formatBRL` devolve, com a moeda na frente para o espaço continuar
              lendo como dinheiro. Vai apagado e `aria-hidden` porque quem
              carrega o sentido é a linha abaixo dele; as três leituras
              derivadas simplesmente não existem enquanto não há o que derivar.

              Skeleton pulsante seria a saída errada: pulso promete que algo vem
              sozinho, e aqui a espera é por QUEM LÊ. Por isso o ghost é inerte e
              a linha aponta para cima — os dois campos ficam acima do painel em
              qualquer largura, porque a coluna é uma só.
            */
            <div className="flex flex-col gap-2">
              <span className="pf-num-hero text-(--pf-on-brand)/40" aria-hidden>
                R$ —
              </span>
              <p className="flex items-start gap-2 text-sm leading-6 text-(--pf-on-brand-soft)">
                <ArrowUpIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Informe quantos vendedores acima e a mensalidade aparece aqui.
                </span>
              </p>
            </div>
          )}
          {/*
            O selo da oferta. Os meses saem de `CASE_JANELA_MESES` — o mesmo
            número que o bloco "Vamos criar um case de sucesso juntos" promete no
            fim da jornada. Cravar "3" aqui criaria um segundo lugar onde a
            janela mora, e as duas pontas começariam a divergir no primeiro
            ajuste comercial.
          */}
          <span className="pf-panel-title self-start rounded-full border border-(--pf-on-brand-line) px-4 py-2 text-(--pf-on-brand)">
            {/* O verde é o `--pf-positive-on-brand`, não o `trend-positive` da
                §1: sobre este azul o verde da conta dá 2,38:1. E ele fica nas
                duas palavras que nomeiam a oferta — pintar a frase inteira
                apagaria a distinção entre o que é benefício e o que é o
                benefício. */}
            <span className="text-(--pf-positive-on-brand)">Benefício exclusivo:</span>{" "}
            case de sucesso de {CASE_JANELA_MESES} meses incluso
          </span>
          {/*
            DUAS LEITURAS, E SÓ ESTAS DUAS (decisão do decisor, 21/08/2026).
            Volume e taxa efetiva dizem o TAMANHO e o PREÇO UNITÁRIO do que está
            sendo comprado — é a estrutura do painel, não a conta que o produziu.
            O que saiu daqui foi a MECÂNICA DE PRECIFICAÇÃO: a linha do tier com
            a faixa ("Tier 1 (≤ 262 h/mês): R$ 98/h") e o aviso âmbar que
            explicava, quando o piso mordia, por que o número não era horas ×
            taxa. As duas abriam a régua de preço na primeira tela, antes de a
            pessoa saber o que o programa faz — e o tier ainda repetia, noutra
            forma, a taxa que já está na linha ao lado.

            A conta continua alcançável: ela mora no "De onde vem esse preço" de
            `quanto-custa.tsx`, na etapa 03, dentro de um recolhível — detalhe
            sob demanda para quem já viu o resultado, com o tier, a faixa e a
            cobrança mínima quando ela é o que vale.

            Rótulo fino e valor em negrito e mono: sem os dois pesos, "Volume" e
            "200 h/mês" liam com a mesma força e o par virava uma linha plana.
          */}
          {preco ? (
            <dl className="flex flex-wrap gap-x-6 gap-y-1">
              <div className="flex items-baseline gap-1.5">
                <dt className="pf-hint text-(--pf-on-brand-soft)">Volume:</dt>
                <dd className="pf-num text-sm font-bold text-(--pf-on-brand)">
                  {formatHoras(preco.horasMes)}/mês
                </dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="pf-hint text-(--pf-on-brand-soft)">Taxa efetiva:</dt>
                <dd className="pf-num text-sm font-bold text-(--pf-on-brand)">
                  {formatBRL(preco.taxaCombinada, 2)}/h
                </dd>
              </div>
            </dl>
          ) : null}
        </div>

        <Button
          variant="primary"
          icon={ArrowRightIcon}
          iconPosition="right"
          onClick={onComecar}
        >
          {temProgresso
            ? "Continuar de onde parei"
            : "Calcule o ROI da Perfecting na sua operação"}
        </Button>

        {/* Uma linha, não três bullets com ícone: as mesmas três informações
            (duração, autosave, validade) são ressalvas do CTA logo acima, e em
            lista vertical pesavam mais que ele. */}
        <p className="text-center text-sm leading-6 text-(--pf-ink-soft)">
          Leva ~5 minutos. Salva sozinho — você pode parar e voltar. Link válido
          até {formatDate(expiresAt)}.
        </p>
      </div>
    </div>
  );
}
