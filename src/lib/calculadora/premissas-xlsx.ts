// Lê as premissas de um .xlsx no formato do Template / Auditada.
//
// exceljs não abre estes arquivos (rels de comentários quebrados). O motor
// não executa fórmulas: extraímos o valor em cache das células conhecidas
// (Premissas, Tabela de Preços por Tier, Custo da Inação). Motor/Conta são
// ignorados de propósito — mudar uma fórmula lá não reescreve calc.ts.

import JSZip from "jszip";
import { TABELA_TIERS } from "./constants";
import { fundirPremissas, type PremissasRacional } from "./premissas";

export type AvisoXlsx = {
  codigo: "tier2_573" | "aba_ausente" | "haircut_diverge" | "motor_ignorado" | "celula_vazia";
  mensagem: string;
};

export type LeituraXlsx = {
  premissas: PremissasRacional;
  avisos: AvisoXlsx[];
};

const TIER2_TEMPLATE = TABELA_TIERS[1].ateHoras; // 656
const SENTINELA_INFINITO = 1e8;

function decodeEntidade(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

function celulasDaAba(xml: string): Map<string, string> {
  const mapa = new Map<string, string>();
  const re = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
  let m;
  while ((m = re.exec(xml))) {
    const addr = m[1].match(/\br="([A-Z]+[0-9]+)"/)?.[1];
    if (!addr) continue;
    const inner = m[2];
    const v = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
    const inline = inner.match(/<is>[\s\S]*?<t\b[^>]*>([\s\S]*?)<\/t>/);
    const bruto = v?.[1] ?? inline?.[1];
    if (bruto == null || bruto === "") continue;
    mapa.set(addr, decodeEntidade(bruto));
  }
  return mapa;
}

function num(mapa: Map<string, string>, addr: string): number | null {
  const bruto = mapa.get(addr);
  if (bruto == null) return null;
  const n = Number(bruto);
  return Number.isFinite(n) ? n : null;
}

function ateHoras(n: number): number {
  return n >= SENTINELA_INFINITO ? Infinity : n;
}

type Abas = Map<string, Map<string, string>>;

async function lerAbas(buffer: Buffer): Promise<{ abas: Abas; nomes: string[] }> {
  const zip = await JSZip.loadAsync(buffer);
  const relsFile = zip.file("xl/_rels/workbook.xml.rels");
  const wbFile = zip.file("xl/workbook.xml");
  if (!relsFile || !wbFile) {
    throw new Error("O arquivo não parece uma planilha .xlsx.");
  }
  const rels = await relsFile.async("string");
  const wb = await wbFile.async("string");
  const nomes = [...wb.matchAll(/name="([^"]+)"[^>]*r:id="([^"]+)"/g)].map((x) => ({
    nome: x[1],
    rid: x[2],
  }));
  const ridToTarget = Object.fromEntries(
    [...rels.matchAll(/<Relationship\b([^>]*)>/g)].map((m) => {
      const attrs = m[1];
      return [
        attrs.match(/\bId="([^"]+)"/)?.[1] ?? "",
        attrs.match(/\bTarget="([^"]+)"/)?.[1] ?? "",
      ];
    }),
  );
  const abas: Abas = new Map();
  for (const { nome, rid } of nomes) {
    const target = ridToTarget[rid];
    if (!target) continue;
    const path = target.replace(/^\//, "");
    const arquivo = zip.file(path);
    if (!arquivo) continue;
    abas.set(nome, celulasDaAba(await arquivo.async("string")));
  }
  return { abas, nomes: nomes.map((n) => n.nome) };
}

function abaPorNome(abas: Abas, teste: RegExp): Map<string, string> | undefined {
  for (const [nome, celulas] of abas) {
    if (teste.test(nome)) return celulas;
  }
  return undefined;
}

/**
 * Interpreta um workbook no formato do Template / Auditada. Células
 * desconhecidas ou vazias caem no padrão via `fundirPremissas`.
 */
