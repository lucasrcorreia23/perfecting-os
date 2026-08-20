"use client";

import { useMemo } from "react";
import {
  ArrowRightIcon,
  ArrowUpIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  CASE_JANELA_MESES,
  ESCADA_PRECO,
  TAXA_MINIMA,
} from "@/lib/calculadora/constants";
import { formatBRL, formatHoras } from "@/lib/calculadora/format";
import { precoConta } from "@/lib/calculadora/preco";
import type { PlanoId } from "@/lib/calculadora/types";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form";
import { CampoNumero } from "./campo-numero";
import { GrupoPlanos } from "./opcao-cards";

// Etapa 01 — a mensalidade antes do ROI.
//
// Substitui a `IntroScreen`, que abria com "o que é / quanto demora" e pedia só
// um clique. Dois campos aqui e a pessoa já sabe o investimento: é a pergunta
// que ela veio fazer, e respondê-la primeiro é o que compra as oito perguntas
// seguintes. O ROI ainda não existe nesta tela — o preço não depende de
// nenhuma premissa da operação, só de horas × escada.
//
// Os dois campos gravam no time 1 (`numVendedores`) e na proposta dele
// (`plano`), então a etapa 02 já chega com a pergunta 1 e a 8 semipreenchidas.

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
  // Assentos = vendedores nesta prévia: é o default que `assentosEfetivos`
  // aplica adiante, e inventar outro número aqui faria o preço da etapa 1
  // divergir do da etapa 8 sem nada na tela explicando por quê.
  const preco = useMemo(
    () =>
      numVendedores !== null && numVendedores > 0
        ? precoConta([{ id: "previa", plano, assentos: numVendedores }], prazoMeses)
        : null,
    [numVendedores, plano, prazoMeses],
  );

  const tierMarginal = preco?.extrato.at(-1)?.taxaHora ?? null;
  const primeiraTaxa = ESCADA_PRECO[0].taxaHora;
  const ultimaTaxa = ESCADA_PRECO[ESCADA_PRECO.length - 1].taxaHora;

  const provas = [
    { valor: `R$ ${primeiraTaxa} → ${ultimaTaxa}`, rotulo: "por hora, por tier" },
    { valor: formatBRL(TAXA_MINIMA), rotulo: "piso mensal" },
    { valor: "3 cenários", rotulo: "de ROI no relatório" },
  ];

  return (
    <div className="fade-in-up grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="flex flex-col gap-6">
        <span className="pf-panel-title self-start rounded-full border border-(--pf-line-strong) px-4 py-2 text-(--pf-brand)">
          Simulador interativo · premissas declaradas na tela
        </span>
        <h1 className="pf-display text-(--pf-ink)">
          Descubra a mensalidade da Perfecting para{" "}
          {clientName ? (
            <span className="text-(--pf-brand)">{clientName}</span>
          ) : (
            "o seu time"
          )}
          .
        </h1>
        {/* §8.12b: corpo em text-base e o cinza parando no -soft. */}
        <p className="pf-lead text-(--pf-ink-soft)">
          Dois campos e você já sabe o investimento:{" "}
          <span className="font-medium text-(--pf-ink)">quantidade de vendedores</span> e a{" "}
          <span className="font-medium text-(--pf-ink)">cadência de treino</span> desejada.
          Preço em escada progressiva — quanto mais horas, menor o R$/hora.
        </p>
        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          {provas.map((prova) => (
            <div key={prova.rotulo} className="flex flex-col gap-1">
              <dd className="pf-num-kpi text-(--pf-ink)">
                {prova.valor}
              </dd>
              <dt className="pf-hint text-(--pf-ink-soft)">{prova.rotulo}</dt>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-col gap-6 rounded-md border border-(--pf-line) bg-(--pf-surface) p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <span
          className="pf-panel-title text-(--pf-brand)"
          aria-hidden
        >
          Etapa 1 · seu escopo
        </span>

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
          <span
            className="pf-panel-title text-(--pf-on-brand-soft)"
            aria-hidden
          >
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
            Benefício exclusivo: case de sucesso de {CASE_JANELA_MESES} meses incluso
          </span>
          {/*
            Rótulo fino, valor em negrito e mono: sem os dois pesos, "Volume"
            e "80 h/mês" liam com a mesma força e o painel virava uma lista
            plana de linhas iguais. O tier marginal ganha o próprio grupo,
            porque é um dado secundário ao par volume/taxa, não um terceiro
            item da mesma fileira.
          */}
          {preco ? (
            <dl className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
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
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="pf-hint text-(--pf-on-brand-soft)">Tier marginal:</dt>
                <dd className="pf-num text-sm font-bold text-(--pf-on-brand)">
                  {tierMarginal !== null ? `${formatBRL(tierMarginal)}/h` : "—"}
                </dd>
              </div>
            </dl>
          ) : null}
          {preco?.pisoAplicado ? (
            <p className="flex items-start gap-2 text-sm leading-6 text-(--pf-warn-on-brand)">
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                O volume ficou abaixo do piso de {formatBRL(TAXA_MINIMA)}/mês, que é o
                que vale aqui.
              </span>
            </p>
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
