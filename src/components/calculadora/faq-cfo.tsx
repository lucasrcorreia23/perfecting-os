"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  faqNota,
  GRUPOS,
  type GrupoPergunta,
  type PerguntaCfo,
} from "@/lib/calculadora/faq";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { usePremissas } from "./premissas-context";

// As perguntas comuns sobre o número.
//
// Quem preenche quase nunca é quem assina: é quem vai defender o número na
// mesa. Então a peça é munição para a defesa dela — não um roteiro de contorno
// de objeção, e por isso nem se chama assim. Rótulo que nomeia a técnica
// ("objeções", "o que o CFO vai perguntar") entrega o jogo e ainda presume o
// cargo de quem lê.
//
// A MESMA lista aparece em dois lugares, e os dois têm o mesmo formato de
// leitura: no modal do cabeçalho (alcançável de qualquer etapa, inclusive do
// quiz, onde a dúvida costuma chegar antes do resultado) e na etapa 04, onde
// ela é o destino e não a interrupção. O que nunca deu certo foi jogá-la solta
// no meio do relatório: doze perguntas empilhadas ali viravam uma faixa sem
// ritmo — texto curto à esquerda, metade da largura vazia à direita, e nenhum
// bloco puxando o olho para o próximo. Agrupada em três frentes porque, numa
// lista plana de doze, achar a própria dúvida custa ler as outras onze.

const ORDEM: GrupoPergunta[] = ["numero", "decisao", "programa"];

// Mesmo conteúdo, alcançável de qualquer etapa pelo cabeçalho — inclusive do
// wizard, onde a dúvida costuma aparecer antes de existir resultado.
//
// MODAL, não gaveta como o Glossário: os dois são consulta, mas de naturezas
// opostas. O glossário é olhada de um segundo ("o que é haircut?") e por isso
// não pode tirar o formulário da tela. Aqui quem lê é quem vai bancar o número
// na reunião — a leitura é longa, densa e precisa de atenção inteira. Overlay
// e trava de scroll fazem o trabalho de fazer a pessoa parar; a gaveta, que
// deixa a página viva ao lado, convidava a passar o olho e voltar a mexer.
export function FaqLista({ perguntas }: { perguntas: PerguntaCfo[] }) {
  const nota = faqNota(usePremissas());
  const [abertas, setAbertas] = useState<Set<string>>(() => new Set());

  function alternar(id: string) {
    setAbertas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  return (
    <div className="flex flex-col gap-8">
        {ORDEM.map((grupo) => {
          const doGrupo = perguntas.filter((item) => item.grupo === grupo);
          if (doGrupo.length === 0) return null;
          return (
            <section key={grupo} className="flex flex-col gap-1">
              {/* Cabeçalho de grupo em caixa própria, com fio: são três
                  assuntos distintos, e sem a régua as doze perguntas voltavam a
                  ler como uma lista só. */}
              <h3 className="pf-panel-title text-(--pf-ink-soft)">
                {GRUPOS[grupo].titulo}
              </h3>
              <p className="mb-2 text-sm text-(--pf-ink-faint)">
                {GRUPOS[grupo].descricao}
              </p>

              <div className="flex flex-col divide-y divide-(--pf-line-soft) border-t border-(--pf-line-soft)">
                {doGrupo.map((item) => {
                  const aberta = abertas.has(item.id);
                  return (
                    <div key={item.id} className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => alternar(item.id)}
                        aria-expanded={aberta}
                        aria-controls={`faq-modal-${item.id}`}
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pf-brand)/35",
                        )}
                      >
                        <span
                          className={cn(
                            "text-base font-medium leading-7 transition-colors",
                            aberta ? "text-(--pf-brand)" : "text-(--pf-ink)",
                          )}
                        >
                          {item.pergunta}
                        </span>
                        <ChevronDownIcon
                          className={cn(
                            "h-5 w-5 shrink-0 text-(--pf-ink-faint) transition-transform",
                            aberta && "rotate-180",
                          )}
                          aria-hidden
                        />
                      </button>
                      {aberta ? (
                        <div
                          id={`faq-modal-${item.id}`}
                          className="flex flex-col gap-3 pb-5"
                        >
                          {item.paragrafos.map((paragrafo, index) => (
                            <p
                              key={index}
                              className="pf-lead text-(--pf-ink-soft)"
                            >
                              {paragrafo}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      <p className="text-sm leading-6 text-(--pf-ink-faint)">{nota}</p>
    </div>
  );
}

// MODAL, não gaveta como o Glossário: os dois são consulta, mas de naturezas
// opostas. O glossário é olhada de um segundo ("o que é haircut?") e por isso
// não pode tirar o formulário da tela. Aqui quem lê é quem vai bancar o número
// na reunião — a leitura é longa, densa e precisa de atenção inteira. Overlay
// e trava de scroll fazem o trabalho de fazer a pessoa parar; a gaveta, que
// deixa a página viva ao lado, convidava a passar o olho e voltar a mexer.
export function FaqPainel({
  open,
  onClose,
  perguntas,
}: {
  open: boolean;
  onClose: () => void;
  perguntas: PerguntaCfo[];
}) {
  return (
    <Modal open={open} onClose={onClose} title="Perguntas comuns" width="max-w-2xl">
      {/* `-mx-*` compensa o padding do modal: a rolagem encosta na borda e a
          sombra de corte não aparece no meio do texto. */}
      <div className="scrollbar-thin -mx-1 max-h-[65dvh] overflow-y-auto px-1">
        <FaqLista perguntas={perguntas} />
      </div>
    </Modal>
  );
}
