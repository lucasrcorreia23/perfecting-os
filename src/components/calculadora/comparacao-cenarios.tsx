"use client";

import { useState, type ReactNode } from "react";
import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import { CICLO_DIAS_MINIMO, deltaConvMax, deltasEfetivos } from "@/lib/calculadora/calc";
import { CENARIOS } from "@/lib/calculadora/constants";
import { formatBRL, formatMeses, formatNumero, formatX } from "@/lib/calculadora/format";
import type { LinhaCenario } from "@/lib/calculadora/cenarios-comparacao";
import type {
  Cenario,
  CenarioSelecionado,
  Deltas,
  DeltasEfetivos,
  EntradasTime,
} from "@/lib/calculadora/types";
import { cn } from "@/lib/utils";
import { LinhaCompacta } from "./linha-compacta";
import { usePremissas } from "./premissas-context";

// Comparação dos três cenários (aba Scenario Comparison do Excel), um card
// completo por cenário. Saiu de `graficos-resultado.tsx` em 20/08/2026 quando
// deixou de ser leitura: aquele arquivo se declara "gráficos do resultado", e
// este bloco passou a ser o CONTROLE do cenário — escolher outro e ajustar os
// deltas do que está ativo, sem sair da comparação.
//
// A reabertura é estreita, e é ela que mantém de pé a decisão que tirou os
// sliders de baixo do hero ("o número parou de se mexer debaixo de quem está
// lendo"): o que se edita aqui está a três blocos do hero, dentro do único lugar
// da tela cujo assunto já era a diferença entre um cenário e outro. Quem chega
// neste bloco veio comparar.
//
// Não é dono da própria superfície: renderiza a grade e quem dá moldura é a
// `SecaoResultado` em volta. `link-detail` (tela interna) renderiza o mesmo
// bloco SEM a prop `edicao` — lá é leitura pura, e por isso todo token leva
// fallback do design system.

// ---------------------------------------------------------------------------
// O campo do delta
// ---------------------------------------------------------------------------

// Mesma assinatura do `CampoNumero` (§5.1 do DESIGN_SYSTEM: amarelo, borda de
// 1,5px, sombra interna, valor em mono 700), numa altura que cabe dentro de uma
// linha de leitura. O alvo de toque fica nos 44px da §11 no mobile e encolhe só
// a partir do `sm:` — mesmo arranjo do "Voltar ao cenário" da etapa avançada, e
// pela mesma razão: no mobile o card ocupa a largura toda.

function formatarDelta(valor: number, decimais: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: decimais });
}

function parseDelta(texto: string): number | null {
  // Mesmo parser pt-BR do `CampoNumero`: ponto é separador de milhar, vírgula é
  // decimal. Divergir aqui faria o mesmo teclado significar coisas diferentes
  // em duas telas da mesma jornada.
  const limpo = texto.trim().replace(/\./g, "").replace(",", ".");
  if (limpo === "") return null;
  const valor = Number(limpo);
  if (!Number.isFinite(valor) || valor < 0) return null;
  return valor;
}

