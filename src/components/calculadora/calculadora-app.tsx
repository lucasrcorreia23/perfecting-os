"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { PASSO_INTROS } from "@/lib/calculadora/campos";
import {
  CENARIOS,
  MAX_TIMES,
  PLANOS,
  RECONCILIACAO_TOLERANCIA,
} from "@/lib/calculadora/constants";
import {
  PASSOS,
  passoCompleto,
  progresso,
  sanitizarNomeTime,
  timeVazio,
} from "@/lib/calculadora/estado";
import { formatBRL, formatMeses } from "@/lib/calculadora/format";
import { computarModelo } from "@/lib/calculadora/modelo";
import { reReconciliar } from "@/lib/calculadora/trajetoria";
import { aplicarEstrutura, estruturaAtiva, estruturaVazia } from "@/lib/calculadora/estrutura";
import type {
  CampoId,
  CenarioSelecionado,
  EntradasTime,
  EstadoCalculadora,
  EstadoTime,
  EstruturaCompartilhada,
  PropostaTime,
} from "@/lib/calculadora/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { CenarioSliders } from "./cenario-sliders";
import { ConsolidadoView } from "./consolidado-view";
import { Disclaimer } from "./disclaimer";
import { CalculadoraFooter } from "./footer";
import { EnviarBar } from "./enviar-bar";
import { Glossario } from "./glossario";
import { IntroScreen } from "./intro-screen";
import { PassoForm } from "./passo-form";
import { QuantoCusta } from "./quanto-custa";
import {
  AvisosCoerencia,
  ChecagemRealidade,
  EficienciaCard,
  EquacaoValor,
  HeroResultado,
  PerformanceCard,
  ResultadoIncompleto,
} from "./resultado-time";
import { SecaoResultado } from "./secao-resultado";
import { ResumoVerificavel } from "./resumo-verificavel";
import { SeloEvidencia } from "./selo-evidencia";
import { SeusNumerosSidebar } from "./seus-numeros-sidebar";
import { StepperNav } from "./stepper-nav";
import { TopProgress } from "./top-progress";
import { PaineisTrajetoria } from "./trajetoria-panel";
import { useAutosave } from "./use-autosave";

type View =
  | { modo: "intro" }
  | { modo: "wizard"; timeId: string; passo: 1 | 2 | 3 | 4 | 5 }
  | { modo: "resultado" };

function primeiroPassoIncompleto(estado: EstadoCalculadora): {
  timeId: string;
  passo: 1 | 2 | 3 | 4 | 5;
} {
  for (const time of estado.times) {
    for (const passo of PASSOS) {
      if (passo.opcional) continue;
      if (!passoCompleto(time.entradas, passo.id)) {
        return { timeId: time.id, passo: passo.id };
      }
    }
  }
  return { timeId: estado.times[0].id, passo: 1 };
}

