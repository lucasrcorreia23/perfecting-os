"use client";

import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { ButtonLink } from "@/components/ui/button";
import { TOOLTIP } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// O acesso à referência de fórmulas em PDF, na barra do topo.
//
// Vivia no FIM do relatório (`fecho-relatorio`), atrás de uma rolagem de
// milhares de pixels: quem duvidava de um número no meio da leitura não tinha
// como saber que o documento existia. Subiu para a barra fixa em 20/08/2026, a
// pedido do decisor, e por isso saiu de lá — duas afordâncias para o mesmo
// destino é o que a jornada já desfez quando a pílula da régua de etapas foi
// removida.
//
// A TRAVA É DUPLA, e continua sendo. O botão fica VISÍVEL e bloqueado enquanto
// nenhum time fechou a conta (escondido, ninguém descobre que a referência
// existe; bloqueado, o balão diz o que falta), e a ROTA repete a condição —
// botão desabilitado é afordância, não controle de acesso, e quem monta a URL
// na mão passaria por cima dele. Bloqueado vira `<button aria-disabled>` (o
// `ButtonLink` cuida disso): sem href não há endereço a copiar, e o
// `aria-disabled` mantém o controle focável, que é o que permite descobrir
// pelo teclado por que ele não responde.

// O que falta para a referência abrir. Nomeia a CONDIÇÃO, não o bloqueio:
// "indisponível" informaria o obstáculo sem dizer a saída.
export const MOTIVO_FORMULAS =
  "Disponível quando o resultado aparecer: preencha os campos obrigatórios de um time.";

export function BotaoFormulas({
  token,
  liberado,
}: {
  token: string;
  liberado: boolean;
}) {
  return (
    <span className="group relative inline-flex">
      <ButtonLink
        // Servido pela rota que valida o MESMO token do link: expira e é
        // revogado junto com ele, em vez de ficar aberto em `public/`.
        href={`/api/publico/calculadora/${token}/formulas`}
        target="_blank"
        rel="noopener"
        variant="secondary"
        size="sm"
        icon={DocumentTextIcon}
        disabled={!liberado}
        title={
          liberado
            ? "Guia de fórmulas: o motor explicado célula a célula, na mesma ordem desta página."
            : MOTIVO_FORMULAS
        }
        // O rótulo some no mobile, então o nome acessível vem daqui em vez de
        // sair do texto visível — senão o botão mudaria de nome conforme a
        // largura da tela.
        aria-label={
          liberado ? "Fórmulas (PDF)" : `Fórmulas (PDF). ${MOTIVO_FORMULAS}`
        }
      >
        {/* Abaixo do `sm:` fica só o ícone, como as outras duas consultas da
            barra: os três rótulos somavam 374px contra os 341px úteis de uma
            tela de 390px, e o cabeçalho fixo levava a página inteira para uma
            rolagem horizontal. O rótulo curto "Fórmulas" ainda media 122px. */}
        <span className="hidden sm:inline">Fórmulas (PDF)</span>
      </ButtonLink>
      {!liberado ? (
        // Ancorado à DIREITA: o botão mora no canto direito da barra, e um
        // balão de 240px preso à esquerda sairia da tela.
        // `group-focus-within` além do hover: o controle segue focável de
        // propósito, e sem isso quem chega por teclado encontra um botão mudo
        // sem saber por quê.
        <span
          className={cn(
            TOOLTIP,
            "left-auto right-0",
            "group-focus-within:visible group-focus-within:opacity-100",
          )}
        >
          {MOTIVO_FORMULAS}
        </span>
      ) : null}
    </span>
  );
}
