"use client";

import type { ModeloCalculadora } from "@/lib/calculadora/modelo";
import type { AutosaveStatus } from "./use-autosave";
import { Disclaimer } from "./disclaimer";
import { EnviarBar } from "./enviar-bar";
import { ResumoVerificavel } from "./resumo-verificavel";

// O fecho do relatório — o que sai da tela.
//
// Era a ETAPA 04 ("Exportar & FAQ") até 21/08/2026, quando a régua passou a ter
// três etapas e ela deixou de ser alcançável. Duas coisas dela não podiam sumir
// junto e desceram para o fim da etapa 03: o `ResumoVerificavel`, único bloco
// que a impressão enxerga (`#resumo-verificavel` no CSS de print), e a
// `EnviarBar`, que é o envio da proposta e o evento `enviado` — sem ela a
// jornada pública não teria mais fim.
//
// O FAQ inline NÃO veio: ele já existe no modal do cabeçalho, alcançável de
// qualquer etapa, e era a única parte da 04 que a régua duplicava.
//
// O botão "Fórmulas (PDF)" saiu daqui em 20/08/2026, pela mesma razão e no
// sentido inverso: subiu para a barra fixa do topo (`botao-formulas.tsx`),
// onde alcança quem duvida de um número NO MEIO da leitura — no fim do
// relatório, ele estava a milhares de pixels da dúvida que responde. Mantê-lo
// nos dois lugares seria duas afordâncias para o mesmo destino, que é o que a
// jornada já desfez ao remover a pílula da régua de etapas.
//
// Some com o efeito de imprimir-ao-chegar. Ele existia porque a impressão vinha
// de OUTRA tela e precisava esperar o Resumo montar; agora o Resumo já está na
// mesma página do botão, e "Exportar / salvar PDF" chama `window.print()`
// direto.
//
// O RESUMO SAIU DA TELA E CONTINUA SENDO A FOLHA (21/08/2026, decisão do
// decisor). Na tela ele era a terceira vez que os mesmos três números
// apareciam: a capa já abre com ROI, payback e valor/ano, os capítulos
// mostram de onde eles vêm, e o Resumo os recitava mais uma vez ao fim de uma
// rolagem de 6.000px, com um "Imprimir" gêmeo do botão do topo. Fora da tela
// ele não é repetição nenhuma — é o único artefato lido SEM o hero acima, e é
// dentro dele que moram o CSS que recorta a folha (`#resumo-verificavel`) e a
// prosa que substitui a página inteira no papel.
//
// Por isso `hidden print:block` e não `return null`: desmontar levaria junto a
// folha e faria o botão do topo imprimir a tela crua — régua de etapas,
// cabeçalho e botões. É a única exceção ao "`display:none` não sai na
// impressão" que o `BlocoRecolhivel` respeita, e ela é exceção justamente
// porque o `print:block` reacende o bloco na mídia de impressão.
//
// Consequência direta: o `Disclaimer` subiu para cá. Ele morava DENTRO do
// Resumo para que a folha nunca saísse sem ressalva (invariante 10); com o
// bloco invisível na tela, ficar só lá dentro deixaria a TELA sem ressalva,
// que é a outra metade do mesmo invariante. Agora são dois, um em cada mídia:
// o de dentro imprime, o daqui é o da tela — e nunca coexistem, porque tudo
// que está fora de `#resumo-verificavel` sai invisível no papel.

export function FechoRelatorio({
  modelo,
  dataCalculo,
  autosaveStatus,
  salvoEm,
  submittedAt,
  completo,
  onEnviar,
}: {
  modelo: ModeloCalculadora;
  dataCalculo: string;
  autosaveStatus: AutosaveStatus;
  salvoEm: string | null;
  submittedAt: string | null;
  completo: boolean;
  onEnviar: () => Promise<boolean>;
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      {/* Invisível na tela, inteiro no papel — ver o cabeçalho do arquivo. */}
      <div className="hidden print:block">
        <ResumoVerificavel
          preco={modelo.preco}
          prazoMeses={modelo.prazoMeses}
          times={modelo.times}
          consolidado={modelo.consolidado}
          dataCalculo={dataCalculo}
        />
      </div>

      <EnviarBar
        autosaveStatus={autosaveStatus}
        salvoEm={salvoEm}
        submittedAt={submittedAt}
        completo={completo}
        onEnviar={onEnviar}
      />

      {/* A ressalva da tela, sempre — o gêmeo dela vive dentro do Resumo e só
          existe no papel. Antes era condicional ("só quando o Resumo não
          renderiza") em DOIS lugares, aqui e em `calculadora-app`, e a conta
          incompleta imprimia dois disclaimers empilhados. */}
      <div className="px-6 pt-2">
        <Disclaimer />
      </div>
    </div>
  );
}
