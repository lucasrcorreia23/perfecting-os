"use client";

import { PrinterIcon } from "@heroicons/react/24/outline";
import {
  CENARIOS,
  DIAS_UTEIS_MES,
  NIVEL_COPY,
  PLANOS,
  PRAZO_COPY,
} from "@/lib/calculadora/constants";
import {
  formatBRL,
  formatMeses,
  formatNumero,
  formatX,
} from "@/lib/calculadora/format";
import type { TimeModelo } from "@/lib/calculadora/modelo";
import type { PrecoConta, ResultadoConsolidado } from "@/lib/calculadora/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "./disclaimer";
import { SecaoResultado } from "./secao-resultado";
import { SeloEvidencia } from "./selo-evidencia";

// Resumo verificável e imprimível: o parágrafo-síntese, os três números, o
// bloco "verificável nesta tela" (cada trava com o valor que a prova) e a
// tabela da conta que o visitante montou. É o artefato que sobrevive à reunião.
//
// Por isso ele repete em prosa o que a página já mostrou: é o único bloco lido
// FORA da tela, sem o hero acima nem os cards de detalhe ao lado. E é o único
// que imprime — o disclaimer mora aqui dentro, senão a folha sai sem ele
// (invariante 10).

const PRINT_CSS = `
@media print {
  body * { visibility: hidden; }
  #resumo-verificavel, #resumo-verificavel * { visibility: visible; }
  #resumo-verificavel { position: absolute; inset: 0; margin: 0; border: none; }
  #resumo-verificavel [data-no-print] { display: none; }
  /* O navegador descarta fundos na impressão por padrão; sem isto a zebra da
     oferta sai branca justamente no papel, que é onde a tabela é lida. */
  #resumo-verificavel [data-zebra] tr {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
`;

