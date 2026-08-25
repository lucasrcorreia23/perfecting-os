"use client";

import { useState } from "react";
import { PALETA, withAlpha } from "@/lib/constants";
import { formatarProporcao, formatarRecorrencia } from "@/lib/desafios";
import {
  cruzamentosNaoVazios,
  type CelulaMatriz,
  type MatrizCategoriaFluxo as Matriz,
} from "@/lib/desafios-dashboard";
import { cn } from "@/lib/utils";

/*
 * A matriz categoria × fluxo — a pergunta central do módulo: que TIPO de
 * problema mora em que ÁREA do produto.
 *
 * É <table> de verdade e não grade de <div>: `th scope` dá semântica e
 * navegação de leitor de tela de graça, e tabulação cruzada é exatamente o que
 * o elemento existe para descrever. O DataTable de ui/ não serve — ele é
 * Column<T>[] sobre lista plana, com um cabeçalho só.
 *
 * Zero SVG: os rótulos e os valores são texto real, e a tinta é só reforço
 * (§8.13 — SVG é para quando o gráfico É a leitura).
 */

// Quantizado, não rampa contínua: o teto em .24 mantém o texto slate legível.
const ALPHA_NIVEL = [0, 0.08, 0.16, 0.24] as const;

type Modo = "contagem" | "recorrencia";

export function MatrizCategoriaFluxo({ matriz }: { matriz: Matriz }) {
  /*
   * Contagem é o padrão, e não é arbitrário: a contagem SEMPRE existe, enquanto
   * a recorrência é "sem dados" para todo desafio que ninguém mediu. Um heatmap
   * dirigido por recorrência nasceria cheio de buracos, e buraco aleatório é
   * ilegível. A recorrência continua sendo o segundo número de cada célula.
   */
  const [modo, setModo] = useState<Modo>("contagem");
  const esparso = cruzamentosNaoVazios(matriz);

  if (matriz.linhas.length === 0 || matriz.colunas.length === 0) {
    return (
      <section className="flex flex-col gap-2 rounded-sm border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">Categoria × fluxo</h2>
        <p className="text-sm text-slate-500">
          O cruzamento aparece quando houver ao menos uma categoria e um fluxo com
          desafios classificados.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-slate-700">Categoria × fluxo</h2>
          <p className="max-w-lg text-xs text-slate-500">
            Que tipo de problema mora em que área do produto. A tinta segue a
            contagem; a recorrência é o segundo número de cada célula.
          </p>
        </div>
        <ModoSwitch modo={modo} onChange={setModo} />
      </div>

      {/* Desktop: quem rola é o container, nunca a página (§8.13). */}
      <div className="scrollbar-thin hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] border-collapse">
          <caption className="sr-only">
            Cruzamento entre categoria de desafio (linhas) e fluxo do produto
            (colunas). Cada célula traz a contagem de desafios e a proporção de
            tentativas que falharam.
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 bg-white px-4 py-2.5 text-left text-xs font-semibold text-slate-600"
              >
                Categoria
              </th>
              {matriz.colunas.map((coluna) => (
                <th
                  key={coluna.id ?? "sem-fluxo"}
                  scope="col"
                  className="px-2 py-2.5 text-center text-xs font-semibold text-slate-600"
                >
                  {coluna.nome}
                </th>
              ))}
              <th
                scope="col"
                className="px-2 py-2.5 text-center text-xs font-semibold text-slate-600"
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {matriz.linhas.map((linha, i) => (
              <tr key={linha.id ?? "sem-categoria"}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-white px-4 py-2 text-left text-sm font-medium text-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: linha.cor }}
                    />
                    {linha.nome}
                  </span>
                </th>
                {matriz.colunas.map((coluna, j) => (
                  <td key={coluna.id ?? "sem-fluxo"} className="px-1 py-1 align-middle">
                    <Celula
                      celula={matriz.celulas[i][j]}
                      cor={linha.cor}
                      modo={modo}
                      rotulo={`${linha.nome} em ${coluna.nome}`}
                    />
                  </td>
                ))}
                <td className="px-1 py-1 align-middle">
                  <Celula
                    celula={matriz.totaisPorLinha[i]}
                    cor={linha.cor}
                    modo={modo}
                    rotulo={`${linha.nome}, todos os fluxos`}
                    total
                  />
                </td>
              </tr>
            ))}
            <tr>
              <th
                scope="row"
                className="sticky left-0 z-10 border-t border-slate-200 bg-white px-4 py-2 text-left text-sm font-medium text-slate-800"
              >
                Total
              </th>
              {matriz.colunas.map((coluna, j) => (
                <td
                  key={coluna.id ?? "sem-fluxo"}
                  className="border-t border-slate-200 px-1 py-1 align-middle"
                >
                  <Celula
                    celula={matriz.totaisPorColuna[j]}
                    cor={PALETA.grafite}
                    modo={modo}
                    rotulo={`${coluna.nome}, todas as categorias`}
                    total
                  />
                </td>
              ))}
              <td className="border-t border-slate-200 px-1 py-1 align-middle">
                <Celula
                  celula={matriz.total}
                  cor={PALETA.grafite}
                  modo={modo}
                  rotulo="Todos os desafios"
                  total
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile: a MESMA conta, na forma esparsa. */}
      <ul className="flex flex-col gap-3 md:hidden">
        {esparso.map(({ categoria, fluxo, celula }) => (
          <li
            key={`${categoria.id ?? "sem"}-${fluxo.id ?? "sem"}`}
            className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: categoria.cor }}
                />
                {categoria.nome}
              </span>
              <span className="text-xs text-slate-500">{fluxo.nome}</span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-sm font-semibold tabular-nums text-slate-800">
                {celula.total}
              </span>
              <span className="text-xs tabular-nums text-slate-500">
                {formatarRecorrencia(celula.recorrencia)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <Legenda faixas={matriz.faixas} modo={modo} />
    </section>
  );
}

