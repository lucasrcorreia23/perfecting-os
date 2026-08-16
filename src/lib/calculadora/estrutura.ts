// Estrutura de capacitação compartilhada (§4.11). Quando os mesmos gestores
// atendem mais de um time, o V5 manda ratear **número de gestores** e **custos
// do contrafactual** por peso de vendedores, deixando **horas por gestor** e
// **salário por gestor** inalterados — são características do gestor, não do
// time. Sem isso, três times atendidos pelos mesmos três gestores declarariam
// três vezes a mesma estrutura e a eficiência seria contada 3×.
//
// Transformação pura aplicada ANTES do cálculo (em `computarModelo`): `calc.ts`
// e `consolidado.ts` não sabem que ela existe.
//
// Invariante que vale registrar: o fator de escopo é indiferente ao rateio.
//   (horas × gestores) ÷ (vendedores_por_gestor × gestores × prática)
// cancela `gestores`. O rateio corrige a eficiência do caminho declarado e os
// custos do contrafactual — nada além disso.

import type { EntradasTime, EstadoCalculadora, EstruturaCompartilhada } from "./types";

export function estruturaVazia(): EstruturaCompartilhada {
  return {
    ativa: false,
    numGestoresTreino: null,
    custoExternoAno: null,
    custoEventoAno: null,
    horasTreinoGestorMes: null,
    vendedoresPorGestorMes: null,
    salarioGestor: null,
    caminho: null,
  };
}

export function estruturaAtiva(estado: EstadoCalculadora): boolean {
  return estado.estrutura?.ativa === true && estado.times.length > 1;
}

function vendedoresDe(entradas: EntradasTime): number {
  const valor = entradas.numVendedores;
  return valor !== null && Number.isFinite(valor) && valor > 0 ? valor : 0;
}

// Peso de cada time no rateio: vendedores do time ÷ vendedores da conta. Times
// que ainda não declararam vendedores recebem peso 0 e seguem barrados pelo
// gating normal (numVendedores está na lista de faltantes de todo jeito).
export function pesosPorTime(estado: EstadoCalculadora): Map<string, number> {
  const total = estado.times.reduce((soma, time) => soma + vendedoresDe(time.entradas), 0);
  const pesos = new Map<string, number>();
  for (const time of estado.times) {
    pesos.set(time.id, total > 0 ? vendedoresDe(time.entradas) / total : 0);
  }
  return pesos;
}

function ratear(valor: number | null, peso: number): number | null {
  if (valor === null || !Number.isFinite(valor)) return null;
  return valor * peso;
}

// Estado derivado: cada time recebe a fatia que lhe cabe da estrutura da conta.
// Devolve o estado intacto quando a estrutura está desligada ou há um time só.
export function aplicarEstrutura(estado: EstadoCalculadora): EstadoCalculadora {
  if (!estruturaAtiva(estado)) return estado;
  const estrutura = estado.estrutura!;
  const pesos = pesosPorTime(estado);

  return {
    ...estado,
    times: estado.times.map((time) => {
      const peso = pesos.get(time.id) ?? 0;
      return {
        ...time,
        entradas: {
          ...time.entradas,
          // Rateados por peso de vendedores.
          numGestoresTreino: ratear(estrutura.numGestoresTreino, peso),
          custoExternoAno: ratear(estrutura.custoExternoAno, peso),
          custoEventoAno: ratear(estrutura.custoEventoAno, peso),
          // Características do gestor: idênticas em todos os times.
          horasTreinoGestorMes: estrutura.horasTreinoGestorMes,
          vendedoresPorGestorMes: estrutura.vendedoresPorGestorMes,
          salarioGestor: estrutura.salarioGestor,
          // Escolha única da conta.
          caminho: estrutura.caminho,
        },
      };
    }),
  };
}

// Campos que saem do formulário por time quando a estrutura está ativa — a
// mesma lista alimenta o wizard e a sidebar, para não divergirem.
export const CAMPOS_DA_ESTRUTURA = [
  "numGestoresTreino",
  "horasTreinoGestorMes",
  "vendedoresPorGestorMes",
  "salarioGestor",
  "caminho",
  "custoExternoAno",
  "custoEventoAno",
] as const;
