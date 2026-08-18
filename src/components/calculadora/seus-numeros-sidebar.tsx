"use client";

import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { CAMPO_DEFS, CAMINHO_LABEL } from "@/lib/calculadora/campos";
import { CAMINHOS } from "@/lib/calculadora/constants";
import { PASSOS } from "@/lib/calculadora/estado";
import { CAMPOS_DA_ESTRUTURA } from "@/lib/calculadora/estrutura";
import type {
  CampoId,
  Caminho,
  EntradasTime,
  EstruturaCompartilhada,
} from "@/lib/calculadora/types";
import { cn } from "@/lib/utils";
import { Field } from "@/components/ui/form";
import { SelectMenu } from "@/components/ui/select-menu";
import { CampoNumero } from "./campo-numero";
import { CamposEstruturaSidebar } from "./estrutura-compartilhada";

const CAMINHO_OPTIONS = (Object.keys(CAMINHOS) as Caminho[]).map((id) => ({
  value: id,
  label: CAMINHOS[id].label,
}));

// Sidebar "Dados preenchidos": edição rápida de qualquer campo depois do wizard —
// o resultado recalcula na hora (padrão do protótipo).
//
// Recolhida, muda de forma conforme a coluna: no desktop vira um rail vertical
// clicável por inteiro e devolve os 264px ao resultado (quem alterna o
// `grid-cols` é o pai); no mobile a coluna já fica abaixo do resultado, então
// recolher é sanfona — cabeçalho visível, campos fora.
export function SeusNumerosSidebar({
  nome,
  multiTime,
  entradas,
  onChange,
  onChangeNome,
  onVoltarAoPassoAPasso,
  onRemoverTime,
  onAddTime,
  estrutura,
  onChangeEstrutura,
  aberta,
  onToggle,
}: {
  nome: string;
  multiTime: boolean;
  entradas: EntradasTime;
  onChange: (campo: CampoId, valor: EntradasTime[CampoId]) => void;
  onChangeNome: (nome: string) => void;
  onVoltarAoPassoAPasso: () => void;
  onRemoverTime?: () => void;
  onAddTime?: () => void;
  estrutura?: EstruturaCompartilhada;
  onChangeEstrutura?: (patch: Partial<EstruturaCompartilhada>) => void;
  aberta: boolean;
  onToggle: () => void;
}) {
  // Com a estrutura compartilhada ativa (§4.11), os campos do gestor e da
  // alternativa saem das seções por time e viram um bloco único da conta.
  const compartilhada =
    multiTime && estrutura?.ativa === true && onChangeEstrutura !== undefined;
  const daEstrutura = new Set<string>(compartilhada ? CAMPOS_DA_ESTRUTURA : []);

  return (
    <aside
      className={cn(
        // Superfície recuada de propósito: é apoio, não resposta. Em branco
        // cheio com borda slate-200 ela empatava com o bloco do resultado —
        // e, depois que o hero perdeu o wash, chegava a parecer o elemento
        // principal da tela. Meio-tom sobre o fundo azulado da página deixa o
        // branco como privilégio de quem carrega o número.
        "flex flex-col rounded-sm border border-slate-200/70 bg-white/60",
        aberta && "lg:max-h-[calc(100dvh-8rem)]",
      )}
    >
      {/* Rail do desktop recolhido: o card INTEIRO é o gatilho, não um quadrado
          de 44px com um rótulo inerte ao lado. É irmão do cabeçalho, nunca
          filho: botão dentro de botão é inválido, e os dois nunca aparecem
          juntos (`lg:hidden` contra `hidden lg:flex`).

          Sem rótulo vertical: recolhido, o rail é só a seta de volta. O nome do
          bloco sobrevive no `aria-label` — quem usa leitor de tela continua
          ouvindo "Abrir Dados preenchidos", que é onde o rótulo faz falta de fato. */}
      {!aberta ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={false}
          aria-controls="seus-numeros-campos"
          aria-label="Abrir Dados preenchidos"
          className="hidden w-full cursor-pointer items-center justify-center rounded-sm px-2 py-5 text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 lg:flex"
        >
          <ChevronRightIcon className="h-5 w-5" aria-hidden />
        </button>
      ) : null}

      <div
        className={cn(
          "flex items-center justify-between gap-2 p-6 pb-4",
          !aberta && "lg:hidden",
        )}
      >
        {/* Sem selo de origem nem linha de instrução: o próprio título já diz
            que os dados são do cliente, e "edite qualquer campo" é o que um
            formulário de campos editáveis comunica sozinho. Os dois juntos
            gastavam três linhas de cabeçalho antes do primeiro campo. */}
        <h3 className="text-sm font-semibold whitespace-nowrap text-slate-700">
          Dados preenchidos
        </h3>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={aberta}
          aria-controls="seus-numeros-campos"
          aria-label={aberta ? "Recolher Dados preenchidos" : "Abrir Dados preenchidos"}
          // Bounding box: os 44px de alvo de toque ficam, mas a margem negativa
          // tira 16px do FLUXO, senão o botão manda na altura do cabeçalho e
          // sobra um vão morto abaixo de um título de uma linha só.
          className="-my-2 -mr-2 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        >
          {/* A direção do gesto muda com o layout: no mobile a sanfona abre
              para baixo; no desktop o rail abre para a direita. */}
          <ChevronDownIcon
            className={cn("h-5 w-5 transition-transform lg:hidden", aberta && "rotate-180")}
            aria-hidden
          />
          <ChevronRightIcon
            className={cn("hidden h-5 w-5 transition-transform lg:block", aberta && "rotate-180")}
            aria-hidden
          />
        </button>
      </div>

      {/* Só os campos rolam: o card mantém a borda inteira, sem corte seco.
          Recolhida, a coluna vira `display:none` — o elemento continua no DOM
          para o `aria-controls` do gatilho apontar para algo, e `display:none`
          já tira os campos da ordem de foco. Uma única utilitária de display
          por vez, nunca `flex` e `hidden` juntas. */}
      <div
        id="seus-numeros-campos"
        className={cn(
          "scrollbar-thin min-h-0 flex-col gap-6 overflow-y-auto px-6 pb-6",
          aberta ? "flex" : "hidden",
        )}
      >
        {multiTime ? (
          <Field label="Nome do time" htmlFor="sb-nome-time">
            <input
              id="sb-nome-time"
              value={nome}
              onChange={(event) => onChangeNome(event.target.value)}
              className="h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#2E63CD]/40 sm:h-10"
            />
          </Field>
        ) : null}

        {compartilhada ? (
          <CamposEstruturaSidebar estrutura={estrutura} onChange={onChangeEstrutura} />
        ) : null}

        {PASSOS.map((passo) => {
          const campos = passo.campos.filter((campo) => !daEstrutura.has(campo));
          if (campos.length === 0) return null;
          return (
          <section key={passo.id} className="flex flex-col gap-3 border-t border-slate-100 pt-4">
            {/* Passo sem título não deixa cabeçalho vazio no fluxo: o fio de
                cima já separa os grupos. */}
            {passo.titulo ? (
              <h4 className="text-xs font-semibold text-slate-500">{passo.titulo}</h4>
            ) : null}
            {campos.map((campo) => {
              if (campo === "caminho") {
                return (
                  <Field key={campo} label={CAMINHO_LABEL} htmlFor="sb-caminho">
                    <SelectMenu
                      id="sb-caminho"
                      size="sm"
                      options={CAMINHO_OPTIONS}
                      value={entradas.caminho ?? ""}
                      onChange={(valor) =>
                        onChange("caminho", valor === "" ? null : (valor as Caminho))
                      }
                    />
                  </Field>
                );
              }
              // Custos condicionais só aparecem quando o caminho os usa.
              if (campo === "custoExternoAno" && entradas.caminho !== "externo") return null;
              if (campo === "custoEventoAno" && entradas.caminho !== "evento") return null;
              const def = CAMPO_DEFS[campo as Exclude<CampoId, "caminho">];
              return (
                <Field
                  key={campo}
                  label={def.label}
                  hint={def.help}
                  htmlFor={`sb-${campo}`}
                >
                  <CampoNumero
                    id={`sb-${campo}`}
                    valor={entradas[campo] as number | null}
                    formato={def.formato}
                    inteiro={def.inteiro}
                    placeholder={def.placeholder}
                    onChange={(valor) => onChange(campo, valor)}
                  />
                </Field>
              );
            })}
          </section>
          );
        })}

      </div>

      <div
        className={cn(
          "flex-col gap-2 border-t border-slate-100 p-6",
          aberta ? "flex" : "hidden",
        )}
      >
        <button
          type="button"
          onClick={onVoltarAoPassoAPasso}
          className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-[#f8fafc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        >
          <ArrowLeftIcon className="h-4 w-4" aria-hidden />
          Voltar ao início
        </button>
        {/* Sem balão de ajuda aqui: quem chegou ao resultado já passou pelo
            wizard, onde o contexto de "por que mais de um time" é dado. */}
        {onAddTime ? (
          <button
            type="button"
            onClick={onAddTime}
            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-slate-300 bg-white px-4 text-sm font-medium text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          >
            <PlusIcon className="h-4 w-4" aria-hidden />
            Adicionar time
          </button>
        ) : null}
        {onRemoverTime ? (
          <button
            type="button"
            onClick={onRemoverTime}
            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          >
            <TrashIcon className="h-4 w-4" aria-hidden />
            Remover time
          </button>
        ) : null}
      </div>
    </aside>
  );
}