function Celula({
  celula,
  cor,
  modo,
  rotulo,
  total = false,
}: {
  celula: CelulaMatriz;
  cor: string;
  modo: Modo;
  rotulo: string;
  total?: boolean;
}) {
  const vazia = celula.total === 0;
  const principal =
    modo === "contagem"
      ? vazia
        ? "—"
        : String(celula.total)
      : formatarRecorrencia(celula.recorrencia);
  const secundario =
    modo === "contagem"
      ? formatarRecorrencia(celula.recorrencia)
      : vazia
        ? ""
        : `${celula.total} reg.`;

  return (
    <span
      // A leitura por extenso é o terceiro sinal, depois do número impresso e
      // da tinta (§12: cor nunca sozinha).
      aria-label={`${rotulo}: ${celula.total} desafio(s), ${
        celula.recorrencia.status === "medido"
          ? `${formatarProporcao(celula.recorrencia)} tentativas falharam`
          : "sem medição de recorrência"
      }`}
      className={cn(
        "mx-auto flex min-h-[44px] min-w-[64px] flex-col items-center justify-center gap-1 rounded-sm px-2 py-1",
        total && "font-semibold",
      )}
      style={{
        backgroundColor: withAlpha(cor, ALPHA_NIVEL[celula.nivel]),
        border: `1px solid ${withAlpha(cor, vazia ? 0.12 : 0.35)}`,
      }}
    >
      <span
        className={cn(
          "text-sm tabular-nums",
          vazia ? "text-slate-400" : "font-semibold text-slate-800",
        )}
      >
        {principal}
      </span>
      {secundario ? (
        <span className="text-[11px] leading-4 tabular-nums text-slate-500">
          {secundario}
        </span>
      ) : null}
    </span>
  );
}

function ModoSwitch({
  modo,
  onChange,
}: {
  modo: Modo;
  onChange: (modo: Modo) => void;
}) {
  const opcoes: { valor: Modo; label: string }[] = [
    { valor: "contagem", label: "Contagem" },
    { valor: "recorrencia", label: "Recorrência" },
  ];

  return (
    <div
      className="flex gap-1 rounded-full border border-slate-200 bg-white p-1"
      role="group"
      aria-label="O que a célula destaca"
    >
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          aria-pressed={modo === opcao.valor}
          onClick={() => onChange(opcao.valor)}
          className={cn(
            "min-h-[44px] rounded-full px-4 text-sm font-medium transition-colors sm:min-h-[36px]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            modo === opcao.valor
              ? "bg-primary text-white"
              : "text-slate-600 hover:text-slate-800",
          )}
        >
          {opcao.label}
        </button>
      ))}
    </div>
  );
}

function Legenda({
  faixas,
  modo,
}: {
  faixas: [number, number, number];
  modo: Modo;
}) {
  const [limite1, limite2, max] = faixas;

  // Só as bandas alcançáveis: com poucos desafios, "9–11" não existe ainda.
  const bandas = [
    { nivel: 1, label: `1–${limite1}`, min: 1 },
    { nivel: 2, label: `${limite1 + 1}–${limite2}`, min: limite1 + 1 },
    { nivel: 3, label: `${limite2 + 1}+`, min: limite2 + 1 },
  ].filter((banda) => banda.min <= max);

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
      <span>
        Tinta = número de desafios
        {modo === "recorrencia" ? " (mesmo em modo recorrência)" : ""}:
      </span>
      <span className="flex flex-wrap items-center gap-3">
        {bandas.map((banda) => (
          <span key={banda.nivel} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-3 w-6 rounded-sm border border-slate-300"
              style={{ backgroundColor: withAlpha(PALETA.grafite, ALPHA_NIVEL[banda.nivel]) }}
            />
            <span className="tabular-nums">{banda.label}</span>
          </span>
        ))}
      </span>
    </div>
  );
}
