import Link from "next/link";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { TESTE_FLUXOS, TESTE_PERFIS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { codigoSessao } from "@/lib/usabilidade/sessao";

/*
 * O outro sentido do vínculo achado ↔ desafio, e ele é DERIVADO: nenhuma coluna
 * nova em `desafios`, nenhum contador. A única aresta escrevível é
 * `teste_achados.desafio_id`; uma coluna aqui seria a segunda fonte da verdade.
 *
 * E este card NÃO é uma medição de recorrência. "3 sessões de teste" fica fora
 * do placar e fora do log de ocorrências de propósito: a recorrência do módulo
 * Desafios tem duas fontes que nunca se somam, e um teste de usabilidade não
 * pode virar uma terceira. Aqui é procedência — de onde este desafio veio.
 */

export type OrigemTeste = {
  achadoId: string;
  sessaoId: string;
  sessaoCodigo: number;
  perfil: keyof typeof TESTE_PERFIS;
  fluxo: keyof typeof TESTE_FLUXOS;
  realizadoEm: string;
  resumo: string;
  trecho: string | null;
};

export function OrigemTestesCard({ origens }: { origens: OrigemTeste[] }) {
  if (origens.length === 0) return null;

  // Sessões DISTINTAS, não achados: dois achados da mesma sessão sobre o mesmo
  // problema são um problema, não dois.
  const sessoes = new Set(origens.map((origem) => origem.sessaoId)).size;

  return (
    <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <ClipboardDocumentListIcon aria-hidden className="h-4 w-4" />
          Origem em testes de usabilidade
        </h2>
        <p className="text-xs text-slate-500">
          {sessoes === 1
            ? "1 sessão de teste registrou este problema."
            : `${sessoes} sessões de teste registraram este problema.`}{" "}
          Não entra na recorrência.
        </p>
      </div>

      <ul className="flex flex-col">
        {origens.map((origem) => (
          <li
            key={origem.achadoId}
            className="flex flex-col gap-2 border-b border-slate-100 py-3 first:pt-0 last:border-b-0 last:pb-0"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/desafios/usabilidade/${origem.sessaoId}`}
                className="rounded-full font-mono text-xs font-medium text-primary hover:text-[#1E4A9E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              >
                {codigoSessao(origem.sessaoCodigo)}
              </Link>
              <span className="text-xs text-slate-500">
                {TESTE_PERFIS[origem.perfil].label} · {TESTE_FLUXOS[origem.fluxo].label}{" "}
                · {formatDate(origem.realizadoEm)}
              </span>
            </div>
            <p className="text-sm text-slate-800">{origem.resumo}</p>
            {origem.trecho ? (
              <blockquote className="border-l-2 border-slate-200 pl-3 text-sm whitespace-pre-wrap break-words text-slate-600">
                {origem.trecho}
              </blockquote>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
