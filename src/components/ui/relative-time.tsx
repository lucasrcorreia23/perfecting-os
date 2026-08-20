"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { formatDate, formatRelativeTime } from "@/lib/format";

// "há 7 min" no HTML do servidor contra "há 8 min" no primeiro render do
// cliente é mismatch de hidratação: `formatRelativeTime` lê `Date.now()`, e os
// dois lados leem o relógio em momentos diferentes. Não existe texto RELATIVO
// que os dois calculem igual sem mandar o `now` do servidor junto — o que
// existe é a data ABSOLUTA, que `formatDate` fixa no fuso de São Paulo e por
// isso sai idêntica dos dois lados. É ela que vai ao HTML e é ela que o React
// hidrata; o texto relativo entra no re-render seguinte, quando já não há HTML
// do servidor com que casar.
//
// `useSyncExternalStore` é quem separa os dois momentos: `getServerSnapshot`
// vale no SSR E na hidratação, `getSnapshot` vale de lá em diante. Com
// `useState` + `useEffect` o efeito teria de chamar `setState` no próprio corpo
// (o que `react-hooks/set-state-in-effect` reprova, e por bom motivo: é render
// em cascata).
//
// `suppressHydrationWarning` foi descartado de propósito: ele cala o aviso
// mantendo o texto do SERVIDOR no DOM enquanto o React passa a acreditar no
// texto do cliente — os dois deixam de ser o mesmo, e nenhum re-render com o
// mesmo valor conserta, porque o React diffa contra o que memorizou, não contra
// a tela. O "há 7 min" ficaria congelado ali.
const SEM_INSCRICAO = () => () => {};

export function RelativeTime({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  // O snapshot precisa ser estável entre chamadas — o React consulta duas vezes
  // no mesmo commit para detectar tearing, e um valor novo a cada chamada vira
  // "getSnapshot should be cached to avoid an infinite loop". Congelar na
  // primeira leitura também é o comportamento certo aqui: o texto é lido uma
  // vez, como era antes, e nenhum relógio fica rodando por linha de tabela.
  const cache = useRef<{ iso: string; texto: string } | null>(null);

  const noCliente = useCallback(() => {
    if (cache.current?.iso !== iso) {
      cache.current = { iso, texto: formatRelativeTime(iso) };
    }
    return cache.current.texto;
  }, [iso]);

  const noServidor = useCallback(() => formatDate(iso), [iso]);

  const texto = useSyncExternalStore(SEM_INSCRICAO, noCliente, noServidor);

  return <span className={className}>{texto}</span>;
}
