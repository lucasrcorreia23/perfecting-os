import type { Progresso } from "./estado";

/*
 * Quando o número passa a existir para ESTA pessoa, NESTA sessão.
 *
 * A calculadora não tem rota nem histórico: o link é o estado, e quem volta com
 * tudo preenchido cai direto na tela de resultado. Sem separar "descobriu
 * agora" de "já sabia", a comemoração viraria pedágio a cada recarregamento.
 *
 * A separação é feita por uma lista de times já vistos, sempre crescente e
 * semeada no primeiro render com `timesJaCompletos`. Como ela só cresce,
 * completar → editar até incompletar → completar de novo não reabre nada: o
 * time já foi comemorado uma vez e é isso que a lista registra.
 *
 * Nada disso é persistido. O ciclo de vida é a aba aberta — de propósito: o
 * único armazenamento do fluxo é o próprio link, e gravar "já comemorou" no
 * estado poluiria o autosave com uma preferência de apresentação.
 */

/** Times completos no primeiro render — a semente de "já sabia". */
export function timesJaCompletos(prog: Progresso): string[] {
  return prog.porTime.filter((time) => time.completo).map((time) => time.timeId);
}

/** Times que ficaram completos depois da semente e ainda não foram comemorados. */
export function timesParaCelebrar(
  vistos: readonly string[],
  prog: Progresso,
): string[] {
  return prog.porTime
    .filter((time) => time.completo && !vistos.includes(time.timeId))
    .map((time) => time.timeId);
}
