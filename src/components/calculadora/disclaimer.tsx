// Disclaimer permanente de toda tela de resultado (invariante 10; P3:
// projeção nunca se apresenta como medição).
export function Disclaimer() {
  return (
    <p className="text-center text-xs leading-relaxed text-slate-400">
      Esta calculadora projeta cenários a partir de premissas declaradas. Não
      constitui garantia de resultado nem proposta comercial vinculante. O
      piloto existe para verificar a projeção contra um baseline acordado.
    </p>
  );
}
