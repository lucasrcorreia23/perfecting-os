"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { PASSO_INTROS } from "@/lib/calculadora/campos";
import { timesJaCompletos, timesParaCelebrar } from "@/lib/calculadora/celebracao";
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
import { formatBRL, formatPct } from "@/lib/calculadora/format";
import { compararCenarios } from "@/lib/calculadora/cenarios-comparacao";
import { perguntasCfo } from "@/lib/calculadora/faq";
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
import { CelebracaoModal } from "./celebracao-modal";
import { CenarioSliders } from "./cenario-sliders";
import { ConsolidadoView } from "./consolidado-view";
import { Disclaimer } from "./disclaimer";
import { CalculadoraFooter } from "./footer";
import { EnviarBar } from "./enviar-bar";
import { FaqPainel } from "./faq-cfo";
import { Glossario } from "./glossario";
import { CascataValor, ComparacaoCenarios } from "./graficos-resultado";
import { IntroScreen } from "./intro-screen";
import { PassoForm } from "./passo-form";
import { QuantoCusta } from "./quanto-custa";
import {
  AvisosCoerencia,
  EficienciaCard,
  HeroResultado,
  PerformanceCard,
  ResultadoIncompleto,
} from "./resultado-time";
import { SecaoResultado } from "./secao-resultado";
import { ResumoVerificavel } from "./resumo-verificavel";
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
  dataCalculo,
}: {
  token: string;
  estadoSalvo: EstadoCalculadora;
  clientName: string | null;
  expiresAt: string;
  submittedAt: string | null;
  // Carimbada no servidor (rota force-dynamic): `new Date()` aqui divergiria
  // entre SSR e hidratação.
  dataCalculo: string;
}) {
  const [estado, setEstado] = useState(estadoSalvo);
  const [glossarioAberto, setGlossarioAberto] = useState(false);
  // Os dois painéis dividem a mesma faixa de 360px: abrir um fecha o outro.
  const [faqAberto, setFaqAberto] = useState(false);
  // Preferência de UI, só da sessão: a calculadora não guarda nada no
  // dispositivo (o link é o estado), e recolher a sidebar não é dado do
  // cliente para entrar no autosave.
  const [sidebarAberta, setSidebarAberta] = useState(true);
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

  // O momento em que o número passa a existir. A semente roda no primeiro
  // render: quem volta com o link pronto entra com todos os times já vistos e
  // não é recebido por um modal a cada recarregamento (ver `celebracao.ts`).
  const timesVistos = useRef<string[]>(timesJaCompletos(prog));
  const [celebrandoTimeId, setCelebrandoTimeId] = useState<string | null>(null);

  useEffect(() => {
    // Quem fecha o último campo ainda está no passo 5: a comemoração espera a
    // tela de resultado, que é onde o número aparece.
    if (view.modo !== "resultado") return;
    const novos = timesParaCelebrar(timesVistos.current, prog);
    const time = modelo.times.find(
      (item) => novos.includes(item.id) && item.resultado.status === "ok",
    );
    if (!time) return;
    timesVistos.current = [...timesVistos.current, time.id];
    setCelebrandoTimeId(time.id);
    // `prog` e `modelo` são derivados de `estado` — depender do estado evita um
    // efeito que roda a cada render.
  }, [view.modo, estado]); // eslint-disable-line react-hooks/exhaustive-deps

  const timeCelebrado = celebrandoTimeId
    ? modelo.times.find((time) => time.id === celebrandoTimeId)
    : undefined;

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
  // Os três cenários com as MESMAS entradas (aba Scenario Comparison do
  // Excel). Null enquanto o time estiver incompleto — nunca faixa parcial.
  const comparacao = useMemo(
    () =>
      compararCenarios(
        timeModelo.entradas,
        timeModelo.proposta,
        timeModelo.precoMes,
        modelo.prazoMeses,
      ),
    [timeModelo.entradas, timeModelo.proposta, timeModelo.precoMes, modelo.prazoMeses],
  );
  // As objeções de CFO com os números deste link. Time incompleto ⇒ as
  // respostas existem sem número (nunca projeção parcial).
  const perguntas = useMemo(
    () =>
      perguntasCfo({
        resultado: timeModelo.resultado.status === "ok" ? timeModelo.resultado : null,
        entradas: timeModelo.entradas,
        proposta: timeModelo.proposta.assentos > 0 ? timeModelo.proposta : null,
        preco: modelo.preco,
        prazoMeses: modelo.prazoMeses,
        comparacao,
        multiTime,
      }),
    [timeModelo, modelo.preco, modelo.prazoMeses, comparacao, multiTime],
  );
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
          <span className="hidden items-center gap-2 text-xs text-slate-400 sm:flex" role="status">
            {autosave.status === "salvando"
              ? "Salvando…"
              : autosave.status === "erro"
                ? "Reconectando…"
                : autosave.salvoEm
                  ? "Salvo automaticamente"
                  : null}
            {autosave.status === "salvo" ? (
              <CheckCircleIcon className="h-4 w-4 text-trend-positive" aria-hidden />
            ) : null}
          </span>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          icon={QuestionMarkCircleIcon}
          onClick={() => {
            setGlossarioAberto(false);
            setFaqAberto(true);
          }}
        >
          Perguntas comuns
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={BookOpenIcon}
          onClick={() => {
            setFaqAberto(false);
            setGlossarioAberto(true);
          }}
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
        // Só o Glossário encolhe a página: ele é gaveta, e o formulário segue
        // editável ao lado. As Perguntas viraram MODAL — reservar a faixa de
        // 360px para elas empurrava a tela inteira para a esquerda ao abrir,
        // que é exatamente o salto que o overlay deveria evitar.
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
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
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

            <div className="fade-in-up flex flex-col gap-6 rounded-sm border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8">
              <div className="flex flex-col gap-2">
                {/* Sem selo de evidência nas etapas: a tela inteira é
                    formulário, o selo só repetiria "isto é um campo". A origem
                    volta a ser declarada onde há saída (sidebar, resultado). */}
                <h1 className="text-xl font-semibold text-slate-900">
                  {PASSO_INTROS[view.passo].titulo}
                </h1>
                <p className="text-sm leading-6 text-slate-500">
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
                  <Button
                    variant="primary"
                    icon={ArrowRightIcon}
                    iconPosition="right"
                    onClick={avancarWizard}
                  >
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

            {/* Recolher a sidebar devolve os 264px à leitura. Como a coluna do
                resultado é `@container`, a container query que decide o par
                Eficiência/Performance reflowa junto — o recolhimento paga em
                largura e em altura.

                A transição é só `lg:`: abaixo disso a coluna é `1fr` e a troca
                de layout vem da media query, que não se anima. */}
            <div
              className={cn(
                "grid grid-cols-1 gap-6",
                "lg:transition-[grid-template-columns] lg:duration-200 lg:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                // 4rem = 64px: o rail recolhido é só a seta, e 64px mantêm o
                // alvo de toque confortável sem devolver largura ao resultado.
                sidebarAberta ? "lg:grid-cols-[264px_1fr]" : "lg:grid-cols-[4rem_1fr]",
              )}
            >
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
                  aberta={sidebarAberta}
                  onToggle={() => setSidebarAberta((atual) => !atual)}
                />
              </div>

              {/* Quatro seções nomeadas, na ordem da decisão: resposta → como
                  se desenrola → de onde vem → quanto custa. A trajetória vem
                  logo depois do hero porque o convite a desenhar a curva
                  precisa chegar antes do cansaço.

                  Blocos principais empilhados com `gap-2` (8px): quase se
                  tocam, e o que os separa é a quebra de superfície, não a
                  distância. O container único que veio antes (`divide-y` com
                  `py-12` por faixa) punha 96px de vazio entre dois títulos —
                  respiro demais vira buraco. Quem faz hierarquia aqui é o
                  contorno do hero e a ordem, não o espaço. */}
              <div className="@container order-1 flex flex-col gap-2 lg:order-2">
                {timeModelo.resultado.status === "ok" ? (
                  <>
                    {/* Sem SecaoResultado: o hero é o topo da página e já traz o
                        próprio cabeçalho — "O resultado" era rótulo do rótulo. */}
                    <div className="flex flex-col gap-6">
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
                        // Traduz o múltiplo em vez de repetir os três números
                        // que estão logo acima (e o plano/assentos, que estão
                        // no chip ao lado): dito duas vezes, nenhum deles ganha
                        // peso — só custa uma linha a mais antes da checagem.
                        frase={`Cada R$ 1 investido devolve ${formatBRL(timeModelo.resultado.roi, 2)} em margem no primeiro ano.`}
                        // A conta inteira num balão: valor ÷ investimento, e
                        // de onde sai cada metade do numerador.
                        racional={`${formatBRL(timeModelo.resultado.valorAno)} de valor ÷ ${formatBRL(timeModelo.resultado.precoAno)} de investimento no ano. O valor soma ${formatBRL(timeModelo.resultado.eficienciaAno)} de eficiência (o custo do caminho que você declarou, limitado pelo teto do plano) e ${formatBRL(timeModelo.resultado.G)} de performance (ticket, conversão, rampa e ciclo, com desconto de 30% em três delas e cobertura de ${formatPct(timeModelo.resultado.cobertura * 100, 0)} dos vendedores).`}
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
                        checagem={{
                          pct: timeModelo.resultado.checagemRealidadePct,
                          alerta: timeModelo.resultado.checagemAlerta,
                        }}
                        tom="destaque"
                      />
                      <AvisosCoerencia avisos={timeModelo.resultado.avisos} />
                    </div>
                  </>
                ) : null}

                {timeModelo.resultado.status === "ok" ? (
                  <>
                    <SecaoResultado
                      id="ao-longo-de-12-meses"
                      titulo="Ao longo de 12 meses"
                      descricao="Editar a curva muda só a forma, nunca o ROI."
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

                    <SecaoResultado
                      id="de-onde-vem"
                      titulo="De onde vem o número"
                      descricao="As duas metades da soma."
                      divisor
                      // Quatro sub-tópicos (o par, a cascata, os parâmetros e a
                      // faixa dos cenários) na seção mais alta da página. Com o
                      // `gap-6` padrão eles ficavam à mesma distância uns dos
                      // outros que o título fica do primeiro — nenhuma cadência,
                      // e 1.700px de blocos de peso igual.
                      ritmo="amplo"
                    >
                      {/* Container query, não breakpoint de viewport: o que
                          decide se cabem duas colunas é a largura DESTA coluna
                          (a sidebar come 264px fixos). Com `xl:` a seção mais
                          alta da página empilhava em qualquer janela abaixo de
                          1280px, dobrando de altura sem necessidade.

                          Fio no vão, não `divide-x`: o gap vai a zero e cada
                          coluna paga o próprio `p*-10`, então o fio fica no meio
                          dos 80px em vez de colado na segunda coluna. Empilhado
                          ele some — dois blocos em sequência já se separam pelo
                          gap, e uma régua horizontal ali competiria com o fio do
                          cabeçalho logo acima. */}
                      <div className="grid grid-cols-1 gap-8 @3xl:grid-cols-2 @3xl:gap-0">
                        <div className="@3xl:pr-10">
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
                        </div>
                        <div className="@3xl:border-l @3xl:border-slate-100 @3xl:pl-10">
                          <PerformanceCard
                            resultado={timeModelo.resultado}
                            entradas={timeModelo.entradas}
                          />
                        </div>
                      </div>
                      <CascataValor resultado={timeModelo.resultado} />
                      <CenarioSliders
                        sel={timeModelo.sel}
                        entradas={timeModelo.entradas}
                        onChange={(sel) => setCenario(timeAtualId, sel)}
                      />
                      {comparacao ? (
                        <ComparacaoCenarios
                          linhas={comparacao}
                          precoAno={timeModelo.resultado.precoAno}
                          cenarioAtivo={
                            timeModelo.sel.modo === "preset"
                              ? timeModelo.sel.cenario
                              : timeModelo.sel.base
                          }
                          personalizado={timeModelo.sel.modo === "personalizado"}
                        />
                      ) : null}
                    </SecaoResultado>
                  </>
                ) : (
                  // Sem título de seção: o gating já se explica sozinho, e
                  // inventar um cabeçalho aqui seria informação nova. O bloco
                  // paga a própria superfície, como as seções ao lado.
                  <div className="rounded-md border border-slate-200 bg-white p-6 sm:p-8">
                    <ResultadoIncompleto
                      faltando={timeModelo.resultado.faltando}
                      onIrParaPasso={(passo) => irParaWizard(timeAtualId, passo)}
                    />
                  </div>
                )}

                <SecaoResultado
                  id="quanto-custa"
                  titulo="Quanto custa"
                  descricao="Plano, assentos e prazo recalculam o número acima na hora."
                >
                  <QuantoCusta
                    times={modelo.times}
                    preco={modelo.preco}
                    prazoMeses={modelo.prazoMeses}
                    onChangePlano={(timeId, plano) => setProposta(timeId, { plano })}
                    onChangeAssentos={(timeId, assentos) =>
                      setProposta(timeId, { assentos })
                    }
                    onChangePrazo={setPrazo}
                  />
                </SecaoResultado>

                <ResumoVerificavel
                  preco={modelo.preco}
                  prazoMeses={modelo.prazoMeses}
                  times={modelo.times}
                  consolidado={modelo.consolidado}
                  dataCalculo={dataCalculo}
                />

                {/* Só quando o Resumo não renderiza: ele traz o próprio
                    disclaimer, e é o único bloco que a impressão enxerga. */}
                {modelo.consolidado.status !== "ok" ? (
                  <div className="px-6 pt-2">
                    <Disclaimer />
                  </div>
                ) : null}
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
      <FaqPainel
        open={faqAberto}
        onClose={() => setFaqAberto(false)}
        perguntas={perguntas}
      />

      {/* `key` no time: cada comemoração é uma montagem nova, e a contagem
          começa do zero sem herdar o número da anterior. */}
      {timeCelebrado && timeCelebrado.resultado.status === "ok" ? (
        <CelebracaoModal
          key={timeCelebrado.id}
          open
          onClose={() => setCelebrandoTimeId(null)}
          nomeTime={timeCelebrado.nome}
          multiTime={multiTime}
          roi={timeCelebrado.resultado.roi}
          paybackMeses={timeCelebrado.resultado.paybackMeses}
          valorAno={timeCelebrado.resultado.valorAno}
        />
      ) : null}

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
