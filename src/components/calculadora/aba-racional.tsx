"use client";

import { useRef, useState } from "react";
import { ArrowUturnLeftIcon, DocumentArrowUpIcon } from "@heroicons/react/24/outline";
import { CENARIOS, PLANOS } from "@/lib/calculadora/constants";
import { formatBRL, formatMeses, formatX } from "@/lib/calculadora/format";
import type { ModeloCalculadora } from "@/lib/calculadora/modelo";
import type { PremissasRacional } from "@/lib/calculadora/premissas";
import type { AvisoXlsx } from "@/lib/calculadora/premissas-xlsx";
import type { Cenario, PlanoId } from "@/lib/calculadora/types";
import { Button } from "@/components/ui/button";
import { CampoNumero } from "./campo-numero";

function Campo({
  id,
  rotulo,
  valor,
  formato,
  onChange,
}: {
  id: string;
  rotulo: string;
  valor: number;
  formato: "numero" | "moeda" | "percentual" | "horas";
  onChange: (valor: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2" htmlFor={id}>
      <span className="pf-label text-(--pf-ink-soft)">{rotulo}</span>
      <CampoNumero
        id={id}
        valor={valor}
        formato={formato}
        onChange={(proximo) => {
          if (proximo !== null) onChange(proximo);
        }}
      />
    </label>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-md border border-(--pf-line) bg-(--pf-surface) p-6 sm:p-8">
      <h3 className="pf-card-title text-(--pf-ink)">{titulo}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function AbaRacional({
  token,
  premissas,
  modelo,
  onChange,
  onRestaurar,
}: {
  token: string;
  premissas: PremissasRacional;
  modelo: ModeloCalculadora;
  onChange: (proximo: PremissasRacional) => void;
  onRestaurar: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [avisos, setAvisos] = useState<AvisoXlsx[]>([]);
  const [erroUpload, setErroUpload] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const conta = modelo.consolidado.status === "ok" ? modelo.consolidado : null;
  const mensalidade = modelo.preco.mensal;

  function patch(proximo: PremissasRacional) {
    onChange(proximo);
  }

  async function enviarArquivo(arquivo: File) {
    setEnviando(true);
    setErroUpload(null);
    try {
      const form = new FormData();
      form.set("arquivo", arquivo);
      const response = await fetch(`/api/publico/calculadora/${token}/premissas`, {
        method: "POST",
        body: form,
      });
      const body = (await response.json()) as {
        data?: { premissas?: unknown; avisos?: AvisoXlsx[] };
        error?: { message?: string };
      };
      if (!response.ok) {
        setErroUpload(body.error?.message ?? "Não deu para ler essa planilha.");
        return;
      }
      if (body.data?.premissas) {
        onChange(body.data.premissas as PremissasRacional);
      }
      setAvisos(body.data?.avisos ?? []);
    } catch {
      setErroUpload("Não deu para enviar o arquivo. Tente de novo.");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <p className="pf-panel-title text-(--pf-ink-faint)">Racional deste link</p>
        <h1 className="pf-display text-(--pf-ink)">O que o relatório deste token usa</h1>
        <p className="pf-lead text-(--pf-ink-soft)">
          Vale só aqui. O motor do produto e os outros links não mudam. Fórmulas
          das abas Motor e Conta continuam no código — o que entra é o número
          (haircut, encargos, tabela de tiers, cenários, COI).
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi rotulo="Mensalidade" valor={formatBRL(mensalidade)} />
        <Kpi
          rotulo="Valor / ano"
          valor={conta ? formatBRL(conta.valorAno) : "R$ —"}
        />
        <Kpi rotulo="ROI" valor={conta ? formatX(conta.roi) : "—"} destaque />
        <Kpi
          rotulo="Payback"
          valor={conta ? formatMeses(conta.paybackMeses) : "—"}
        />
      </div>
      {!conta ? (
        <p className="text-sm text-(--pf-ink-faint)">
          Os KPIs aparecem quando o time fecha a conta. Enquanto isso, as
          premissas já valem para o preço da etapa 01.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 rounded-md border border-(--pf-line) bg-(--pf-surface) p-6">
        <p className="pf-label text-(--pf-ink-soft)">Planilha</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(event) => {
            const arquivo = event.target.files?.[0];
            if (arquivo) void enviarArquivo(arquivo);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon={DocumentArrowUpIcon}
            disabled={enviando}
            onClick={() => inputRef.current?.click()}
          >
            {enviando ? "Lendo…" : "Enviar .xlsx"}
          </Button>
          <Button variant="tertiary" icon={ArrowUturnLeftIcon} onClick={onRestaurar}>
            Restaurar padrão
          </Button>
        </div>
        {erroUpload ? (
          <p role="alert" className="text-sm text-trend-negative">
            {erroUpload}
          </p>
        ) : null}
        {avisos.length > 0 ? (
          <ul className="flex flex-col gap-2 text-sm text-(--pf-ink-soft)">
            {avisos.map((aviso) => (
              <li key={aviso.codigo + aviso.mensagem}>{aviso.mensagem}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <Grupo titulo="Premissas">
        <Campo
          id="enc"
          rotulo="Encargos"
          valor={premissas.encargos}
          formato="numero"
          onChange={(n) => patch({ ...premissas, encargos: n })}
        />
        <Campo
          id="jor"
          rotulo="Jornada mensal (h)"
          valor={premissas.jornadaMensalH}
          formato="horas"
          onChange={(n) => patch({ ...premissas, jornadaMensalH: n })}
        />
        <Campo
          id="sup"
          rotulo="Supervisão residual"
          valor={premissas.supervisao * 100}
          formato="percentual"
          onChange={(n) => patch({ ...premissas, supervisao: n / 100 })}
        />
        <Campo
          id="hair"
          rotulo="Haircut"
          valor={premissas.haircut * 100}
          formato="percentual"
          onChange={(n) => patch({ ...premissas, haircut: n / 100 })}
        />
        <Campo
          id="escopo"
          rotulo="Fator de escopo (premissa)"
          valor={premissas.fatorEscopoPremissa}
          formato="numero"
          onChange={(n) => patch({ ...premissas, fatorEscopoPremissa: n })}
        />
        <Campo
          id="piso"
          rotulo="Piso contratual"
          valor={premissas.taxaMinima}
          formato="moeda"
          onChange={(n) => patch({ ...premissas, taxaMinima: n })}
        />
        <Campo
          id="ticket-max"
          rotulo="Teto de ticket (fine-tune)"
          valor={premissas.fineTuneTicketMax * 100}
          formato="percentual"
          onChange={(n) => patch({ ...premissas, fineTuneTicketMax: n / 100 })}
        />
        <Campo
          id="rampa-max"
          rotulo="Teto de rampa (fine-tune)"
          valor={premissas.fineTuneRampaMax * 100}
          formato="percentual"
          onChange={(n) => patch({ ...premissas, fineTuneRampaMax: n / 100 })}
        />
      </Grupo>

      <Grupo titulo="Tabela de tiers">
        {premissas.tabelaTiers.map((faixa, index) => {
          const ultimo = index === premissas.tabelaTiers.length - 1;
          return (
          <div key={faixa.tier} className="flex flex-col gap-4 sm:col-span-2 sm:grid sm:grid-cols-2">
            {ultimo ? (
              <p className="flex items-end text-sm text-(--pf-ink-soft)">
                Tier {faixa.tier} — sem teto de horas
              </p>
            ) : (
            <Campo
              id={`tier-${faixa.tier}-h`}
              rotulo={`Tier ${faixa.tier} — até (h)`}
              valor={faixa.ateHoras}
              formato="horas"
              onChange={(n) => {
                const tabelaTiers = premissas.tabelaTiers.map((item, i) =>
                  i === index ? { ...item, ateHoras: n } : item,
                );
                patch({ ...premissas, tabelaTiers });
              }}
            />
            )}
            <Campo
              id={`tier-${faixa.tier}-tx`}
              rotulo={`Tier ${faixa.tier} — R$/h`}
              valor={faixa.taxaHora}
              formato="moeda"
              onChange={(n) => {
                const tabelaTiers = premissas.tabelaTiers.map((item, i) =>
                  i === index ? { ...item, taxaHora: n } : item,
                );
                patch({ ...premissas, tabelaTiers });
              }}
            />
          </div>
          );
        })}
      </Grupo>

      <Grupo titulo="Horas dos planos">
        {(Object.keys(PLANOS) as PlanoId[]).map((id) => (
          <Campo
            key={id}
            id={`plano-${id}`}
            rotulo={`${PLANOS[id].label} (h/assento/mês)`}
            valor={premissas.horasPlanos[id]}
            formato="horas"
            onChange={(n) =>
              patch({
                ...premissas,
                horasPlanos: { ...premissas.horasPlanos, [id]: n },
              })
            }
          />
        ))}
      </Grupo>

      <Grupo titulo="Cenários">
        {(Object.keys(CENARIOS) as Cenario[]).map((id) => (
          <div key={id} className="flex flex-col gap-3 sm:col-span-2">
            <p className="text-sm font-semibold text-(--pf-ink)">{CENARIOS[id].label}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Campo
                id={`${id}-t`}
                rotulo="Ticket"
                valor={premissas.cenarios[id].ticketPct * 100}
                formato="percentual"
                onChange={(n) =>
                  patch({
                    ...premissas,
                    cenarios: {
                      ...premissas.cenarios,
                      [id]: { ...premissas.cenarios[id], ticketPct: n / 100 },
                    },
                  })
                }
              />
              <Campo
                id={`${id}-r`}
                rotulo="Rampa"
                valor={premissas.cenarios[id].rampaPct * 100}
                formato="percentual"
                onChange={(n) =>
                  patch({
                    ...premissas,
                    cenarios: {
                      ...premissas.cenarios,
                      [id]: { ...premissas.cenarios[id], rampaPct: n / 100 },
                    },
                  })
                }
              />
              <Campo
                id={`${id}-c`}
                rotulo="Ciclo"
                valor={premissas.cenarios[id].cicloPct * 100}
                formato="percentual"
                onChange={(n) =>
                  patch({
                    ...premissas,
                    cenarios: {
                      ...premissas.cenarios,
                      [id]: { ...premissas.cenarios[id], cicloPct: n / 100 },
                    },
                  })
                }
              />
              <Campo
                id={`${id}-v`}
                rotulo="Conversão (p.p.)"
                valor={premissas.cenarios[id].convPp}
                formato="numero"
                onChange={(n) =>
                  patch({
                    ...premissas,
                    cenarios: {
                      ...premissas.cenarios,
                      [id]: { ...premissas.cenarios[id], convPp: n },
                    },
                  })
                }
              />
            </div>
          </div>
        ))}
      </Grupo>

      <Grupo titulo="Custo da inação">
        <Campo
          id="coi-att"
          rotulo="Delta de quota"
          valor={premissas.coi.deltaAttainment * 100}
          formato="percentual"
          onChange={(n) =>
            patch({ ...premissas, coi: { ...premissas.coi, deltaAttainment: n / 100 } })
          }
        />
        <Campo
          id="coi-h"
          rotulo="Haircut do COI"
          valor={premissas.coi.haircut * 100}
          formato="percentual"
          onChange={(n) =>
            patch({ ...premissas, coi: { ...premissas.coi, haircut: n / 100 } })
          }
        />
        <Campo
          id="coi-hmin"
          rotulo="Horas mínimas de coaching"
          valor={premissas.coi.horasCoachingMin}
          formato="horas"
          onChange={(n) =>
            patch({ ...premissas, coi: { ...premissas.coi, horasCoachingMin: n } })
          }
        />
        <Campo
          id="coi-nd"
          rotulo="No decision"
          valor={premissas.coi.noDecision * 100}
          formato="percentual"
          onChange={(n) =>
            patch({ ...premissas, coi: { ...premissas.coi, noDecision: n / 100 } })
          }
        />
      </Grupo>
    </div>
  );
}

function Kpi({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={
        destaque
          ? "flex flex-col gap-1 rounded-md border border-(--pf-line) bg-(--pf-input) p-4"
          : "flex flex-col gap-1 rounded-md border border-(--pf-line) bg-(--pf-surface) p-4"
      }
    >
      <p className="pf-label text-(--pf-ink-faint)">{rotulo}</p>
      <p className="pf-num-kpi text-(--pf-ink)">{valor}</p>
    </div>
  );
}

