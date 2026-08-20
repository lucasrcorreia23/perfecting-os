// Disclaimer permanente de toda tela de resultado (invariante 10; P3:
// projeção nunca se apresenta como medição).
export function Disclaimer() {
  return (
    // Fallback obrigatório: este bloco também é lido em `link-detail`, fora da
    // pele. Dentro dela o cinza sobe para `--pf-ink-soft` — a §8.12b não deixa
    // frase que precisa ser lida parar no tom decorativo, e esta vai ao papel.
    <p className="text-center text-xs leading-5 text-[var(--pf-ink-soft,#94a3b8)]">
      Esta calculadora projeta cenários a partir de premissas declaradas. Não
      constitui garantia de resultado nem proposta comercial vinculante. O
      piloto existe para verificar a projeção contra um baseline acordado.
    </p>
  );
}