export function CalculadoraApp({
  token,
  estadoSalvo,
  clientName,
  expiresAt,
  submittedAt,
}: {
  token: string;
  estadoSalvo: EstadoCalculadora;
  clientName: string | null;
  expiresAt: string;
  submittedAt: string | null;
}) {
  const [estado, setEstado] = useState(estadoSalvo);
  const [glossarioAberto, setGlossarioAberto] = useState(false);
  const [timeAtivoId, setTimeAtivoId] = useState(estadoSalvo.times[0].id);
  const [removendoTime, setRemovendoTime] = useState<EstadoTime | null>(null);

  // Estado derivado (§4.11): com a estrutura compartilhada ativa, cada time já
  // carrega a fatia que lhe cabe. Serve para LER — gating, progresso, stepper.
  // As mutações continuam no estado cru, que é o que se persiste.
  const estadoDerivado = useMemo(() => aplicarEstrutura(estado), [estado]);

  const prog = useMemo(() => progresso(estado), [estado]);
  // Quantas etapas cada time já fechou — detalhe do hover na barra do topo.
  const progressoPorTime = useMemo(
    () =>
      estadoDerivado.times.map((time) => ({
        id: time.id,
        nome: time.nome,
        etapas: PASSOS.filter((passo) => passoCompleto(time.entradas, passo.id)).length,
        totalEtapas: PASSOS.length,
      })),
    [estadoDerivado.times],
  );
  const tudoCompleto = prog.porTime.every((time) => time.completo);

  const [view, setView] = useState<View>(() => {
    if (tudoCompleto && prog.preenchidos > 0) return { modo: "resultado" };
    return { modo: "intro" };
  });

  const modelo = useMemo(() => computarModelo(estado), [estado]);
  const autosave = useAutosave({
    token,
    estado,
    ativo: true,
    submittedAtInicial: submittedAt,
  });

  // -------------------------------------------------------------------------
  // Mutações do estado (o visitante é dono dos times e da proposta)
  // -------------------------------------------------------------------------

  const patchTime = useCallback((timeId: string, patch: Partial<EstadoTime>) => {
    setEstado((atual) => ({
      ...atual,
      times: atual.times.map((time) =>
        time.id === timeId ? { ...time, ...patch } : time,
      ),
    }));
  }, []);

  const setCampo = useCallback(
    (timeId: string, campo: CampoId, valor: EntradasTime[CampoId]) => {
      setEstado((atual) => ({
        ...atual,
        times: atual.times.map((time) =>
          time.id === timeId
            ? { ...time, entradas: { ...time.entradas, [campo]: valor } }
            : time,
        ),
      }));
    },
    [],
  );

  const setCenario = useCallback(
    (timeId: string, sel: CenarioSelecionado) => patchTime(timeId, { cenarioSel: sel }),
    [patchTime],
  );

  const setTrajetoria = useCallback(
    (timeId: string, g: number[] | null) =>
      patchTime(timeId, { trajetoria: g ? { editada: g } : undefined }),
    [patchTime],
  );

  const setProposta = useCallback(
    (timeId: string, patch: Partial<PropostaTime>) => {
      setEstado((atual) => ({
        ...atual,
        times: atual.times.map((time) =>
          time.id === timeId
            ? { ...time, proposta: { ...time.proposta, ...patch } }
            : time,
        ),
      }));
    },
    [],
  );

  const setPrazo = useCallback((prazoMeses: number) => {
    setEstado((atual) => ({ ...atual, prazoMeses }));
  }, []);

  // Estrutura compartilhada (§4.11): estado da CONTA, editável de qualquer time.
  // Ao ligar pela primeira vez, semeia com o que o time atual já declarou — o
  // visitante não redigita o que acabou de preencher.
  const setEstrutura = useCallback(
    (patch: Partial<EstruturaCompartilhada>) => {
      setEstado((atual) => {
        const base = atual.estrutura ?? estruturaVazia();
        const semeia =
          patch.ativa === true && !base.ativa
            ? (() => {
                const doTime =
                  atual.times.find((time) => time.id === timeAtivoId)?.entradas ??
                  atual.times[0].entradas;
                return {
                  numGestoresTreino: base.numGestoresTreino ?? doTime.numGestoresTreino,
                  horasTreinoGestorMes:
                    base.horasTreinoGestorMes ?? doTime.horasTreinoGestorMes,
                  vendedoresPorGestorMes:
                    base.vendedoresPorGestorMes ?? doTime.vendedoresPorGestorMes,
                  salarioGestor: base.salarioGestor ?? doTime.salarioGestor,
                  caminho: base.caminho ?? doTime.caminho,
                  custoExternoAno: base.custoExternoAno ?? doTime.custoExternoAno,
                  custoEventoAno: base.custoEventoAno ?? doTime.custoEventoAno,
                };
              })()
            : null;
        return { ...atual, estrutura: { ...base, ...semeia, ...patch } };
      });
    },
    [timeAtivoId],
  );

  const addTime = useCallback((): string | null => {
    if (estado.times.length >= MAX_TIMES) return null;
    // Criado fora do updater para o id ficar disponível de forma síncrona
    // (navegar direto para o passo 1 do time novo).
    const novo = timeVazio(`Time ${estado.times.length + 1}`);
    setEstado((atual) =>
      atual.times.length >= MAX_TIMES
        ? atual
        : { ...atual, times: [...atual.times, novo] },
    );
    return novo.id;
  }, [estado.times.length]);

  const removeTime = useCallback(
    (timeId: string) => {
      setEstado((atual) => {
        if (atual.times.length <= 1) return atual;
        const restantes = atual.times.filter((time) => time.id !== timeId);
        return { ...atual, times: restantes };
      });
      setTimeAtivoId((ativo) => {
        if (ativo !== timeId) return ativo;
        const restante = estado.times.find((time) => time.id !== timeId);
        return restante?.id ?? ativo;
      });
      setView((atual) =>
        atual.modo === "wizard" && atual.timeId === timeId ? { modo: "resultado" } : atual,
      );
    },
    [estado.times],
  );

  // -------------------------------------------------------------------------

  const timeAtualId =
    view.modo === "wizard" && estado.times.some((t) => t.id === view.timeId)
      ? view.timeId
      : estado.times.some((t) => t.id === timeAtivoId)
        ? timeAtivoId
        : estado.times[0].id;
  const timeModelo =
    modelo.times.find((time) => time.id === timeAtualId) ?? modelo.times[0];
  const multiTime = estado.times.length > 1;
  const estrutura = estado.estrutura ?? estruturaVazia();
  const vendedoresDaConta = estado.times.reduce(
    (total, time) => total + (time.entradas.numVendedores ?? 0),
    0,
  );
  // Último passo do último time: aqui "Continuar" já é "Ver resultado".
  const fimDoWizard =
    view.modo === "wizard" &&
    view.passo === 5 &&
    estado.times.findIndex((time) => time.id === timeAtualId) ===
      estado.times.length - 1;

  function irParaWizard(timeId: string, passo: 1 | 2 | 3 | 4 | 5) {
    setTimeAtivoId(timeId);
    setView({ modo: "wizard", timeId, passo });
  }

  function avancarWizard() {
    if (view.modo !== "wizard") return;
    if (view.passo < 5) {
      setView({ modo: "wizard", timeId: view.timeId, passo: (view.passo + 1) as 2 | 3 | 4 | 5 });
      return;
    }
    const indice = estado.times.findIndex((time) => time.id === view.timeId);
    const proximo = estado.times[indice + 1];
    if (proximo) {
      irParaWizard(proximo.id, 1);
    } else {
      setTimeAtivoId(estado.times[0].id);
      setView({ modo: "resultado" });
    }
  }

  function voltarWizard() {
    if (view.modo !== "wizard") return;
    if (view.passo > 1) {
      setView({ modo: "wizard", timeId: view.timeId, passo: (view.passo - 1) as 1 | 2 | 3 | 4 });
      return;
    }
    const indice = estado.times.findIndex((time) => time.id === view.timeId);
    const anterior = estado.times[indice - 1];
    if (anterior) setView({ modo: "wizard", timeId: anterior.id, passo: 5 });
    else setView({ modo: "intro" });
  }

  // Trajetória salva re-reconciliada quando o G mudou entre sessões/edições —
  // preserva a forma e avisa (§8).
  const trajetoriaInfo = useMemo(() => {
    if (!timeModelo || timeModelo.resultado.status !== "ok") {
      return { g: null, ajustada: false };
    }
    const editada = timeModelo.estadoTime.trajetoria?.editada ?? null;
    if (!editada) return { g: null, ajustada: false };
    const soma = editada.reduce((total, ponto) => total + ponto, 0);
    const G = timeModelo.resultado.G;
    if (Math.abs(soma - G) <= Math.max(RECONCILIACAO_TOLERANCIA, G * 1e-9)) {
      return { g: editada, ajustada: false };
    }
    const margemAnual = timeModelo.resultado.margemMensalAtual * 12;
    return { g: reReconciliar(editada, G, margemAnual).pontos, ajustada: true };
  }, [timeModelo]);

  // -------------------------------------------------------------------------

  const header = (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Image
          src="/logotipo.svg"
          alt="Perfecting"
          width={224}
          height={36}
          priority
          className="h-6 w-auto"
        />
        <span className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden />
        <span className="hidden text-xs text-slate-400 sm:block">Calculadora de ROI</span>
      </div>
      <div className="flex items-center gap-2">
        {view.modo !== "intro" ? (
          <span className="hidden items-center gap-1.5 text-xs text-slate-400 sm:flex" role="status">
            {autosave.status === "salvando"
              ? "Salvando…"
              : autosave.status === "erro"
                ? "Reconectando…"
                : autosave.salvoEm
                  ? "Salvo automaticamente"
                  : null}
            {autosave.status === "salvo" ? (
              <CheckCircleIcon className="h-4 w-4 text-[#0F9F2E]" aria-hidden />
            ) : null}
          </span>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          icon={BookOpenIcon}
          onClick={() => setGlossarioAberto(true)}
        >
          Glossário
        </Button>
      </div>
    </header>
  );

  return (
    <main
      className={cn(
        "page-fade-in flex min-h-[100dvh] flex-col bg-[#f3f6fc] transition-[padding] duration-300",
        // O glossário é painel lateral: em telas grandes a página encolhe em
        // vez de ser coberta, para o formulário seguir editável ao lado.
        glossarioAberto && "sm:pr-[360px]",
      )}
    >
      {view.modo !== "intro" ? (
        <TopProgress
          preenchidos={prog.preenchidos}
          total={prog.total}
          times={progressoPorTime}
        />
      ) : null}
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
        {header}

        {view.modo === "intro" ? (
          <div className="flex flex-1 items-center justify-center py-10">
            <IntroScreen
              clientName={clientName}
              expiresAt={expiresAt}
              temProgresso={prog.preenchidos > 0}
              onComecar={() => {
                if (tudoCompleto) {
                  setView({ modo: "resultado" });
                } else {
                  const posicao = primeiroPassoIncompleto(estadoDerivado);
                  irParaWizard(posicao.timeId, posicao.passo);
                }
              }}
            />
          </div>
        ) : null}

        {view.modo === "wizard" ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[264px_1fr]">
            <div className="lg:sticky lg:top-8 lg:self-start">
              <StepperNav
                times={estadoDerivado.times}
                timeAtual={timeAtualId}
                passoAtual={view.passo}
                onIrPara={irParaWizard}
                onAddTime={() => {
                  const novoId = addTime();
                  if (novoId) irParaWizard(novoId, 1);
                }}
                onRemoverTime={multiTime ? (time) => setRemovendoTime(time) : undefined}
                podeAdicionar={estado.times.length < MAX_TIMES}
              />
            </div>

            <div className="fade-in-up flex flex-col gap-5 rounded-md border border-slate-200/80 bg-white p-5 shadow-[var(--shadow-sm)] sm:p-8">
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl font-semibold text-slate-900">
                    {PASSO_INTROS[view.passo].titulo}
                  </h1>
                  {/* Invariante 5: todo campo declara a origem. Vale para o
                      passo inteiro — tudo aqui é digitado pelo cliente (P4). */}
                  <SeloEvidencia selo="dado_do_cliente" />
                </div>
                <p className="text-sm leading-relaxed text-slate-500">
                  {PASSO_INTROS[view.passo].texto}
                </p>
              </div>

              {/* Entradas CRUAS aqui: o formulário edita o que se persiste. As
                  derivadas (rateadas) alimentam só o resultado. */}
              <PassoForm
                passo={view.passo}
                entradas={timeModelo.estadoTime.entradas}
                onChange={(campo, valor) => setCampo(timeAtualId, campo, valor)}
                multiTime={multiTime}
                estrutura={estrutura}
                onChangeEstrutura={setEstrutura}
                vendedoresDaConta={vendedoresDaConta}
              />

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                <Button variant="secondary" icon={ArrowLeftIcon} onClick={voltarWizard}>
                  Voltar
                </Button>
                <div className="flex items-center gap-3">
                  {/* Atalho para sair do wizard antes do fim; some quando o
                      próprio botão primário já é "Ver resultado". */}
                  {tudoCompleto && !fimDoWizard ? (
                    <Button
                      variant="tertiary"
                      onClick={() => {
                        setTimeAtivoId(timeAtualId);
                        setView({ modo: "resultado" });
                      }}
                    >
                      Ver resultado
                    </Button>
                  ) : null}
                  <Button variant="primary" icon={ArrowRightIcon} onClick={avancarWizard}>
                    {fimDoWizard ? "Ver resultado" : "Continuar"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {view.modo === "resultado" ? (
          <div className="flex flex-col gap-6">
            {multiTime ? (
              <ConsolidadoView
                consolidado={modelo.consolidado}
                times={modelo.times}
                timeAtivo={timeAtualId}
                onSelecionarTime={setTimeAtivoId}
                onAddTime={() => {
                  const novoId = addTime();
                  if (novoId) irParaWizard(novoId, 1);
                }}
                podeAdicionar={estado.times.length < MAX_TIMES}
              />
            ) : null}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
              <div className="order-2 lg:order-1 lg:sticky lg:top-8 lg:self-start">
                <SeusNumerosSidebar
                  nome={timeModelo.nome}
                  multiTime={multiTime}
                  entradas={timeModelo.estadoTime.entradas}
                  estrutura={estrutura}
                  onChangeEstrutura={setEstrutura}
                  onChange={(campo, valor) => setCampo(timeAtualId, campo, valor)}
                  onChangeNome={(nome) =>
                    patchTime(timeAtualId, { nome: sanitizarNomeTime(nome, "Time") })
                  }
                  onVoltarAoPassoAPasso={() => irParaWizard(timeAtualId, 1)}
                  onRemoverTime={
                    multiTime
                      ? () => setRemovendoTime(timeModelo.estadoTime)
                      : undefined
                  }
                  onAddTime={
                    estado.times.length < MAX_TIMES && !multiTime
                      ? () => {
                          const novoId = addTime();
                          if (novoId) irParaWizard(novoId, 1);
                        }
                      : undefined
                  }
                />
              </div>

              {/* Quatro seções nomeadas, na ordem da decisão: resposta → de
                  onde vem → quanto custa → como se desenrola. gap-10 ENTRE
                  seções contra gap-4 dentro: é o contraste que dá o desenho. */}
              <div className="order-1 flex flex-col gap-10 lg:order-2">
                {timeModelo.resultado.status === "ok" ? (
                  <>
                    <SecaoResultado titulo="O resultado">
                      <HeroResultado
                        titulo={
                          multiTime
                            ? `${timeModelo.nome}: ROI potencial com a Perfecting`
                            : "Seu ROI potencial com a Perfecting"
                        }
                        roi={timeModelo.resultado.roi}
                        paybackMeses={timeModelo.resultado.paybackMeses}
                        valorAno={timeModelo.resultado.valorAno}
                        precoAno={timeModelo.resultado.precoAno}
                        frase={`Com ${timeModelo.proposta.assentos} assentos no plano ${PLANOS[timeModelo.proposta.plano].label}, a projeção é de ${formatBRL(timeModelo.resultado.valorAno)} de retorno em 12 meses sobre ${formatBRL(timeModelo.resultado.precoMes)}/mês de investimento, com payback em ${formatMeses(timeModelo.resultado.paybackMeses)}.`}
                        chips={[
                          {
                            label:
                              timeModelo.sel.modo === "preset"
                                ? `Cenário ${CENARIOS[timeModelo.sel.cenario].label}`
                                : "Parâmetros personalizados",
                            href: "#de-onde-vem",
                          },
                          {
                            label: `${PLANOS[timeModelo.proposta.plano].label} · ${timeModelo.proposta.assentos} assentos · ${modelo.prazoMeses} meses`,
                            href: "#quanto-custa",
                          },
                        ]}
                      />
                      <AvisosCoerencia avisos={timeModelo.resultado.avisos} />
                      <ChecagemRealidade resultado={timeModelo.resultado} />
                    </SecaoResultado>

                    <SecaoResultado
                      id="de-onde-vem"
                      titulo="De onde vem o número"
                      descricao="As duas óticas do modelo: o que você deixa de gastar e o que o time passa a ganhar."
                    >
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <EficienciaCard
                          resultado={timeModelo.resultado}
                          entradas={timeModelo.entradas}
                          plano={timeModelo.proposta.plano}
                          rateio={
                            estruturaAtiva(estado)
                              ? {
                                  gestoresDaConta: estrutura.numGestoresTreino,
                                  pctVendedores:
                                    vendedoresDaConta > 0
                                      ? (timeModelo.estadoTime.entradas.numVendedores ?? 0) /
                                        vendedoresDaConta
                                      : 0,
                                }
                              : null
                          }
                        />
                        <PerformanceCard
                          resultado={timeModelo.resultado}
                          entradas={timeModelo.entradas}
                        />
                      </div>
                      <EquacaoValor resultado={timeModelo.resultado} />
                      <CenarioSliders
                        sel={timeModelo.sel}
                        entradas={timeModelo.entradas}
                        onChange={(sel) => setCenario(timeAtualId, sel)}
                      />
                    </SecaoResultado>
                  </>
                ) : (
                  <ResultadoIncompleto
                    faltando={timeModelo.resultado.faltando}
                    onIrParaPasso={(passo) => irParaWizard(timeAtualId, passo)}
                  />
                )}

                <SecaoResultado
                  id="quanto-custa"
                  titulo="Quanto custa"
                  descricao="A proposta é sua: plano, assentos e prazo mudam o número acima na hora."
                >
                  <QuantoCusta
                    times={modelo.times}
                    preco={modelo.preco}
                    prazoMeses={modelo.prazoMeses}
                    onChangePlano={(timeId, plano) => setProposta(timeId, { plano })}
                    onChangeAssentos={(timeId, assentos) => setProposta(timeId, { assentos })}
                    onChangePrazo={setPrazo}
                  />
                </SecaoResultado>

                {timeModelo.resultado.status === "ok" ? (
                  <SecaoResultado
                    titulo="Ao longo de 12 meses"
                    descricao="Editar a curva não muda ROI, payback nem o valor do ano — só a forma."
                  >
                    <PaineisTrajetoria
                      margemMensalAtual={timeModelo.resultado.margemMensalAtual}
                      G={timeModelo.resultado.G}
                      valorAno={timeModelo.resultado.valorAno}
                      precoAno={timeModelo.resultado.precoAno}
                      eficienciaAno={timeModelo.resultado.eficienciaAno}
                      editada={trajetoriaInfo.g}
                      onEditar={(g) => setTrajetoria(timeAtualId, g)}
                      nota={
                        trajetoriaInfo.ajustada
                          ? "Suas premissas mudaram desde a última edição, então a curva foi re-reconciliada preservando a forma que você desenhou."
                          : null
                      }
                    />
                  </SecaoResultado>
                ) : null}

                <ResumoVerificavel
                  preco={modelo.preco}
                  prazoMeses={modelo.prazoMeses}
                  times={modelo.times}
                  consolidado={modelo.consolidado}
                />

                <Disclaimer />
              </div>
            </div>

            <EnviarBar
              autosaveStatus={autosave.status}
              salvoEm={autosave.salvoEm}
              submittedAt={autosave.submittedAt}
              completo={tudoCompleto}
              onEnviar={autosave.enviar}
            />
          </div>
        ) : null}
      </div>

      <CalculadoraFooter />

      <Glossario open={glossarioAberto} onClose={() => setGlossarioAberto(false)} />

      <ConfirmModal
        open={removendoTime !== null}
        onClose={() => setRemovendoTime(null)}
        tone="warning"
        title="Remover time"
        description={`O time ${removendoTime?.nome ?? ""} e tudo que foi preenchido nele saem da simulação.`}
        confirmLabel="Remover"
        onConfirm={() => {
          if (removendoTime) removeTime(removendoTime.id);
          setRemovendoTime(null);
        }}
      />
    </main>
  );
}