export function ResumoVerificavel({
  preco,
  prazoMeses,
  times,
  consolidado,
  dataCalculo,
}: {
  preco: PrecoConta;
  prazoMeses: number;
  times: TimeModelo[];
  consolidado: ResultadoConsolidado;
  dataCalculo: string;
}) {
  if (consolidado.status !== "ok") return null;
  const multiTime = times.length > 1;
  const totalAssentos = consolidado.totalAssentos;
  const primeiro = times[0];
  const ok = primeiro.resultado.status === "ok" ? primeiro.resultado : null;
  const nivel = NIVEL_COPY[preco.nivelServico];

  const escopo = multiTime ? `${times.length} times` : primeiro.nome;
  const subtitulo = `${escopo} · cálculo de ${dataCalculo}`;

  // Síntese em prosa: quem lê o resumo impresso não tem o hero acima.
  const vendedores = primeiro.entradas.numVendedores;
  const cenarioFrase =
    primeiro.sel.modo === "preset"
      ? `no cenário ${CENARIOS[primeiro.sel.cenario].label}`
      : "com os parâmetros que você ajustou";
  const sintese =
    !multiTime && vendedores !== null
      ? `Com ${formatNumero(vendedores, 0)} vendedores praticando ${PLANOS[primeiro.proposta.plano].horasMes} h por mês, a projeção ${cenarioFrase} indica ${formatBRL(consolidado.valorAno)} por ano em margem e economia, sobre um investimento de ${formatBRL(preco.mensal)} por mês. O retorno projetado é de ${formatX(consolidado.roi)}, com payback em ${formatMeses(consolidado.paybackMeses)}.`
      : `Com ${totalAssentos} assentos em ${times.length} times, a projeção indica ${formatBRL(consolidado.valorAno)} por ano em margem e economia, sobre um investimento de ${formatBRL(preco.mensal)} por mês. O retorno projetado é de ${formatX(consolidado.roi)}, ponderado pelo investimento de cada time, com payback em ${formatMeses(consolidado.paybackMeses)}.`;

  // Régua diária (§4.10) contra a mesma prática conduzida por um gestor. Os
  // dois números saem do resultado; aqui só se monta a comparação.
  const ancoragem = ok?.linhasNaoSomadas.find(
    (linha) => linha.id === "ancoragem_hora_roleplay",
  );
  const custoHoraGestor = ancoragem?.detalhe?.custoHoraGestor ?? null;
  const custoDiaGestor =
    !multiTime && custoHoraGestor !== null
      ? (custoHoraGestor * PLANOS[primeiro.proposta.plano].horasMes) / DIAS_UTEIS_MES
      : null;
  const custoDiaPerfecting = !multiTime ? (ok?.granularidade.custoDiaPorVendedor ?? null) : null;

  // A oferta é tabela de verdade (rótulo → valor), não lista de linhas soltas:
  // é a parte do resumo que se lê de relance no papel.
  const linhasOferta: { rotulo: string; valor: string; nota?: string }[] = [
    {
      rotulo: "Times e vendedores",
      valor: `${times.length} ${times.length === 1 ? "time" : "times"} · ${totalAssentos} assentos`,
    },
    {
      rotulo: "Prática",
      valor: times
        .map(
          (time) =>
            `${PLANOS[time.proposta.plano].label} ${PLANOS[time.proposta.plano].horasMes} h/vendedor/mês`,
        )
        .filter((valor, index, lista) => lista.indexOf(valor) === index)
        .join(" · "),
    },
    {
      rotulo: "Volume total",
      valor: `${formatNumero(preco.horasMes, 0)} h/mês · taxa efetiva ${formatBRL(preco.taxaCombinada, 2)}/h`,
    },
    {
      rotulo: "Investimento",
      valor: `${formatBRL(preco.mensal)}/mês · ${formatBRL(preco.mensal / Math.max(totalAssentos, 1), 0)} por assento`,
    },
    {
      rotulo: "Prazo",
      valor: `${prazoMeses} meses · total de ${formatBRL(preco.mensal * prazoMeses)}`,
      nota: PRAZO_COPY[prazoMeses],
    },
    {
      rotulo: "Nível de serviço",
      valor: `${nivel.nome} · ${nivel.incluso}`,
    },
  ];

  return (
    <>
      <style>{PRINT_CSS}</style>
      {/* Seção, não card solto: era o único bloco da etapa sem título de seção
          acima, e na nova escala isso o deixava órfão. O `id` sobe para cá
          para que a folha impressa saia com o título junto. */}
      <SecaoResultado
        id="resumo-verificavel"
        titulo="Resumo"
        descricao={subtitulo}
        acao={
          <span data-no-print>
            <Button
              variant="secondary"
              size="sm"
              icon={PrinterIcon}
              onClick={() => window.print()}
            >
              Imprimir
            </Button>
          </span>
        }
      >
        <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <SeloEvidencia selo="projecao" />
          <p className="text-base leading-7 text-slate-700">{sintese}</p>
        </div>

        {/* Payback fica slate: é tempo, não parcela que entra na conta — o
            hero já diz o mesmo sobre o mesmo número. */}
        <div className="grid grid-cols-3 gap-6 border-y border-slate-100 py-6">
          {[
            { rotulo: "ROI", valor: formatX(consolidado.roi), positivo: true },
            {
              rotulo: "Payback",
              valor: formatMeses(consolidado.paybackMeses),
              positivo: false,
            },
            {
              rotulo: "Valor/ano",
              valor: formatBRL(consolidado.valorAno),
              positivo: true,
            },
          ].map((item) => (
            <div key={item.rotulo} className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-600">{item.rotulo}</span>
              <span
                className={cn(
                  "text-xl font-semibold tabular-nums",
                  item.positivo ? "text-trend-positive" : "text-slate-900",
                )}
              >
                {item.valor}
              </span>
            </div>
          ))}
        </div>

        {custoDiaPerfecting !== null && custoDiaGestor !== null ? (
          <p className="text-base leading-7 text-slate-700">
            <span className="font-medium tabular-nums">
              {formatBRL(custoDiaPerfecting, 2)}
            </span>{" "}
            por vendedor por dia útil — contra{" "}
            <span className="font-medium tabular-nums">
              {formatBRL(custoDiaGestor, 2)}
            </span>{" "}
            se um gestor conduzisse a mesma prática.
          </p>
        ) : null}

        {/* A lista "Verificável nesta tela" saiu daqui: as mesmas travas estão
            em "Perguntas comuns", com o argumento inteiro em vez de uma
            linha, e repetidas nos dois lugares só engordavam o fecho. O que
            sobrou é o que o papel precisa — a oferta e o próximo passo.

            Zebra em vez de fio entre linhas: são seis parcelas da mesma
            oferta, e seis réguas dariam a elas peso de subtotal. Sem caixa em
            volta — a tabela mora dentro do container do resumo e uma borda
            própria seria a terceira aninhada. */}
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-6">
          <span className="text-sm font-semibold text-slate-700">Oferta</span>
          <table className="w-full border-collapse text-base" data-zebra>
            <tbody>
              {linhasOferta.map((linha) => (
                <tr key={linha.rotulo} className="odd:bg-slate-50">
                  <th
                    scope="row"
                    className="px-4 py-4 text-left align-baseline font-normal whitespace-nowrap text-slate-700"
                  >
                    {linha.rotulo}
                  </th>
                  <td className="px-4 py-4 text-right align-baseline font-medium tabular-nums text-slate-900">
                    {linha.valor}
                    {linha.nota ? (
                      <span className="mt-1.5 block text-sm leading-6 font-normal text-slate-600">
                        {linha.nota}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm leading-6 text-slate-600">
          Nenhum número desta tela foi medido em campo: são projeções sobre premissas
          declaradas e editáveis. Próximo passo é acordar o baseline dos indicadores
          que você quer mover e o escopo do piloto — a partir dele, esta projeção passa
          a ser medida.
        </p>

        {/* Disclaimer aqui dentro, não como irmão da seção: só o que está sob
            `#resumo-verificavel` sai na impressão, e a folha sem ele violaria
            o invariante 10. Quando este bloco não renderiza (resultado
            incompleto), `calculadora-app` mostra o disclaimer no lugar. */}
        <div className="border-t border-slate-100 pt-6">
          <Disclaimer />
        </div>
        </section>
      </SecaoResultado>
    </>
  );
}