function CampoDelta({
  id,
  rotulo,
  sinal,
  sufixo,
  valor,
  max,
  decimais,
  onChange,
}: {
  id: string;
  // Vai no `aria-label`: o rótulo visível é o da própria linha, e o leitor de
  // tela não tem como saber que o campo pertence a ela.
  rotulo: string;
  sinal: "+" | "−";
  sufixo: string;
  valor: number;
  max: number;
  decimais: number;
  onChange: (valor: number) => void;
}) {
  const [texto, setTexto] = useState(() => formatarDelta(valor, decimais));
  const [focado, setFocado] = useState(false);

  // Sincroniza quando o valor muda por fora (trocar de cenário, ajustar o mesmo
  // delta pela etapa avançada) sem atropelar quem está digitando — o padrão
  // "adjust state during render", como no `CampoNumero`.
  const [anterior, setAnterior] = useState(valor);
  if (valor !== anterior) {
    setAnterior(valor);
    if (!focado) setTexto(formatarDelta(valor, decimais));
  }

  return (
    <span
      className={cn(
        "inline-flex min-h-11 items-center gap-1 rounded-full border-[1.5px] px-2.5 transition-colors sm:min-h-9",
        "bg-[var(--pf-input,#ffffff)] shadow-[inset_0_2px_0_var(--pf-input-inset,transparent)]",
        "border-[var(--pf-input-border,#e2e8f0)] focus-within:border-[var(--pf-input-text,#2e63cd)]",
        "focus-within:ring-2 focus-within:ring-[var(--pf-brand,#2e63cd)]/35",
      )}
    >
      {/* O sinal é APRESENTAÇÃO, nunca parte do valor: a rampa encurta e o ciclo
          diminui, mas o que se digita nos dois é a magnitude. Guardar o sinal no
          número faria o campo aceitar "−15" e o modelo receber um delta
          negativo, que `deltasEfetivos` clamparia para zero em silêncio. */}
      <span
        aria-hidden
        className="pf-mono text-sm font-bold text-[var(--pf-input-text,#0f172a)]"
      >
        {sinal}
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={rotulo}
        value={texto}
        onFocus={() => setFocado(true)}
        onBlur={() => {
          setFocado(false);
          setTexto(formatarDelta(valor, decimais));
        }}
        onChange={(event) => {
          const cru = event.target.value;
          if (!/^[\d.,\s]*$/.test(cru)) return;
          setTexto(cru);
          const parsed = parseDelta(cru);
          // Clampa ANTES de persistir, e não só na leitura: `deltasEfetivos`
          // clampa de novo, mas guardar 30 num campo de teto 5 faria o delta
          // "crescer sozinho" no dia em que a entrada que define o teto subisse.
          // O texto digitado sobrevive até o blur — quem reformata é a
          // sincronização acima, com o valor que o modelo de fato aceitou.
          onChange(parsed === null ? 0 : Math.min(parsed, max));
        }}
        className="pf-mono w-9 min-w-0 bg-transparent text-sm font-bold tabular-nums text-[var(--pf-input-text,#0f172a)] outline-none"
      />
      <span className="text-sm text-[var(--pf-ink-soft,#475569)]">{sufixo}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Os deltas de uma coluna, em texto
//
// A tela dizia "só os deltas de melhoria mudam" e nunca mostrava um deles: as
// três colunas exibiam o EFEITO em reais sem a causa. Agora cada linha traz o
// delta ao lado do rótulo — texto nas colunas de leitura, campo na ativa.
// ---------------------------------------------------------------------------

type LeituraDelta = { sinal: "+" | "−"; texto: string };

function textoDelta(leitura: LeituraDelta | null): string | undefined {
  return leitura ? `${leitura.sinal}${leitura.texto}` : undefined;
}

/**
 * O delta lido, na altura do delta EDITÁVEL.
 *
 * As três colunas existem para ser comparadas linha a linha, e era exatamente
 * isso que a grade não entregava: na coluna ativa cada alavanca é um
 * `CampoDelta` de 44px (36px do `sm:` para cima), nas outras duas era uma linha
 * de texto de ~20px. Quatro alavancas depois, "Valor anual" da coluna ativa
 * estava 68px abaixo do "Valor anual" das vizinhas — o olho tinha de caçar cada
 * total em vez de varrer uma pauta.
 *
 * Subgrid resolveria, mas custaria reescrever três níveis de aninhamento
 * (coluna → `dl` → `LinhaCompacta`) para alinhar o que uma altura mínima já
 * alinha. Por isso o slot entra pelo `controle` — nunca pelo `delta` — quando
 * a grade aceita edição: é o mesmo par de classes do `CampoDelta`, e as duas
 * formas passam a ocupar a mesma faixa.
 *
 * Sem edição (`link-detail`, leitura pura) NÃO há campo em coluna nenhuma, as
 * alturas já batem, e o texto volta a ser texto — inflar as linhas para 44px
 * ali seria pagar o preço de um alinhamento que não está em risco.
 */
function DeltaLido({ texto }: { texto: string }) {
  return (
    <span className="inline-flex min-h-11 items-center tabular-nums font-medium text-[var(--pf-ink-faint,#64748b)] sm:min-h-9">
      {texto}
    </span>
  );
}

/**
 * O par `delta`/`controle` de uma alavanca: campo na coluna ativa, texto nas
 * outras — e, quando a grade é editável, texto na MESMA altura do campo.
 * Espalhado com `{...}` no `LinhaCompacta` para as quatro alavancas não
 * repetirem o mesmo ternário de três braços.
 */
function alavanca(
  campo: ReactNode | null,
  leitura: LeituraDelta | null,
  editavel: boolean,
): { delta?: string; controle?: ReactNode } {
  if (campo) return { controle: campo };
  const texto = textoDelta(leitura);
  if (texto === undefined) return {};
  return editavel ? { controle: <DeltaLido texto={texto} /> } : { delta: texto };
}

/**
 * O ciclo tem duas mecânicas (Excel Engine!C52–C56) e a leitura acompanha: com
 * ciclo ≥ 7 dias a fonte da verdade são DIAS inteiros; abaixo disso é o
 * percentual contínuo do cenário. Sem funil não há alavanca e não há leitura.
 */
function leituraCiclo(deltas: DeltasEfetivos): LeituraDelta | null {
  if (deltas.cicloDiasMenos > 0) {
    return {
      sinal: "−",
      texto: `${deltas.cicloDiasMenos} ${deltas.cicloDiasMenos === 1 ? "dia" : "dias"}`,
    };
  }
  if (deltas.cicloPct > 0) {
    return { sinal: "−", texto: `${formatNumero(deltas.cicloPct * 100, 0)}%` };
  }
  return null;
}

// ---------------------------------------------------------------------------

export type EdicaoCenarios = {
  entradas: EntradasTime;
  sel: CenarioSelecionado;
  // A coluna ativa recalculada com os deltas em uso. Vem de fora porque
  // `compararCenarios` continua devolvendo os TRÊS PRESETS puros — é o que o
  // FAQ cita como "no cenário Conservador o ROI é X", e essa resposta não pode
  // mudar porque alguém ajustou um campo aqui.
  linhaAtiva: LinhaCenario | null;
  onChange: (sel: CenarioSelecionado) => void;
};

export function ComparacaoCenarios({
  linhas,
  precoMes,
  cenarioAtivo,
  personalizado = false,
  edicao,
}: {
  linhas: LinhaCenario[];
  precoMes: number;
  cenarioAtivo: Cenario;
  // Em "parâmetros personalizados" a coluna ativa deixou de ser o preset puro.
  personalizado?: boolean;
  // Ausente (tela interna) = leitura pura: nem o cabeçalho vira botão nem os
  // deltas viram campo.
  edicao?: EdicaoCenarios;
}) {
  const p = usePremissas();
  const deltasAtuais = edicao ? deltasEfetivos(edicao.sel, edicao.entradas, p) : null;

  const conversaoPct = edicao?.entradas.conversaoPct ?? null;
  const convMax = conversaoPct !== null && conversaoPct > 0 ? deltaConvMax(conversaoPct) : 0;
  const cicloDias = edicao?.entradas.cicloDias ?? null;
  // Abaixo de 7 dias a redução é o percentual contínuo do cenário (Engine!C53)
  // e não existe delta em `Deltas` para ela: ali a linha continua sendo leitura.
  const cicloEmDias = cicloDias !== null && cicloDias >= CICLO_DIAS_MINIMO;
  const cicloMax = cicloEmDias ? Math.round(cicloDias * p.reducaoCicloMax) : 0;

  // Persiste só o shape de `Deltas` — `cicloPct` é derivado, nunca estado. Mesma
  // função da etapa avançada, e é de propósito que as duas escrevam o mesmo
  // objeto: ajustar aqui é ajustar lá.
  function aplicar(patch: Partial<Deltas>) {
    if (!edicao || !deltasAtuais) return;
    const { ticketPct, rampaPct, cicloDiasMenos, convPp } = deltasAtuais;
    edicao.onChange({
      modo: "personalizado",
      base: edicao.sel.modo === "preset" ? edicao.sel.cenario : edicao.sel.base,
      deltas: { ticketPct, rampaPct, cicloDiasMenos, convPp, ...patch },
    });
  }

  return (
    // pt-3: o selo do cenário ativo monta 10px acima da borda do card, e sem
    // esse ar ele seria cortado pelo bloco em volta.
    <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-3">
      {linhas.map((preset) => {
        const cenario = preset.cenario;
        const ativo = cenario === cenarioAtivo;
        // A coluna ativa mostra o que o relatório inteiro está mostrando. Sem
        // `edicao` (tela interna) não existe linha ajustada, e o card continua
        // exibindo o preset — tracejado, como sempre, para não dizer "ativo"
        // sobre números que o cliente não viu.
        const ajustada = ativo && personalizado ? (edicao?.linhaAtiva ?? null) : null;
        const linha = ajustada ?? preset;
        const destacado = ativo && (!personalizado || ajustada !== null);
        // Um objeto só, para o TypeScript estreitar `edicao` e `deltasAtuais`
        // de uma vez: um booleano `editavel` não estreita nada e obrigaria a
        // um `!` em cada campo.
        const controles =
          ativo && edicao && deltasAtuais ? { edicao, deltas: deltasAtuais } : null;

        const cabecalho = (
          <>
            <span
              className={cn(
                "pf-card-title",
                destacado
                  ? "text-[var(--pf-brand-ink,#1e4a9e)]"
                  : "text-[var(--pf-ink,#334155)]",
              )}
            >
              {CENARIOS[cenario].label}
            </span>
            <span className="pf-num-hero text-trend-positive">{formatX(linha.roi)}</span>
            <span className="text-sm text-[var(--pf-ink-soft,#475569)]">
              payback em{" "}
              <span className="font-medium tabular-nums text-[var(--pf-ink-soft,#475569)]">
                {formatMeses(linha.paybackMeses)}
              </span>{" "}
              · valor/ano {formatBRL(linha.valorAno)}
            </span>
            {linha.paybackExcedeContrato ? (
              <span className="text-sm leading-6 text-[var(--pf-warn-ink,#973c00)]">
                passa do prazo escolhido
              </span>
            ) : null}
            {edicao ? (
              // A afordância é ESCRITA, e não só hover: num card que era só
              // leitura, nada dizia que ele respondia ao clique — e hover não
              // existe no toque.
              //
              // Na coluna ATIVA o slot fica vazio, mas EXISTE. Sem ele o
              // cabeçalho da ativa mede 134px contra os 162px das vizinhas, e
              // as sete linhas de comparação abaixo — que acabaram de ganhar
              // altura idêntica (ver `DeltaLido`) — recomeçam 28px acima:
              // "Valor anual" deixa de estar na mesma linha nas três colunas,
              // que é a única coisa que uma grade de comparação precisa
              // garantir. O `&nbsp;` é a reserva; quem diz que esta coluna
              // está em uso é o selo na moldura, não este espaço.
              <span
                aria-hidden={ativo || undefined}
                className="text-sm font-semibold text-[var(--pf-brand,#2e63cd)]"
              >
                {ativo ? " " : "Usar este cenário"}
              </span>
            ) : null}
          </>
        );

        return (
          <div
            key={cenario}
            className={cn(
              // `relative` porque o selo do ativo é SOBREPOSTO à borda: ele sai
              // do fluxo e monta na moldura em vez de empurrar o nome do
              // cenário para o lado. Dentro do fluxo, o par nome+pílula ocupava
              // a primeira linha inteira e a coluna ativa ficava um degrau mais
              // baixa que as outras duas.
              "relative flex flex-col gap-4 rounded-sm border p-6",
              destacado
                ? "border-[var(--pf-brand,#2e63cd)] bg-[var(--pf-surface-alt,#ffffff)]"
                : "border-[var(--pf-line,#e2e8f0)]",
              // Tracejado = "não é mais o preset puro", nos dois casos em que
              // isso é verdade: a base ajustada (com edição) e a base sem
              // números próprios (leitura interna).
              ativo && personalizado && "border-dashed",
            )}
          >
            {destacado ? (
              <span className="pf-label absolute -top-2.5 left-6 inline-flex w-fit items-center whitespace-nowrap rounded-full bg-[var(--pf-brand,#2e63cd)] px-3 py-1 text-[var(--pf-on-brand,#ffffff)]">
                {ajustada ? "Ativo · ajustado" : "Cenário ativo"}
              </span>
            ) : null}

            {edicao ? (
              <button
                type="button"
                onClick={() => edicao.onChange({ modo: "preset", cenario })}
                aria-pressed={destacado && ajustada === null}
                className={cn(
                  "flex cursor-pointer flex-col items-start gap-2 rounded-sm text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pf-brand,#2e63cd)]/35",
                  !ativo && "hover:text-[var(--pf-brand-ink,#1e4a9e)]",
                )}
              >
                {cabecalho}
              </button>
            ) : (
              <div className="flex flex-col gap-2">{cabecalho}</div>
            )}

            {/* Tracejado entre as parcelas, sólido acima do subtotal: a mesma
                distinção da `LinhaBarra` — régua de lista contra fio que fecha
                conta. Sem ela, sete linhas de mesma natureza empatavam com as
                duas que somam. */}
            <dl className="flex flex-col divide-y divide-dashed divide-[var(--pf-line,#e2e8f0)] border-t border-[var(--pf-line-soft,#f1f5f9)] pt-2 [&>*]:py-2">
              {/* A eficiência não tem delta e não ganha campo: ela vem do
                  caminho declarado, não do otimismo, e é a única linha igual
                  nas três colunas. */}
              <LinhaCompacta
                rotulo="Eficiência (igual)"
                valor={formatBRL(linha.eficienciaAno)}
              />
              <LinhaCompacta
                rotulo="Ticket médio"
                {...alavanca(
                  controles ? (
                    <CampoDelta
                      id={`delta-ticket-${cenario}`}
                      rotulo="Quanto o ticket médio pode subir, em %"
                      sinal="+"
                      sufixo="%"
                      valor={Math.round(controles.deltas.ticketPct * 100)}
                      max={p.fineTuneTicketMax * 100}
                      decimais={0}
                      onChange={(valor) => aplicar({ ticketPct: valor / 100 })}
                    />
                  ) : null,
                  {
                    sinal: "+",
                    texto: `${formatNumero(linha.deltas.ticketPct * 100, 0)}%`,
                  },
                  Boolean(edicao),
                )}
                valor={formatBRL(linha.parcelas.margemTicketAno)}
                tom="positivo"
              />
              <LinhaCompacta
                rotulo="Rampa"
                {...alavanca(
                  controles ? (
                    <CampoDelta
                      id={`delta-rampa-${cenario}`}
                      rotulo="Quanto a rampa pode encurtar, em %"
                      sinal="−"
                      sufixo="%"
                      valor={Math.round(controles.deltas.rampaPct * 100)}
                      max={p.fineTuneRampaMax * 100}
                      decimais={0}
                      onChange={(valor) => aplicar({ rampaPct: valor / 100 })}
                    />
                  ) : null,
                  {
                    sinal: "−",
                    texto: `${formatNumero(linha.deltas.rampaPct * 100, 0)}%`,
                  },
                  Boolean(edicao),
                )}
                valor={formatBRL(linha.parcelas.margemRampaAno)}
                tom="positivo"
              />
              <LinhaCompacta
                rotulo="Conversão"
                {...alavanca(
                  // A conversão é medida em PONTOS PERCENTUAIS, não em
                  // percentual do valor de hoje: 20% que viram 22% são +2 p.p.,
                  // e um campo em "%" ali seria outra conta. O teto é dinâmico
                  // (§4.4) — com ele em zero não há o que ajustar, e a linha
                  // volta a ser leitura.
                  controles && convMax > 0 ? (
                    <CampoDelta
                      id={`delta-conv-${cenario}`}
                      rotulo="Ganho de taxa de conversão, em pontos percentuais"
                      sinal="+"
                      sufixo="p.p."
                      valor={controles.deltas.convPp}
                      max={convMax}
                      decimais={1}
                      onChange={(valor) => aplicar({ convPp: valor })}
                    />
                  ) : null,
                  { sinal: "+", texto: `${formatNumero(linha.deltas.convPp, 1)} p.p.` },
                  Boolean(edicao),
                )}
                valor={formatBRL(linha.parcelas.ganhoConversaoAno)}
                tom="positivo"
              />
              <LinhaCompacta
                rotulo="Ciclo de vendas"
                {...alavanca(
                  // O campo é em DIAS porque é o dia inteiro que o modelo usa
                  // como fonte da verdade acima de 7 dias — um campo em % teria
                  // de arredondar para dias e devolver outro número ao sair.
                  controles && cicloEmDias ? (
                    <CampoDelta
                      id={`delta-ciclo-${cenario}`}
                      rotulo="Quantos dias a menos no ciclo de venda"
                      sinal="−"
                      sufixo="dias"
                      valor={controles.deltas.cicloDiasMenos}
                      max={cicloMax}
                      decimais={0}
                      onChange={(valor) => aplicar({ cicloDiasMenos: Math.round(valor) })}
                    />
                  ) : null,
                  leituraCiclo(linha.deltas),
                  Boolean(edicao),
                )}
                valor={
                  linha.parcelas.ganhoCicloAno === null
                    ? "—"
                    : formatBRL(linha.parcelas.ganhoCicloAno)
                }
                tom={linha.parcelas.ganhoCicloAno === null ? "neutro" : "positivo"}
              />
            </dl>

            {controles && ajustada ? (
              <button
                type="button"
                onClick={() => controles.edicao.onChange({ modo: "preset", cenario })}
                className={cn(
                  "-mt-1 inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full text-sm font-medium leading-5 sm:min-h-8",
                  "text-[var(--pf-brand,#2e63cd)] transition-colors hover:text-[var(--pf-brand-ink,#1e4a9e)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pf-brand,#2e63cd)]/35",
                )}
              >
                <ArrowUturnLeftIcon className="h-4 w-4" aria-hidden />
                Voltar ao {CENARIOS[cenario].label}
              </button>
            ) : null}

            {/* Sem ícone de "de onde saiu": as sete linhas desta grade têm as
                MESMAS fórmulas que o par Eficiência/Performance abre um bloco
                acima, e aqui elas apareceriam três vezes — uma por coluna. O
                que muda entre as colunas é o delta, e ele está escrito ao lado
                de cada alavanca. */}
            <dl className="flex flex-col gap-2 border-t border-[var(--pf-line-strong,#cbd5e1)] pt-4">
              <LinhaCompacta
                rotulo="Valor anual"
                valor={formatBRL(linha.valorAno)}
                tom="positivo"
              />
              <LinhaCompacta rotulo="Mensalidade" valor={formatBRL(precoMes)} />
            </dl>
          </div>
        );
      })}
    </div>
  );
}

/**
 * A ressalva dos três cenários, para a `SecaoResultado` a usar como descrição.
 * Era o parágrafo de FECHO do bloco e subiu para o cabeçalho junto com a da
 * decomposição (20/08/2026): a pessoa precisa saber que a eficiência é
 * invariante ANTES de comparar as três colunas — lida depois, "igual nos três"
 * já foi interpretada como erro de cálculo.
 */
export const DESCRICAO_CENARIOS =
  "Mesmos dados da sua operação nos três; só os deltas de melhoria mudam. " +
  "A eficiência é igual em todos — ela vem do caminho declarado, não do cenário.";

/** A mesma ressalva mais a instrução de uso, quando o bloco aceita edição. */
export const DESCRICAO_CENARIOS_EDITAVEL =
  `${DESCRICAO_CENARIOS} Escolha a coluna que quer usar, ou ajuste os deltas ` +
  "dela nos campos — os tetos do modelo continuam valendo.";
