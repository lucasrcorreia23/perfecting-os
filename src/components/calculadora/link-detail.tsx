"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  LinkIcon,
  NoSymbolIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { getCalculatorLinkUrl } from "@/lib/actions/calculator-links";
import { CAMPO_DEFS, CAMINHO_LABEL } from "@/lib/calculadora/campos";
import { CAMINHOS, CENARIOS, PLANOS } from "@/lib/calculadora/constants";
import { PASSOS, parseEstado } from "@/lib/calculadora/estado";
import {
  formatBRL,
  formatDias,
  formatHoras,
  formatMeses,
  formatNumero,
  formatPct,
} from "@/lib/calculadora/format";
import { linkStatus } from "@/lib/calculadora/link-status";
import { compararCenarios } from "@/lib/calculadora/cenarios-comparacao";
import { computarModelo } from "@/lib/calculadora/modelo";
import type { CampoId, EntradasTime } from "@/lib/calculadora/types";
import type { Tables } from "@/lib/database.types";
import { formatDate, formatDateTime } from "@/lib/format";
import type { HeroIcon } from "@/components/ui/types";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { CalculatorStatusChip } from "@/components/ui/calculator-status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Disclaimer } from "./disclaimer";
import { CascataValor, ComparacaoCenarios } from "./graficos-resultado";
import { QuantoCusta } from "./quanto-custa";
import {
  AvisosCoerencia,
  ChecagemRealidade,
  EficienciaCard,
  HeroResultado,
  PerformanceCard,
  ResultadoIncompleto,
} from "./resultado-time";
import { PaineisTrajetoria } from "./trajetoria-panel";
import { SeloEvidencia } from "./selo-evidencia";
import { VincularClienteModal, type ClienteOption } from "./vincular-modal";

type LinkRow = Tables<"calculator_links">;
type EventRow = Tables<"calculator_link_events">;

const EVENTO_META: Record<string, { icon: HeroIcon; label: string }> = {
  criado: { icon: LinkIcon, label: "Link criado" },
  acesso: { icon: EyeIcon, label: "Acessou a calculadora" },
  passo_concluido: { icon: CheckCircleIcon, label: "Concluiu um passo" },
  enviado: { icon: PaperAirplaneIcon, label: "Enviou a proposta" },
  editado_pos_envio: { icon: PencilSquareIcon, label: "Ajustou após o envio" },
  revogado: { icon: NoSymbolIcon, label: "Link revogado" },
  prorrogado: { icon: CalendarDaysIcon, label: "Validade prorrogada" },
  link_rotacionado: { icon: ArrowPathIcon, label: "Nova URL gerada" },
  vinculado_a_cliente: { icon: UserPlusIcon, label: "Vinculado a um cliente" },
};

function descricaoEvento(event: EventRow): string | null {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  switch (event.type) {
    case "criado":
      return payload.avulso ? "Calculadora avulsa, sem cliente" : null;
    case "passo_concluido":
      return `Passo ${payload.passo} · ${payload.time_nome ?? ""}`;
    case "enviado": {
      const consolidado = payload.consolidado as { roi?: number } | null;
      const proposta = payload.proposta as { mensal?: number; prazoMeses?: number } | null;
      const partes: string[] = [];
      if (consolidado?.roi) {
        partes.push(
          `ROI ${consolidado.roi.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}×`,
        );
      }
      if (proposta?.mensal) {
        partes.push(`${formatBRL(proposta.mensal)}/mês · ${proposta.prazoMeses} meses`);
      }
      return partes.length > 0 ? partes.join(" · ") : null;
    }
    case "editado_pos_envio": {
      const campos = payload.campos_alterados as string[] | undefined;
      if (!campos?.length) return null;
      const mostrar = campos.slice(0, 4).join(" · ");
      return campos.length > 4 ? `${mostrar} · +${campos.length - 4}` : mostrar;
    }
    case "prorrogado":
      return payload.expira_em ? `Até ${formatDate(String(payload.expira_em))}` : null;
    case "vinculado_a_cliente":
      return typeof payload.client_name === "string" ? String(payload.client_name) : null;
    default:
      return null;
  }
}

function valorCampo(entradas: EntradasTime, campo: CampoId): string {
  if (campo === "caminho") {
    return entradas.caminho ? CAMINHOS[entradas.caminho].label : "—";
  }
  const def = CAMPO_DEFS[campo];
  const valor = entradas[campo] as number | null;
  switch (def.formato) {
    case "moeda":
      return formatBRL(valor);
    case "percentual":
      return formatPct(valor, 1);
    case "horas":
      return formatHoras(valor);
    case "dias":
      return formatDias(valor);
    case "meses":
      return valor === null ? "—" : formatMeses(valor);
    default:
      return formatNumero(valor, 1);
  }
}

