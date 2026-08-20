"use client";

import { DocumentTextIcon } from "@heroicons/react/24/outline";
import type { MetasCase } from "@/lib/calculadora/business-case";
import type { PerguntaCfo } from "@/lib/calculadora/faq";
import type { ModeloCalculadora } from "@/lib/calculadora/modelo";
import { ButtonLink } from "@/components/ui/button";
import { TOOLTIP } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AutosaveStatus } from "./use-autosave";
import { CaseSucesso } from "./case-sucesso";
import { Disclaimer } from "./disclaimer";
import { EnviarBar } from "./enviar-bar";
import { FaqLista } from "./faq-cfo";
import { ResumoVerificavel } from "./resumo-verificavel";
import { SecaoResultado } from "./secao-resultado";

// Etapa 04 — o que sai da tela.
//
// Quatro coisas, nesta ordem, que é a ordem de uma reunião: o resumo que vai
// impresso, o compromisso de 90 dias que vem depois dele, o envio para o time
// Perfecting, e as perguntas que a pessoa vai levar da mesa.
//
// O `ResumoVerificavel` continua sendo o ÚNICO bloco que a impressão enxerga
// (`#resumo-verificavel` no CSS de print), e é por isso que ele traz o próprio
// `Disclaimer` dentro — folha sem ressalva violaria o invariante 10. O bloco do
// case NÃO imprime, de propósito: ele é um acordo a combinar no kickoff, e uma
// folha que já o trouxesse impresso o apresentaria como fechado.

// O que falta para a referência abrir. Nomeia a CONDIÇÃO, não o bloqueio:
// "indisponível" informaria o obstáculo sem dizer a saída.
const MOTIVO_FORMULAS =
  "Disponível quando o resultado aparecer: preencha os campos obrigatórios de um time.";

export function EtapaExportar({
  modelo,
  dataCalculo,
  token,
  formulasLiberadas,
  metas,
  cenarioLabel,
  nomeTime,
  multiTime,
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
  metas: MetasCase | null;
  cenarioLabel: string;
  nomeTime: string;
  multiTime: boolean;
  perguntas: PerguntaCfo[];
  autosaveStatus: AutosaveStatus;
  salvoEm: string | null;
  submittedAt: string | null;
  completo: boolean;
  onEnviar: () => Promise<boolean>;
}) {
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

      {metas ? (
        <CaseSucesso
          metas={metas}
          cenarioLabel={cenarioLabel}
          nomeTime={nomeTime}
          multiTime={multiTime}
        />
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
