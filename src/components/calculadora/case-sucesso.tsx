"use client";

import { InformationCircleIcon } from "@heroicons/react/24/outline";
import type { MetasCase } from "@/lib/calculadora/business-case";
import { formatHoras, formatNumero } from "@/lib/calculadora/format";
import { cn } from "@/lib/utils";

// "Vamos criar um case de sucesso juntos" — o fecho da jornada.
//
// É o único bloco da tela que olha para FRENTE. Tudo acima dele projeta doze
// meses; aqui a proposta se compromete com uma janela de noventa dias e com
// quatro metas que dá para conferir no fim dela. É o que transforma a projeção
// em algo auditável: se os dados não vierem, a exposição ficou limitada à
// janela.
//
// As quatro metas NÃO são as quatro alavancas do ROI, e o aviso âmbar diz isso
// em voz alta. Ticket, conversão e ciclo levam mais de um trimestre para
// aparecer no pipe; ancorar o case nelas seria prometer prova que a janela não
// entrega — o jeito mais rápido de queimar a credibilidade que a tela inteira
// passou cinco blocos construindo. Rampa, tempo de gestor, adoção e satisfação
// se medem em 90 dias, e são o que precede qualquer ganho de receita.
//
// Os números vêm de `business-case.ts`, que é derivado do motor: a rampa da
// meta carrega o mesmo haircut de 0,7 que a parcela de rampa carregou no valor,
// e as horas de gestor são o `min()` da eficiência lido em horas. Nenhuma meta
// promete mais do que o ROI ao lado já pagou.

function MetaCard({
  rotulo,
  valor,
  nota,
  destaque,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md p-5",
        destaque
          ? "bg-(--pf-invert)"
          : "border border-(--pf-line) bg-(--pf-surface-alt)",
      )}
    >
      {/* Caixa de duas linhas pelo mesmo motivo do `CardEscopo` da capa: três
          destes quatro rótulos quebram e um não, e sem a caixa fixa o valor do
          primeiro card flutuava 20px acima dos outros três. */}
      <span
        className={cn(
          "pf-panel-title min-h-10",
          destaque ? "text-(--pf-invert-soft)" : "text-(--pf-ink-soft)",
        )}
      >
        {rotulo}
      </span>
      <span
        className={cn(
          // `pf-num-kpi`, o mesmo dos KPIs da capa e do COI: era `pf-num
          // text-xl sm:text-2xl`, mais um dos sete dialetos de número que a
          // passagem de 20/08/2026 unificou. `text-balance` fica: dois destes
          // rótulos ("8 → ~5,6 m", "CSAT ≥ 4,0/5") quebram em telas estreitas.
          "pf-num-kpi text-balance",
          destaque ? "text-(--pf-invert-ink)" : "text-(--pf-ink)",
        )}
      >
        {valor}
      </span>
      <span
        className={cn(
          "text-sm leading-6",
          destaque ? "text-(--pf-invert-soft)" : "text-(--pf-ink-soft)",
        )}
      >
        {nota}
      </span>
    </div>
  );
}

export function CaseSucesso({
  metas,
  cenarioLabel,
  nomeTime,
  multiTime,
}: {
  metas: MetasCase;
  cenarioLabel: string;
  nomeTime: string;
  multiTime: boolean;
}) {
  return (
    <section className="flex flex-col gap-6 rounded-md border border-(--pf-brand)/35 bg-(--pf-surface) p-6 sm:p-8">
      <div className="flex flex-col gap-4">
        <span className="pf-panel-title self-start rounded-full border border-(--pf-brand)/35 bg-(--pf-brand-tint) px-4 py-2 text-(--pf-brand-ink)">
          Próximo passo
        </span>
        {/* Sem caixa alta: a §2 é inegociável dentro da pele, e quem faz o
            papel de eyebrow aqui é a pílula mono acima. */}
        <h2 className="pf-display text-(--pf-ink)">
          Vamos criar um case de sucesso juntos.
        </h2>
        <p className="pf-lead text-(--pf-ink-soft)">
          <span className="font-medium text-(--pf-ink)">
            Case de sucesso recomendado: em {metas.janelaMeses} meses.
          </span>{" "}
          Quatro KPIs combinados no kickoff, medidos na plataforma e no seu CRM — e
          revisados juntos ao fim de cada mês
          {multiTime ? `, para ${nomeTime}` : ""}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetaCard
          destaque
          rotulo="Tempo de rampa"
          valor={`${formatNumero(metas.rampaDeMeses, 0)} → ~${formatNumero(metas.rampaParaMeses, 1)} m`}
          nota={`meta conservadora: Δ rampa do ${cenarioLabel} já com haircut 0,7`}
        />
        <MetaCard
          rotulo="Tempo de gestor devolvido"
          valor={`≈ ${formatHoras(metas.horasGestorDevolvidasMes)}/mês`}
          nota={
            metas.gestorLimitadoPeloPlano
              ? "limitado pelo plano contratado, não pela agenda de hoje — medido na plataforma"
              : "horas que deixam de ser queimadas em treino manual, medidas na plataforma"
          }
        />
        <MetaCard
          rotulo="Vendedores treinados no período"
          valor={`≥ ${metas.adocaoPct}% de ${metas.assentos}`}
          nota={`assentos com horas de prática registradas por semana, nos ${metas.janelaDias} dias`}
        />
        <MetaCard
          rotulo="Satisfação dos vendedores"
          valor={`CSAT ≥ ${formatNumero(metas.csatMin, 1)}/5`}
          nota="pulso quinzenal com o time — adoção só se sustenta se eles gostarem"
        />
      </div>

      {/* O alerta da pele é fio e ícone; o preenchimento é sussurro (§13). Aqui
          ele funciona porque o fundo é `--pf-surface`, não o canvas. */}
      <p className="flex items-start gap-3 rounded-sm border border-(--pf-warn-line) bg-(--pf-warn-surface) p-4 pf-lead text-(--pf-warn-ink)">
        <InformationCircleIcon className="mt-1 h-5 w-5 shrink-0" aria-hidden />
        <span>
          <span className="font-medium">Leitura honesta:</span> métricas de
          performance (ticket, conversão, ciclo) tendem a levar mais tempo para
          performar de fato no pipe. Por isso o case de {metas.janelaMeses} meses
          ancora em{" "}
          <span className="font-medium">
            rampa, tempo de gestor, adoção e satisfação
          </span>{" "}
          — e trata as métricas de receita como indicadores que amadurecem nos
          meses seguintes.
        </span>
      </p>

      <p className="pf-lead text-(--pf-ink-soft)">
        Ao fim dos {metas.janelaDias} dias, auditamos juntos: adoção, horas de
        prática por vendedor, evolução de skill-score e os primeiros sinais no CRM.
        Se os dados validarem, a conta escala; se não, a exposição ficou limitada à
        janela do case.
      </p>
    </section>
  );
}
