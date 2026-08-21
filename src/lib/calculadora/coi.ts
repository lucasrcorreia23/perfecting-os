// Custo da Inação (COI) — aba "Custo da Inação" de `ROI_Perfecting_Corrigido.xlsx`
// (19/08/2026). Mede o que vaza HOJE, com os números do próprio cliente.
//
// Módulo puro e derivado, no molde de `cenarios-comparacao.ts`: nada daqui
// volta para `calcResultadoTime`. O COI é uma leitura CONTRAFACTUAL e o ROI é a
// atribuição — o invariante 1 do V5 manda escolher um dos dois para o mesmo
// valor, nunca somar os dois. A planilha faz o contrário (nota metodológica ①
// declara o COI "aditivo ao ROI"); ver E-34.
//
// Cinco divergências deliberadas em relação à aba, todas registradas em
// `referencia.ts` e em `docs/calculadora-erratas-v5.md`:
//
//  1. MARGEM, não receita, nas dimensões 2, 3 e 5 (E-33). Todo o motor trabalha
//     em margem; lado a lado, receita contra margem compara grandezas
//     diferentes — e é o que fazia o COI dar 5,88× o valor do ROI no §14.
//  2. COBERTURA MEDIDA EM HORAS, UMA VEZ (E-31). A aba mede a Dimensão 1 em
//     cabeças e o Diagnóstico em horas: no §14 dão 40% e 0%, no FIESC dão −2% e
//     40%. Horas capturam alcance e intensidade de uma vez só.
//  3. O RAMO QUEBRADO DE `C9` É DESCARTADO (E-32): `Motor!C23 × Motor!C9`
//     multiplica horas por gestores e devolve h·gestor onde o rótulo pede
//     vendedores — e, sendo o primeiro ramo, encobre o segundo, que é o certo.
//  4. HAIRCUT UNIFORME (E-35). A nota ② promete 50% "em cada dimensão", mas só
//     as dimensões 2 e 3 o aplicam. Aqui toda dimensão carrega exatamente um.
//  5. TURNOVER TRAVADO PELAS CONTRATAÇÕES DO ANO e incidindo só sobre os
//     vendedores não atendidos — a aba aplica os 40 p.p. sobre o time inteiro.
//     Ninguém perde mais gente do que repõe, e quem já recebe coaching não está
//     no grupo de risco.

import { resolverMargem } from "./calc";
import { PREMISSAS_PADRAO, type PremissasRacional } from "./premissas";
import type {
  DimensaoCoi,
  EntradasTime,
  ResultadoCoi,
  ResultadoTime,
} from "./types";

type ResultadoOk = Extract<ResultadoTime, { status: "ok" }>;

// Nenhuma dimensão é negativa: um time que já entrega mais que o mínimo tem
// lacuna zero, não crédito. Sem isso o FIESC (cobertura de 102%) devolveria COI
// negativo, que na tela lê como ganho.
const naoNegativo = (valor: number) => (Number.isFinite(valor) ? Math.max(0, valor) : 0);