export async function lerXlsxPremissas(buffer: Buffer): Promise<LeituraXlsx> {
  const { abas, nomes } = await lerAbas(buffer);
  const avisos: AvisoXlsx[] = [];
  const parcial: Record<string, unknown> = {};

  if (nomes.some((n) => /motor|conta/i.test(n))) {
    avisos.push({
      codigo: "motor_ignorado",
      mensagem:
        "As abas Motor e Conta foram ignoradas: as fórmulas do cálculo continuam no código. Só as premissas (números) entram neste link.",
    });
  }

  const prem = abaPorNome(abas, /premissa/i);
  if (!prem) {
    avisos.push({
      codigo: "aba_ausente",
      mensagem: "Aba Premissas não encontrada. O racional padrão foi mantido.",
    });
    return { premissas: fundirPremissas(parcial), avisos };
  }

  const pegar = (addr: string, destino: (n: number) => void) => {
    const n = num(prem, addr);
    if (n === null) {
      avisos.push({
        codigo: "celula_vazia",
        mensagem: `Premissas!${addr} veio vazia — mantivemos o valor padrão.`,
      });
      return;
    }
    destino(n);
  };

  pegar("C8", (n) => {
    parcial.encargos = n;
  });
  pegar("C9", (n) => {
    parcial.jornadaMensalH = n;
  });
  pegar("C10", (n) => {
    parcial.fatorEscopoPremissa = n;
  });
  pegar("C11", (n) => {
    parcial.supervisao = n;
  });

  const hRampa = num(prem, "C12");
  const hCiclo = num(prem, "C13");
  const hConv = num(prem, "C14");
  if (hRampa !== null) parcial.haircut = hRampa;
  if (
    hRampa !== null &&
    hCiclo !== null &&
    hConv !== null &&
    (hRampa !== hCiclo || hRampa !== hConv)
  ) {
    avisos.push({
      codigo: "haircut_diverge",
      mensagem:
        "A planilha tem três haircuts (rampa/ciclo/conversão) diferentes. O motor usa um só — ficou o de rampa (Premissas!C12).",
    });
  }
  pegar("C15", (n) => {
    parcial.pctEventoSubstituivel = n;
  });
  pegar("C19", (n) => {
    parcial.diasUteisMes = n;
  });
  pegar("C20", (n) => {
    parcial.diasUteisAno = n;
  });
  pegar("C21", (n) => {
    parcial.taxaMinima = n;
  });
  pegar("C22", (n) => {
    parcial.fatorEscopoMin = n;
  });
  pegar("C23", (n) => {
    parcial.fatorEscopoMax = n;
  });
  const recMin = num(prem, "C24");
  const recMax = num(prem, "C25");
  if (recMin !== null) parcial.receitaPorVendedorMin = recMin;
  if (recMax !== null) parcial.receitaPorVendedorMax = recMax;
  pegar("C26", (n) => {
    parcial.checagemAlerta = n;
  });

  const t1 = num(prem, "C30");
  const t2 = num(prem, "C31");
  const t3 = num(prem, "C32");
  const tx1 = num(prem, "E30");
  const tx2 = num(prem, "E31");
  const tx3 = num(prem, "E32");
  const tx4 = num(prem, "E33");
  if (t1 !== null && t2 !== null && t3 !== null && tx1 !== null && tx2 !== null && tx3 !== null && tx4 !== null) {
    parcial.tabelaTiers = [
      { tier: 1, ateHoras: t1, taxaHora: tx1 },
      { tier: 2, ateHoras: t2, taxaHora: tx2 },
      { tier: 3, ateHoras: t3, taxaHora: tx3 },
      { tier: 4, ateHoras: null, taxaHora: tx4 },
    ];
    if (t2 !== TIER2_TEMPLATE) {
      avisos.push({
        codigo: "tier2_573",
        mensagem: `Premissas!C31 = ${t2} h (o Template do produto usa ${TIER2_TEMPLATE} h). Vale só neste link.`,
      });
    }
  }

  const h1 = num(prem, "C37");
  const h2 = num(prem, "C38");
  const h3 = num(prem, "C39");
  if (h1 !== null && h2 !== null && h3 !== null) {
    parcial.horasPlanos = { essencial: h1, pratica: h2, intensivo: h3 };
  }

  const cenario = (linha: number) => {
    const ticketPct = num(prem, `C${linha}`);
    const rampaPct = num(prem, `D${linha}`);
    const cicloPct = num(prem, `E${linha}`);
    const convPp = num(prem, `F${linha}`);
    if (ticketPct === null || rampaPct === null || cicloPct === null || convPp === null) {
      return null;
    }
    return { ticketPct, rampaPct, cicloPct, convPp };
  };
  const conservador = cenario(43);
  const realista = cenario(44);
  const otimista = cenario(45);
  if (conservador && realista && otimista) {
    parcial.cenarios = { conservador, realista, otimista };
  }

  pegar("C63", (n) => {
    parcial.fineTuneTicketMax = n;
  });
  pegar("C64", (n) => {
    parcial.fineTuneRampaMax = n;
  });
  pegar("C65", (n) => {
    parcial.reducaoCicloMax = n;
  });

  const coiAba = abaPorNome(abas, /ina/i);
  const coi: Record<string, number> = {};
  const fonteCoi = coiAba ?? prem;
  const coiMap: [string, string][] = coiAba
    ? [
        ["C15", "deltaAttainment"],
        ["C16", "haircut"],
        ["C26", "rampaExtensaoMeses"],
        ["C35", "retencaoCom"],
        ["C36", "retencaoSem"],
        ["C40", "custoSubstituicao"],
        ["C46", "noDecision"],
        ["C47", "fracaoCoachavel"],
        ["C55", "semanasEspera"],
        ["C56", "horasPerdidasSemana"],
      ]
    : [
        ["C71", "custoSubstituicao"],
        ["C72", "noDecision"],
        ["C73", "horasCoachingMin"],
      ];
  for (const [addr, chave] of coiMap) {
    const n = num(fonteCoi, addr);
    if (n !== null) coi[chave] = n;
  }
  const horasCoach = num(prem, "C73");
  if (horasCoach !== null) coi.horasCoachingMin = horasCoach;
  if (Object.keys(coi).length > 0) parcial.coi = coi;

  if (!coiAba) {
    avisos.push({
      codigo: "aba_ausente",
      mensagem:
        "Aba Custo da Inação ausente. Os benchmarks do COI que não estavam em Premissas ficaram no padrão do produto.",
    });
  }

  const premissas = fundirPremissas(parcial);
  // 999999999 da planilha vira Infinity no último tier.
  premissas.tabelaTiers = premissas.tabelaTiers.map((faixa, i, arr) =>
    i === arr.length - 1 ? { ...faixa, ateHoras: ateHoras(faixa.ateHoras) } : faixa,
  );
  return { premissas, avisos };
}
