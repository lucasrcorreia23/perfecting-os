"use client";

import { ArrowDownTrayIcon, ChartBarSquareIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { EmptyState } from "@/components/ui/empty-state";
import { downloadText } from "@/lib/download";
import { PALETA, TESTE_ACHADO_STATUSES, withAlpha } from "@/lib/constants";
import { codigoDesafio } from "@/lib/desafios";
import {
  formatarMedia,
  formatarProporcao,
  type Contagem,
  type Distribuicao,
  type EtapaFunil,
  type Media,
  type UsabilidadeDashboard,
} from "@/lib/usabilidade/dashboard";
import {
  usabilidadeFilename,
  usabilidadeParaJson,
  usabilidadeParaTexto,
  type ExportableAchado,
  type ExportableSessao,
} from "@/lib/usabilidade/export";

/*
 * A leitura agregada do RECORTE — o mesmo que a listagem estava mostrando, e o
 * mesmo que sai no arquivo. Os três leem o `resumo` que o servidor já computou:
 * uma aritmética só.
 */

export function ResultadosView({
  resumo,
  sessoes,
  achados,
  deTotal,
  filtrado,
}: {
  resumo: UsabilidadeDashboard;
  sessoes: ExportableSessao[];
  achados: ExportableAchado[];
  deTotal: number;
  filtrado: boolean;
}) {
  function exportar() {
    const geradoEm = new Date().toISOString();
    // O resumo vai PRONTO: recalcular aqui criaria a segunda aritmética.
    const payload = usabilidadeParaJson({
      sessoes,
      achados,
      resumo,
      deTotal,
      geradoEm,
    });
    downloadText(
      usabilidadeFilename("usabilidade", geradoEm),
      usabilidadeParaTexto(payload),
      "application/json;charset=utf-8",
    );
  }

  if (resumo.sessoes === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex w-fit items-center gap-4">
          <BackButton href="/desafios/usabilidade" />
        </div>
        <EmptyState
          icon={ChartBarSquareIcon}
          title="Nenhuma sessão neste recorte"
          description="Ajuste os filtros na listagem, ou registre a primeira sessão."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <BackButton href="/desafios/usabilidade" />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-lg font-semibold text-slate-900">
              {resumo.sessoes} {resumo.sessoes === 1 ? "sessão" : "sessões"}
            </h2>
            {/*
              O recorte é declarado na tela, não só no arquivo: um número que
              descreve 12 de 300 sessões sem dizer isso lê como se fosse a base.
            */}
            <p className="text-xs text-slate-500">
              {filtrado
                ? `Recorte filtrado — ${resumo.sessoes} de ${deTotal} sessões.`
                : "Todas as sessões registradas."}
            </p>
          </div>
        </div>
        <Button icon={ArrowDownTrayIcon} onClick={exportar}>
          Exportar JSON ({resumo.sessoes})
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TileMedia label="Facilidade da tarefa" media={resumo.medias.b2_facilidade} />
        <TileMedia label="Conversa pareceu real" media={resumo.medias.b2_conversa_real} />
        <TileMedia label="Feedback foi útil" media={resumo.medias.b2_feedback_util} />
        <TileMedia label="Duração da sessão" media={resumo.medias.b0_duracao} />
      </div>

      <Secao
        titulo="Funil da tarefa"
        descricao="Cada etapa sobre quem ela alcança — gestor cria e atribui, vendedor localiza, os dois falam e leem o feedback."
      >
        <ul className="flex flex-col gap-4">
          {resumo.funil.map((etapa) => (
            <LinhaFunil key={etapa.perguntaId} etapa={etapa} />
          ))}
        </ul>
      </Secao>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Secao titulo="Quem participou">
          <div className="flex flex-col gap-4">
            <Barras titulo="Perfil" itens={resumo.porPerfil} total={resumo.sessoes} />
            <Barras titulo="Fluxo testado" itens={resumo.porFluxo} total={resumo.sessoes} />
          </div>
        </Secao>

        <Secao
          titulo="Contexto de treino"
          descricao="Onde e quando a pessoa treinaria de verdade, e com quanto barulho em volta."
        >
          <div className="flex flex-col gap-4">
            <BarrasDistribuicao dist={resumo.distribuicoes.b2_quando_treinaria} />
            <BarrasDistribuicao dist={resumo.distribuicoes.b2_onde_treinaria} />
            <BarrasDistribuicao dist={resumo.distribuicoes.b2_ruido} />
          </div>
        </Secao>
      </div>

      <Secao
        titulo="Como a ferramenta foi recebida"
        descricao="As três perguntas de intenção do Bloco 2."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <BarrasDistribuicao dist={resumo.distribuicoes.b2_concordou_avaliacao} />
          <BarrasDistribuicao dist={resumo.distribuicoes.b2_faria_de_novo} />
          <BarrasDistribuicao dist={resumo.distribuicoes.b2_gestor_entregaria} />
        </div>
      </Secao>

      <Secao
        titulo="Achados"
        descricao="O que foi marcado nas sessões deste recorte, e o que já virou desafio."
      >
        {resumo.achados.total === 0 ? (
          <EmptyState
            discreet
            icon={ChartBarSquareIcon}
            title="Nenhum achado neste recorte"
            description="Marque os achados no detalhe de cada sessão."
          />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Barras
                titulo="Situação"
                itens={Object.entries(resumo.achados.porStatus).map(([id, n]) => ({
                  id,
                  label: TESTE_ACHADO_STATUSES[id as keyof typeof TESTE_ACHADO_STATUSES]
                    .label,
                  cor: TESTE_ACHADO_STATUSES[
                    id as keyof typeof TESTE_ACHADO_STATUSES
                  ].color,
                  n,
                }))}
                total={resumo.achados.total}
              />
              <Barras
                titulo="Severidade"
                itens={resumo.achados.porSeveridade}
                total={resumo.achados.total}
              />
              <Barras
                titulo="Categoria"
                itens={resumo.achados.porCategoria}
                total={resumo.achados.total}
              />
              <Barras
                titulo="Fluxo"
                itens={resumo.achados.porFluxo}
                total={resumo.achados.total}
              />
            </div>

            {resumo.achados.recorrentes.length > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <h4 className="text-xs font-semibold text-slate-500">
                    Problemas que apareceram em mais de uma sessão
                  </h4>
                  {/*
                    Sessões distintas, e o denominador é o recorte. Uma sessão só
                    não é recorrência — por isso a lista começa em duas.
                  */}
                  <p className="text-xs text-slate-500">
                    Contagem de sessões, não de achados. Não entra na recorrência
                    do desafio.
                  </p>
                </div>
                <ul className="flex flex-col">
                  {resumo.achados.recorrentes.map((problema) => (
                    <li
                      key={problema.desafioId}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3 first:pt-0 last:border-b-0 last:pb-0"
                    >
                      <a
                        href={`/desafios/${problema.desafioId}`}
                        className="flex flex-col gap-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                      >
                        <span className="font-mono text-xs text-primary">
                          {codigoDesafio(problema.desafioCodigo)}
                        </span>
                        <span className="text-sm text-slate-800">
                          {problema.resumo}
                        </span>
                      </a>
                      <span className="text-sm tabular-nums text-slate-600">
                        {formatarProporcao(problema.sessoes, problema.deN)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </Secao>
    </div>
  );
}

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 rounded-sm border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-700">{titulo}</h3>
        {descricao ? <p className="text-xs text-slate-500">{descricao}</p> : null}
      </div>
      {children}
    </section>
  );
}

/*
 * Molde do `BigTile` de `poc-overview`, e NÃO o `KpiCard`: `Kpi.value` é
 * `number`, e "5,1 de 7" é string — o valor sairia como 5, sem a régua. Mesma
 * recusa que o dashboard de desafios já fez.
 */
function TileMedia({ label, media }: { label: string; media: Media }) {
  const nota =
    media.status === "sem_dados"
      ? media.deN > 0
        ? `Ninguém respondeu (${media.deN} ${media.deN === 1 ? "aplicável" : "aplicáveis"})`
        : "Não se aplica a este recorte"
      : `${media.n} ${media.n === 1 ? "resposta" : "respostas"} de ${media.deN}`;

  return (
    <div className="flex flex-col gap-2 rounded-sm border border-slate-200 bg-white p-4">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-(length:--text-score-md) font-semibold leading-none tabular-nums text-slate-900">
        {formatarMedia(media)}
      </span>
      {/* O `n` viaja com o número, sempre: uma média de 7 e uma de 1 resposta
          não valem a mesma coisa, e nada na tipografia diria isso. */}
      <span className="text-xs tabular-nums text-slate-500">{nota}</span>
    </div>
  );
}

function LinhaFunil({ etapa }: { etapa: EtapaFunil }) {
  if (etapa.status === "sem_dados") {
    return (
      <li className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-slate-700">{etapa.rotulo}</span>
        <span className="text-sm text-slate-400">
          {etapa.deN === 0 ? "não se aplica" : `— (0 de ${etapa.deN})`}
        </span>
      </li>
    );
  }

  const largura = (n: number) => `${(n / etapa.respondidas) * 100}%`;

  return (
    <li className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-sm text-slate-700">{etapa.rotulo}</span>
        {/* DUAS taxas nomeadas, nunca uma solta: com 3/6/1 em dez sessões,
            "sem ajuda" é 30% e "concluiu" é 90%. */}
        <span className="text-xs tabular-nums text-slate-500">
          sozinho {formatarProporcao(etapa.semAjuda, etapa.respondidas)} · concluiu{" "}
          {formatarProporcao(etapa.semAjuda + etapa.comAjuda, etapa.respondidas)}
        </span>
      </div>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`${etapa.rotulo}: ${etapa.semAjuda} sozinho, ${etapa.comAjuda} com ajuda, ${etapa.naoConcluiu} não concluiu, de ${etapa.respondidas} respostas.`}
      >
        <div style={{ width: largura(etapa.semAjuda), backgroundColor: PALETA.verde }} />
        <div style={{ width: largura(etapa.comAjuda), backgroundColor: PALETA.ambar }} />
        <div
          style={{ width: largura(etapa.naoConcluiu), backgroundColor: PALETA.rosa }}
        />
      </div>
    </li>
  );
}

function BarrasDistribuicao({ dist }: { dist: Distribuicao | undefined }) {
  if (!dist || dist.deN === 0) return null;
  return <Barras titulo={dist.rotulo} itens={dist.baldes} total={dist.deN} />;
}

/*
 * Barras em HTML/CSS, sem biblioteca de gráfico (§8.13). O número é impresso em
 * toda linha e a barra é reforço — a cor nunca é o único sinal.
 */
function Barras({
  titulo,
  itens,
  total,
}: {
  titulo: string;
  itens: Contagem[];
  total: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold text-slate-500">{titulo}</h4>
      <ul className="flex flex-col gap-2">
        {itens.map((item) => (
          <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex flex-col gap-1">
              <span className="truncate text-sm text-slate-700">{item.label}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: total > 0 ? `${(item.n / total) * 100}%` : "0%",
                    backgroundColor: withAlpha(item.cor, 0.85),
                  }}
                />
              </div>
            </div>
            <span className="text-sm tabular-nums text-slate-600">
              {formatarProporcao(item.n, total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
