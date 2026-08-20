"use client";

import { useEffect, useRef } from "react";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import type { PerguntaCfo } from "@/lib/calculadora/faq";
import type { ModeloCalculadora } from "@/lib/calculadora/modelo";
import { ButtonLink } from "@/components/ui/button";
import { TOOLTIP } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AutosaveStatus } from "./use-autosave";
import { Disclaimer } from "./disclaimer";
import { EnviarBar } from "./enviar-bar";
import { FaqLista } from "./faq-cfo";
import { ResumoVerificavel } from "./resumo-verificavel";
import { SecaoResultado } from "./secao-resultado";

// Etapa 04 — o que sai da tela.
//
// Três coisas, nesta ordem, que é a ordem de uma reunião: o resumo que vai
// impresso, o envio para o time Perfecting, e as perguntas que a pessoa vai
// levar da mesa.
//
// Eram quatro até 20/08/2026: o "Vamos criar um case de sucesso juntos" vinha
// entre o resumo e a referência de fórmulas, e mudou para o fim do RELATÓRIO.
// Ele é o único bloco que olha para frente, e pertence à leitura da conta — não
// ao pacote que sai da tela. Aqui ele ficava depois do resumo imprimível, num
// lugar onde a decisão já tinha sido tomada.
//
// O `ResumoVerificavel` continua sendo o ÚNICO bloco que a impressão enxerga
// (`#resumo-verificavel` no CSS de print), e é por isso que ele traz o próprio
// `Disclaimer` dentro — folha sem ressalva violaria o invariante 10.

// O que falta para a referência abrir. Nomeia a CONDIÇÃO, não o bloqueio:
// "indisponível" informaria o obstáculo sem dizer a saída.
const MOTIVO_FORMULAS =
  "Disponível quando o resultado aparecer: preencha os campos obrigatórios de um time.";

export function EtapaExportar({
  modelo,
  dataCalculo,
  token,
  formulasLiberadas,
  imprimirAoAbrir = false,
  perguntas,
  autosaveStatus,
  salvoEm,
  submittedAt,
  completo,
  onEnviar,
}: {
  modelo: ModeloCalculadora;
  dataCalculo: string;
  token: string;
  formulasLiberadas: boolean;
  /** Chegou pelo "Exportar / salvar PDF" da capa — abre o diálogo sozinha. */
  imprimirAoAbrir?: boolean;
  perguntas: PerguntaCfo[];
  autosaveStatus: AutosaveStatus;
  salvoEm: string | null;
  submittedAt: string | null;
  completo: boolean;
  onEnviar: () => Promise<boolean>;
}) {
  // Quem chega pelo "Exportar / salvar PDF" da capa não pediu para MUDAR de
  // etapa, pediu o PDF: a etapa monta e o diálogo abre. Uma vez só por
  // chegada (`jaImprimiu`), senão qualquer re-render reabriria o diálogo em
  // cima de quem já o fechou. O rAF duplo espera o layout: `window.print()`
  // congela a página no estado do frame em que é chamado, e sem ele a folha
  // pode sair antes de o Resumo ter altura.
  const jaImprimiu = useRef(false);
  useEffect(() => {
    if (!imprimirAoAbrir || jaImprimiu.current) return;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        // A guarda fecha AQUI, no disparo, e não lá em cima no agendamento.
        // Marcar o ref ao agendar parece equivalente e não é: em StrictMode o
        // React monta, desmonta e remonta: o cleanup cancela o frame do
        // primeiro mount, mas o ref sobrevive ao ciclo, e o segundo mount saía
        // pela guarda sem nunca imprimir. Com a guarda no disparo, o segundo
        // mount reagenda e imprime — e uma segunda chamada continua barrada.
        if (jaImprimiu.current) return;
        jaImprimiu.current = true;
        window.print();
      }),
    );
    return () => cancelAnimationFrame(id);
  }, [imprimirAoAbrir]);

  return (
    <div className="fade-in-up mx-auto flex w-full max-w-4xl flex-col gap-3">
      <ResumoVerificavel
        preco={modelo.preco}
        prazoMeses={modelo.prazoMeses}
        times={modelo.times}
        consolidado={modelo.consolidado}
        dataCalculo={dataCalculo}
      />

      {/* Só quando o Resumo não renderiza: ele traz o próprio disclaimer. */}
      {modelo.consolidado.status !== "ok" ? (
        <div className="px-6 pt-2">
          <Disclaimer />
        </div>
      ) : null}

      <SecaoResultado
        titulo="Conferir a conta fora da tela"
        descricao="A referência de fórmulas descreve o motor célula a célula, na mesma ordem desta página."
      >
        {/* Fica VISÍVEL e bloqueado enquanto não há resultado, em vez de sumir:
            escondido, ninguém descobre que a referência existe; assim a pessoa
            vê que ela está ali e o balão diz o que falta para abrir. A ROTA
            repete a mesma trava — botão desabilitado é afordância, não controle
            de acesso, e quem monta a URL na mão passaria por cima dele.

            `<a>` e não botão quando liberado: quem audita quer abrir noutra aba
            e guardar o endereço. Servido pela rota que valida o MESMO token do
            link, então expira e é revogado junto com ele. */}
        <span className="group relative inline-flex self-start">
          <ButtonLink
            href={`/api/publico/calculadora/${token}/formulas`}
            target="_blank"
            rel="noopener"
            variant="secondary"
            icon={DocumentTextIcon}
            disabled={!formulasLiberadas}
            aria-label={
              formulasLiberadas ? undefined : `Fórmulas (PDF). ${MOTIVO_FORMULAS}`
            }
          >
            Fórmulas (PDF)
          </ButtonLink>
          {!formulasLiberadas ? (
            // `group-focus-within` além do hover: o controle segue focável de
            // propósito, e sem isso quem chega por teclado encontra um botão
            // mudo sem saber por quê.
            <span
              className={cn(
                TOOLTIP,
                "group-focus-within:visible group-focus-within:opacity-100",
              )}
            >
              {MOTIVO_FORMULAS}
            </span>
          ) : null}
        </span>
      </SecaoResultado>

      <EnviarBar
        autosaveStatus={autosaveStatus}
        salvoEm={salvoEm}
        submittedAt={submittedAt}
        completo={completo}
        onEnviar={onEnviar}
      />

      <SecaoResultado
        id="perguntas-comuns"
        titulo="Perguntas comuns"
        descricao="As dúvidas que costumam aparecer quando este número chega à mesa."
      >
        <FaqLista perguntas={perguntas} />
      </SecaoResultado>
    </div>
  );
}