export function LinkDetail({
  link,
  events,
  client,
  atorNomes,
  clientes = [],
}: {
  link: LinkRow;
  events: EventRow[];
  client: { id: string; name: string; company: string | null } | null;
  atorNomes: Record<string, string>;
  clientes?: ClienteOption[];
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [vincular, setVincular] = useState(false);
  const [pending, startTransition] = useTransition();

  const estado = useMemo(() => parseEstado(link.state), [link.state]);
  // O detalhe recomputa do state — o result_summary é só cache da listagem.
  const modelo = useMemo(() => computarModelo(estado), [estado]);

  const status = linkStatus({
    revokedAt: link.revoked_at,
    expiresAt: link.expires_at,
    submittedAt: link.submitted_at,
  });

  function copiarLink() {
    startTransition(async () => {
      const result = await getCalculatorLinkUrl(link.id);
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      try {
        await navigator.clipboard.writeText(result.data.url);
        setFeedback("Link copiado.");
      } catch {
        setFeedback(result.data.url);
      }
    });
  }

  const multiTime = modelo.times.length > 1;
  const voltarHref = client ? `/clientes/${client.id}?tab=calculadora` : "/clientes";

  // Eventos do mesmo autosave compartilham o timestamp; desempatar pelo passo
  // (decrescente, como o resto da lista) evita a leitura embaralhada.
  const eventosOrdenados = [...events].sort((a, b) => {
    const diff = b.created_at.localeCompare(a.created_at);
    if (diff !== 0) return diff;
    const passo = (event: EventRow) =>
      Number((event.payload as Record<string, unknown> | null)?.passo ?? 0);
    return passo(b) - passo(a);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <BackButton href={voltarHref} />
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">
              {link.label ?? "Calculadora de ROI"}
            </h1>
            <span className="text-sm text-slate-500">
              {client ? (client.company ?? client.name) : "Sem cliente vinculado"}
            </span>
            <CalculatorStatusChip status={status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {clientes.length > 0 ? (
            <Button variant="secondary" icon={UserPlusIcon} onClick={() => setVincular(true)}>
              {client ? "Mover de cliente" : "Vincular a cliente"}
            </Button>
          ) : null}
          <Button variant="secondary" icon={LinkIcon} onClick={copiarLink} disabled={pending}>
            Copiar link
          </Button>
        </div>
      </div>

      {feedback ? (
        <p role="status" className="break-all text-xs text-slate-500">
          {feedback}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
        <span>Criado em {formatDateTime(link.created_at)}</span>
        <span>Expira em {formatDate(link.expires_at)}</span>
        <span className="tabular-nums">{link.access_count} acessos</span>
        {link.last_access_at ? (
          <span>Último acesso {formatDateTime(link.last_access_at)}</span>
        ) : null}
        {link.submitted_at ? (
          <span>Enviado em {formatDateTime(link.submitted_at)}</span>
        ) : null}
      </div>

      <div className="border-t border-slate-200" aria-hidden />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        {/* Coluna principal: o resultado e a proposta como a pessoa deixou */}
        <div className="flex min-w-0 flex-col gap-6">
          {modelo.consolidado.status === "ok" && multiTime ? (
            <HeroResultado
              titulo="Conta consolidada: todos os times"
              roi={modelo.consolidado.roi}
              paybackMeses={modelo.consolidado.paybackMeses}
              valorAno={modelo.consolidado.valorAno}
              frase={null}
            />
          ) : null}

          {/* Os blocos de resultado não são donos da própria superfície — quem
              dá moldura é o container. É o que permite a esta página e à do
              visitante compartilharem os mesmos componentes sem que uma delas
              vire pilha de cards aninhados. Um container só, seções separadas
              por fio, igual ao público. */}
          <div className="flex flex-col divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
            {/* A proposta que o cliente montou vem antes do detalhamento: é o
                que ele enviou para nós. */}
            <div className="px-5 py-8 sm:px-6">
              <QuantoCusta
                times={modelo.times}
                preco={modelo.preco}
                prazoMeses={modelo.prazoMeses}
                readOnly
              />
            </div>

            {modelo.times.map((time) => {
              const editada = time.estadoTime.trajetoria?.editada ?? null;
              return (
                <section
                  key={time.id}
                  className="flex flex-col gap-6 px-5 py-8 sm:px-6"
                >
                  {multiTime ? (
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-base font-semibold text-slate-900">
                        {time.nome}
                      </h2>
                      <span className="text-xs text-slate-500">
                        {time.proposta.assentos} assentos ·{" "}
                        {PLANOS[time.proposta.plano].label}
                      </span>
                      {time.sel.modo === "personalizado" ? (
                        <SeloEvidencia selo="personalizado" />
                      ) : (
                        <span className="text-xs text-slate-400">
                          cenário {CENARIOS[time.sel.cenario].label}
                        </span>
                      )}
                    </div>
                  ) : null}

                  {time.resultado.status === "ok" ? (
                    <>
                      {/* Verde e sem borda, como o visitante viu: dentro do
                          container, o tom claro (branco + borda) leria como
                          card dentro de card. */}
                      <HeroResultado
                        titulo={
                          multiTime
                            ? `${time.nome}: ROI projetado`
                            : "ROI projetado pelo cliente"
                        }
                        roi={time.resultado.roi}
                        paybackMeses={time.resultado.paybackMeses}
                        valorAno={time.resultado.valorAno}
                        frase={
                          !multiTime && time.sel.modo === "preset"
                            ? `Cenário ${CENARIOS[time.sel.cenario].label}.`
                            : !multiTime
                              ? "Parâmetros personalizados pelo cliente, dentro dos tetos do modelo."
                              : null
                        }
                        tom="destaque"
                      />
                      {/* Mesmo fio no vão da tela pública: gap zerado e o
                          padding nas duas colunas, para a régua cair no meio. */}
                      <div className="grid grid-cols-1 gap-8 2xl:grid-cols-2 2xl:gap-0">
                        <div className="2xl:pr-10">
                          <EficienciaCard
                            resultado={time.resultado}
                            entradas={time.entradas}
                            plano={time.proposta.plano}
                          />
                        </div>
                        <div className="2xl:border-l 2xl:border-slate-100 2xl:pl-10">
                          <PerformanceCard
                            resultado={time.resultado}
                            entradas={time.entradas}
                          />
                        </div>
                      </div>
                      <CascataValor resultado={time.resultado} />
                      {/* Os três cenários lado a lado: o interno precisa saber
                          qual faixa o cliente tinha à frente quando enviou. */}
                      {(() => {
                        const linhas = compararCenarios(
                          time.entradas,
                          time.proposta,
                          time.precoMes,
                          modelo.prazoMeses,
                        );
                        return linhas ? (
                          <ComparacaoCenarios
                            linhas={linhas}
                            precoAno={time.resultado.precoAno}
                            cenarioAtivo={
                              time.sel.modo === "preset" ? time.sel.cenario : time.sel.base
                            }
                            personalizado={time.sel.modo === "personalizado"}
                          />
                        ) : null;
                      })()}
                      <PaineisTrajetoria
                        margemMensalAtual={time.resultado.margemMensalAtual}
                        G={time.resultado.G}
                        valorAno={time.resultado.valorAno}
                        precoAno={time.resultado.precoAno}
                        eficienciaAno={time.resultado.eficienciaAno}
                        editada={editada}
                        readOnly
                      />
                      <ChecagemRealidade resultado={time.resultado} />
                      {/* §4.7: o interno revisa o link antes de conversar com
                          o cliente, então precisa ver os mesmos avisos de
                          coerência que o visitante viu. */}
                      <AvisosCoerencia avisos={time.resultado.avisos} />
                    </>
                  ) : (
                    <ResultadoIncompleto faltando={time.resultado.faltando} />
                  )}
                </section>
              );
            })}
          </div>

          {/* Invariante 10: disclaimer permanente em TODA tela de resultado —
              a interna também mostra ROI, payback e os painéis. */}
          <Disclaimer />
        </div>

        {/* Coluna lateral: entradas + timeline */}
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">Entradas preenchidas</h3>
            {modelo.times.map((time) => (
              <div key={time.id} className="flex flex-col gap-2">
                {multiTime ? (
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {time.nome}
                  </span>
                ) : null}
                <dl className="flex flex-col gap-1.5">
                  {PASSOS.flatMap((passo) => passo.campos).map((campo) => {
                    if (campo === "custoExternoAno" && time.entradas.caminho !== "externo") {
                      return null;
                    }
                    if (campo === "custoEventoAno" && time.entradas.caminho !== "evento") {
                      return null;
                    }
                    const label =
                      campo === "caminho" ? CAMINHO_LABEL : CAMPO_DEFS[campo].label;
                    return (
                      <div
                        key={campo}
                        className="flex items-baseline justify-between gap-3 text-xs"
                      >
                        <dt className="text-slate-500">{label}</dt>
                        <dd className="text-right font-medium tabular-nums text-slate-800">
                          {valorCampo(time.entradas, campo)}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">Linha do tempo</h3>
            {events.length === 0 ? (
              <EmptyState
                icon={ClockIcon}
                title="Nenhum evento ainda"
                description="Acessos e preenchimentos aparecem aqui."
                discreet
              />
            ) : (
              <ol className="flex flex-col gap-3">
                {eventosOrdenados.map((event) => {
                  const meta = EVENTO_META[event.type] ?? {
                    icon: ClockIcon,
                    label: event.type,
                  };
                  const Icon = meta.icon;
                  const detalhe = descricaoEvento(event);
                  const ator = event.actor_id ? atorNomes[event.actor_id] : null;
                  return (
                    <li key={event.id} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
                        <Icon className="h-4 w-4 text-slate-500" aria-hidden />
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-sm font-medium text-slate-800">
                          {meta.label}
                          {ator ? (
                            <span className="font-normal text-slate-500"> · {ator}</span>
                          ) : null}
                        </span>
                        {detalhe ? (
                          <span className="break-words text-xs text-slate-500">{detalhe}</span>
                        ) : null}
                        <span className="text-xs text-slate-400">
                          {formatDateTime(event.created_at)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>

      <VincularClienteModal
        open={vincular}
        onClose={() => setVincular(false)}
        linkId={link.id}
        linkNome={link.label ?? "Calculadora de ROI"}
        clientes={clientes}
        clienteAtualId={client?.id ?? null}
        irParaClienteAoConcluir
      />
    </div>
  );
}