export function calcCoi(
  entradas: EntradasTime,
  resultado: ResultadoOk,
  p: PremissasRacional = PREMISSAS_PADRAO,
): ResultadoCoi {
  // O gating de `camposFaltando` já passou (o chamador só tem `ResultadoOk`),
  // então todo campo obrigatório é número. `salarioVendedor` é o único opcional
  // que este módulo lê.
  const numVendedores = entradas.numVendedores!;
  const margem = resolverMargem(entradas)!;
  const receitaPorVendedor = entradas.receitaMensal! / numVendedores;
  const coi = p.coi;

  // Cobertura: horas de prática que de fato chegam ao vendedor (Motor!C25)
  // contra o mínimo de 2 h/mês por vendedor (Premissas!C73).
  const horasEntreguesMes =
    entradas.vendedoresPorGestorMes! *
    entradas.numGestoresTreino! *
    entradas.horasPraticaPorRepHoje!;
  const horasNecessariasMes = numVendedores * coi.horasCoachingMin;
  const pctAtendida =
    horasNecessariasMes > 0 ? Math.min(1, horasEntreguesMes / horasNecessariasMes) : 1;
  const vendedoresNaoAtendidos = numVendedores * (1 - pctAtendida);

  // Capacidade: se o gestor sequer TEM as horas (Motor!C23). Responde outra
  // pergunta — no §14 ele tem 60 h para 60 h de demanda e ainda assim só 27 h
  // viram prática (é o fator de escopo); no FIESC ele tem 120 h para 200 h.
  const horasDisponiveisMes = entradas.numGestoresTreino! * entradas.horasTreinoGestorMes!;
  const gapHorasMes = Math.max(0, horasNecessariasMes - horasDisponiveisMes);

  const temSalarioVendedor =
    entradas.salarioVendedor != null &&
    Number.isFinite(entradas.salarioVendedor) &&
    entradas.salarioVendedor > 0;
  const custoHoraVendedor = temSalarioVendedor
    ? (entradas.salarioVendedor! * p.encargos) / p.jornadaMensalH
    : null;
  const custoSubstituicao = temSalarioVendedor
    ? entradas.salarioVendedor! * p.encargos * coi.custoSubstituicao * 12
    : null;

  // Quantas saídas a mais são atribuíveis à falta de coaching. Trava dupla: só
  // os não atendidos correm o risco, e ninguém perde mais gente do que repõe no
  // ano (`contratacoesAno`).
  const saidasExtras = Math.min(
    entradas.contratacoesAno!,
    vendedoresNaoAtendidos * (coi.retencaoCom - coi.retencaoSem) * coi.haircut,
  );

  const dimensoes: DimensaoCoi[] = [
    {
      // C21 — quem não pratica bate menos quota. 29 p.p. com haircut de 50%.
      id: "subperformance",
      valorAno: naoNegativo(
        receitaPorVendedor *
          (coi.deltaAttainment * coi.haircut) *
          vendedoresNaoAtendidos *
          12 *
          margem,
      ),
    },
    {
      // C31 — 1,4 mês a mais de rampa (Ebsta), com haircut, sobre quem entra no
      // ano. Vendedor em rampa rende metade.
      id: "rampa_estendida",
      valorAno: naoNegativo(
        coi.rampaExtensaoMeses *
          coi.haircut *
          entradas.contratacoesAno! *
          (receitaPorVendedor * coi.rampaProdutividade) *
          margem,
      ),
    },
    {
      // C42 — custo de repor quem sai por falta de coaching. Já é folha, não
      // receita: não multiplica por margem.
      id: "turnover",
      valorAno:
        custoSubstituicao === null ? null : naoNegativo(saidasExtras * custoSubstituicao),
    },
    {
      // C50 — deals que morrem no status quo e que coaching de discovery
      // destravaria. O haircut desta dimensão é o COI_FRACAO_COACHAVEL.
      id: "no_decision",
      valorAno: naoNegativo(
        (entradas.receitaMensal! / entradas.ticketMedio!) *
          coi.noDecision *
          coi.fracaoCoachavel *
          entradas.ticketMedio! *
          12 *
          margem,
      ),
    },
    {
      // C58 — quem espera vaga na agenda do gestor produz menos. Folha também.
      id: "fila",
      valorAno:
        custoHoraVendedor === null
          ? null
          : naoNegativo(
              vendedoresNaoAtendidos *
                coi.semanasEspera *
                coi.horasPerdidasSemana *
                custoHoraVendedor *
                12 *
                coi.haircut,
            ),
    },
  ];

  const totalAno = dimensoes.reduce((soma, d) => soma + (d.valorAno ?? 0), 0);

  // O valor do programa vai CONTRA o total, nunca somado a ele (invariante 1).
  const recuperadoAno = Math.min(resultado.valorAno, totalAno);
  const residualAno = Math.max(0, totalAno - resultado.valorAno);
  const pctRecuperado = totalAno > 0 ? recuperadoAno / totalAno : 0;

  // Mesma régua do §4.7, outra pergunta: ali o alerta protege contra um GANHO
  // implausível; aqui avisa que a LACUNA estimada ficou grande demais para a
  // margem declarada — quase sempre sinal de dado de estrutura torto.
  const margemAnual = resultado.margemMensalAtual * 12;
  const checagemPct = margemAnual > 0 ? (totalAno / margemAnual) * 100 : 0;

  return {
    cobertura: {
      horasEntreguesMes,
      horasNecessariasMes,
      pctAtendida,
      vendedoresNaoAtendidos,
    },
    capacidade: {
      horasDisponiveisMes,
      horasNecessariasMes,
      gapHorasMes,
      pctNaoAtendida: horasNecessariasMes > 0 ? gapHorasMes / horasNecessariasMes : 0,
    },
    dimensoes,
    totalAno,
    recuperadoAno,
    residualAno,
    pctRecuperado,
    checagemPct,
    checagemAlerta: checagemPct > p.checagemAlerta * 100,
  };
}
