"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  BookOpenIcon,
  CheckCircleIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { metasCase } from "@/lib/calculadora/business-case";
import { PASSO_INTROS } from "@/lib/calculadora/campos";
import { timesJaCompletos, timesParaCelebrar } from "@/lib/calculadora/celebracao";
import {
  CENARIOS,
  MAX_ASSENTOS,
  MAX_TIMES,
  PLANO_DEFAULT,
  RECONCILIACAO_TOLERANCIA,
} from "@/lib/calculadora/constants";
import {
  PASSOS,
  PASSO_OPCIONAL,
  ULTIMO_PASSO,
  passoCompleto,
  progresso,
  timeVazio,
} from "@/lib/calculadora/estado";
import { compararCenarios, linhaDoResultado } from "@/lib/calculadora/cenarios-comparacao";
import { perguntasCfo } from "@/lib/calculadora/faq";
import { computarModelo } from "@/lib/calculadora/modelo";
import { reReconciliar } from "@/lib/calculadora/trajetoria";
import {
  aplicarEstrutura,
  estruturaAtiva,
  estruturaVazia,
} from "@/lib/calculadora/estrutura";
import { fundirPremissas, PREMISSAS_PADRAO, serializarPremissas, type PremissasRacional } from "@/lib/calculadora/premissas";
import type {
  CampoId,
  CenarioSelecionado,
  EntradasTime,
  EstadoCalculadora,
  EstadoTime,
  EstruturaCompartilhada,
  PassoId,
  PlanoId,
  PropostaTime,
} from "@/lib/calculadora/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { CapaResultado } from "./capa-resultado";
import { AbasEscopo } from "./abas-escopo";
import { AbaRacional } from "./aba-racional";
import { BotaoFormulas } from "./botao-formulas";
import { CustoInacao } from "./custo-inacao";
import { EtapaAvancada } from "./etapa-avancada";
import { EtapaMensalidade } from "./etapa-mensalidade";
import { FechoRelatorio } from "./fecho-relatorio";
import { EtapasNav, etapasLiberadas, type EtapaId } from "./etapas-nav";
import { CaseSucesso } from "./case-sucesso";
import { CalculadoraFooter } from "./footer";
import { FaqPainel } from "./faq-cfo";
import { Glossario } from "./glossario";
import {
  ComparacaoCenarios,
  DESCRICAO_CENARIOS_EDITAVEL,
} from "./comparacao-cenarios";
import { InvestimentoVsRetorno } from "./graficos-resultado";
import { PassoForm } from "./passo-form";
import { PerguntaCard } from "./pergunta-card";
import { PerguntaProposta } from "./pergunta-proposta";
import { ProcessandoResultado } from "./processando-resultado";
import { TimesSidebar } from "./times-sidebar";
import { QuantoCusta } from "./quanto-custa";
import {
  AvisosCoerencia,
  EficienciaCard,
  PerformanceCard,
  ResultadoIncompleto,
} from "./resultado-time";
import { GrupoRelatorio, SecaoResultado } from "./secao-resultado";
import {
  errosPorCampo,
  resumoDoErro,
  validarPasso,
  type ErroCampo,
} from "@/lib/calculadora/validacao-passo";
import { PaineisTrajetoria } from "./trajetoria-panel";
import { useAutosave } from "./use-autosave";
import { PremissasProvider } from "./premissas-context";

// A jornada em três etapas (21/08/2026; eram quatro desde 20/08).
//
// Antes: `intro` → um wizard de cinco passos com stepper de times à esquerda →
// `resultado`, uma pilha de dez blocos com a sidebar "Dados preenchidos" ao lado
// editando valores ao vivo. Agora: mensalidade → oito perguntas → relatório
// (capa, cálculo detalhado e o fecho que sai da tela), com as três etapas
// sempre visíveis e navegáveis no cabeçalho.
//
// (f) A ETAPA 04 "EXPORTAR & FAQ" SAIU (21/08/2026, decisão do decisor). O
//     relatório é o fim da jornada. O que ela carregava e não podia sumir com
//     ela desceu para o fim da etapa 03 (`FechoRelatorio`): o
//     `ResumoVerificavel`, que é o único bloco que a impressão enxerga, e a
//     `EnviarBar`, que é o envio da proposta. O FAQ inline não veio junto — ele
//     já existe no modal do cabeçalho, de onde é alcançável em qualquer etapa.
//
// Três mudanças estruturais que decorrem disso, e que valem registro:
//
// (a) A SIDEBAR "DADOS PREENCHIDOS" SAIU DO RELATÓRIO. Ela era o único jeito de
//     mexer num número sem refazer o caminho — e também a razão de a coluna do
//     resultado ter 264px a menos. Quem edita agora é o próprio quiz,
//     alcançável pela etapa 02 no cabeçalho. O que NÃO saiu é o mapa de times
//     à esquerda do QUIZ (`TimesSidebar`): ali ele não disputa espaço com um
//     resultado, e é o único lugar de onde se enxerga o preenchimento de todos
//     os times de uma vez.
//
// (b) O RECÁLCULO AO VIVO SAIU DO RESULTADO. Cenário, plano e prazo se escolhem
//     na pergunta 8; assentos e o ajuste fino de deltas, na etapa avançada. No
//     relatório, "Quanto custa" é leitura. O número parou de se mexer debaixo de
//     quem está lendo.
//
// (c) OS TIMES MIGRARAM PARA A ETAPA AVANÇADA. O stepper lateral montava um mapa
//     de times × passos ao lado de todas as perguntas para o caso comum de UM
//     time — que é o que o próprio `TIMES_HELP` diz ser o normal.

// (d) O RELATÓRIO É UMA CAPA SÓ. Ele já foi duas abas — "Capa" e "Cálculo
//     detalhado" — e a segunda abria com um hero que repetia, em outro desenho,
//     os quatro números que a capa acabara de dar. Uma decisão a menos para
//     quem lê: a capa responde, e o cálculo continua logo abaixo, na mesma
//     rolagem. `HeroResultado` sobrevive em `link-detail`, que é a tela interna.
//
// (e) ENTRE O QUIZ E O RELATÓRIO EXISTE UMA TELA. Era um modal de comemoração
//     — o número aparecia atrás dele e a pessoa fechava uma janela para chegar
//     ao próprio resultado. Agora é `ProcessandoResultado`, que não pede clique
//     e entrega o relatório sozinha.

type ViewVisitante =
  | { modo: "mensalidade" }
  | { modo: "quiz"; timeId: string; pergunta: PassoId }
  | { modo: "avancado" }
  | { modo: "processando"; timeId: string }
  | { modo: "relatorio" };

type View = ViewVisitante | { modo: "racional"; voltar: ViewVisitante };

const ETAPA_DA_VIEW: Record<ViewVisitante["modo"], EtapaId> = {
  mensalidade: "mensalidade",
  quiz: "quiz",
  avancado: "quiz",
  // A tela de processamento já é o relatório do ponto de vista da régua: quem
  // está nela terminou o quiz e não pode ver a etapa 03 recuar para "quiz".
  processando: "relatorio",
  relatorio: "relatorio",
};

function etapaDaView(view: View): EtapaId {
  if (view.modo === "racional") return ETAPA_DA_VIEW[view.voltar.modo];
  return ETAPA_DA_VIEW[view.modo];
}

function primeiraPerguntaIncompleta(estado: EstadoCalculadora): {
  timeId: string;
  pergunta: PassoId;
} {
  for (const time of estado.times) {
    for (const passo of PASSOS) {
      if (passo.opcional || passo.campos.length === 0) continue;
      if (!passoCompleto(time.entradas, passo.id)) {
        return { timeId: time.id, pergunta: passo.id };
      }
    }
  }
  return { timeId: estado.times[0].id, pergunta: 1 };
}

export function CalculadoraApp({
  token,
  estadoSalvo,
  clientName,
  expiresAt,
  submittedAt,
  dataCalculo,
  internoLogado = false,
  premissasSalvas = null,
}: {
  token: string;
  estadoSalvo: EstadoCalculadora;
  clientName: string | null;
  expiresAt: string;
  submittedAt: string | null;
  // Carimbada no servidor (rota force-dynamic): `new Date()` aqui divergiria
  // entre SSR e hidratação.
  dataCalculo: string;
  internoLogado?: boolean;
  premissasSalvas?: unknown;
}) {
  const [estado, setEstado] = useState(estadoSalvo);
  const [glossarioAberto, setGlossarioAberto] = useState(false);
  const [faqAberto, setFaqAberto] = useState(false);
  const [timeAtivoId, setTimeAtivoId] = useState(estadoSalvo.times[0].id);
  const [removendoTime, setRemovendoTime] = useState<EstadoTime | null>(null);
  // De quem fala a CAPA (`AbasEscopo`): a conta inteira ou o time ativo. Só a
  // capa muda — os capítulos abaixo são sempre do time ativo, e por isso a aba
  // de um time troca o time ativo junto. Começa no consolidado, que era o que a
  // capa mostrava antes de existir escolha.
  const [capaConsolidada, setCapaConsolidada] = useState(true);

  // Estado derivado (§4.11): com a estrutura compartilhada ativa, cada time já
  // carrega a fatia que lhe cabe. Serve para LER — gating, progresso.
  // As mutações continuam no estado cru, que é o que se persiste.
  const estadoDerivado = useMemo(() => aplicarEstrutura(estado), [estado]);

  const prog = useMemo(() => progresso(estado), [estado]);
  const tudoCompleto = prog.porTime.every((time) => time.completo);

  const [view, setView] = useState<View>(() => {
    if (tudoCompleto && prog.preenchidos > 0) return { modo: "relatorio" };
    return { modo: "mensalidade" };
  });

  // Erros da pergunta em que a pessoa está. Só nascem quando ela TENTA avançar —
  // validar enquanto digita acusaria campo vazio que ela ainda vai preencher.
  const [errosPasso, setErrosPasso] = useState<ErroCampo[]>([]);

  const [premissas, setPremissas] = useState<PremissasRacional>(() =>
    fundirPremissas(premissasSalvas),
  );
  const [usarPadrao, setUsarPadrao] = useState(premissasSalvas == null);

  const modelo = useMemo(() => computarModelo(estado, premissas), [estado, premissas]);
  const autosave = useAutosave({
    token,
    estado,
    ativo: true,
    submittedAtInicial: submittedAt,
  });

  const primeiraPremissas = useRef(true);
  useEffect(() => {
    if (!internoLogado) return;
    if (primeiraPremissas.current) {
      primeiraPremissas.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void fetch(`/api/publico/calculadora/${token}/premissas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          premissas: usarPadrao ? null : serializarPremissas(premissas),
        }),
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [premissas, usarPadrao, internoLogado, token]);

  // O momento em que o número passa a existir. A semente roda no primeiro
  // render: quem volta com o link pronto entra com todos os times já vistos e
  // vai direto ao relatório, sem atravessar o processamento a cada recarga
  // (ver `celebracao.ts` — a regra não mudou, só o que ela desbloqueia).
  const timesVistos = useRef<string[]>(timesJaCompletos(prog));

  // -------------------------------------------------------------------------
  // Mutações do estado (o visitante é dono dos times e da proposta)
  // -------------------------------------------------------------------------

  const patchTime = useCallback((timeId: string, patch: Partial<EstadoTime>) => {
    setEstado((atual) => ({
      ...atual,
      times: atual.times.map((time) => (time.id === timeId ? { ...time, ...patch } : time)),
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

  const setNome = useCallback(
    (timeId: string, nome: string) => patchTime(timeId, { nome }),
    [patchTime],
  );

  const setTrajetoria = useCallback(
    (timeId: string, g: number[] | null) =>
      patchTime(timeId, { trajetoria: g ? { editada: g } : undefined }),
    [patchTime],
  );

  const setProposta = useCallback((timeId: string, patch: Partial<PropostaTime>) => {
    setEstado((atual) => ({
      ...atual,
      times: atual.times.map((time) =>
        time.id === timeId ? { ...time, proposta: { ...time.proposta, ...patch } } : time,
      ),
    }));
  }, []);

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
    const novo = timeVazio(`Time ${estado.times.length + 1}`);
    setEstado((atual) =>
      atual.times.length >= MAX_TIMES ? atual : { ...atual, times: [...atual.times, novo] },
    );
    return novo.id;
  }, [estado.times.length]);

  const removeTime = useCallback(
    (timeId: string) => {
      setEstado((atual) => {
        if (atual.times.length <= 1) return atual;
        return {
          ...atual,
          times: atual.times.filter((time) => time.id !== timeId),
        };
      });
      setTimeAtivoId((ativo) => {
        if (ativo !== timeId) return ativo;
        const restante = estado.times.find((time) => time.id !== timeId);
        return restante?.id ?? ativo;
      });
      setView((atual) => {
        if (atual.modo !== "quiz" || atual.timeId !== timeId) return atual;
        // Continua no quiz, no time que sobrou e na mesma pergunta: cair na
        // etapa avançada por ter removido um time seria trocar de assunto.
        const restante = estado.times.find((time) => time.id !== timeId);
        return restante
          ? { modo: "quiz", timeId: restante.id, pergunta: atual.pergunta }
          : { modo: "mensalidade" };
      });
    },
    [estado.times],
  );

  // -------------------------------------------------------------------------

  const timeAtualId =
    view.modo === "quiz" && estado.times.some((t) => t.id === view.timeId)
      ? view.timeId
      : estado.times.some((t) => t.id === timeAtivoId)
        ? timeAtivoId
        : estado.times[0].id;
  const timeModelo =
    modelo.times.find((time) => time.id === timeAtualId) ?? modelo.times[0];
  const multiTime = estado.times.length > 1;

  // A fita de escopo da etapa 03. Mora AQUI, e não dentro da capa, porque a
  // capa não é renderizada quando o time ativo está incompleto: presa lá, a
  // fita sumiria junto e não haveria como voltar ao consolidado.
  const abasEscopo = multiTime ? (
    <AbasEscopo
      times={modelo.times}
      escopo={capaConsolidada ? "consolidado" : timeAtualId}
      onEscopo={(escopo) => {
        if (escopo === "consolidado") {
          setCapaConsolidada(true);
          // Voltar ao consolidado com um time pela metade em foco cairia no
          // `ResultadoIncompleto` de novo, e a aba pareceria não responder —
          // então o foco vai para o primeiro time que fechou a conta.
          if (timeModelo.resultado.status !== "ok") {
            const completo = modelo.times.find(
              (time) => time.resultado.status === "ok",
            );
            if (completo) setTimeAtivoId(completo.id);
          }
          return;
        }
        setCapaConsolidada(false);
        setTimeAtivoId(escopo);
      }}
      onAddTime={
        estado.times.length < MAX_TIMES
          ? () => setView({ modo: "avancado" })
          : undefined
      }
    />
  ) : null;

  // Os três cenários com as MESMAS entradas (aba Scenario Comparison do
  // Excel). Null enquanto o time estiver incompleto — nunca faixa parcial.
  const comparacao = useMemo(
    () =>
      compararCenarios(
        timeModelo.entradas,
        timeModelo.proposta,
        timeModelo.precoMes,
        modelo.prazoMeses,
        premissas,
      ),
    [timeModelo.entradas, timeModelo.proposta, timeModelo.precoMes, modelo.prazoMeses, premissas],
  );

  // A coluna do cenário ATIVO quando ele já não é um preset puro. `comparacao`
  // continua sendo os três presets — é o que o FAQ cita como "no Conservador o
  // ROI é X", e essa resposta não pode mudar porque alguém ajustou um delta —,
  // então quem mostra os números em uso é esta linha, calculada de uma vez em
  // `computarModelo` e só reapresentada aqui.
  const linhaAtiva =
    timeModelo.sel.modo === "personalizado" && timeModelo.resultado.status === "ok"
      ? linhaDoResultado(timeModelo.sel.base, timeModelo.resultado, modelo.prazoMeses)
      : null;

  const perguntas = useMemo(
    () =>
      perguntasCfo({
        resultado: timeModelo.resultado.status === "ok" ? timeModelo.resultado : null,
        entradas: timeModelo.entradas,
        proposta: timeModelo.proposta.assentos > 0 ? timeModelo.proposta : null,
        preco: modelo.preco,
        prazoMeses: modelo.prazoMeses,
        comparacao,
        coi: timeModelo.coi,
        multiTime,
        premissas,
      }),
    [timeModelo, modelo.preco, modelo.prazoMeses, comparacao, multiTime, premissas],
  );

  // As metas do case de 90 dias. Derivadas do resultado, nunca de volta para
  // dentro dele — `null` enquanto o time não fecha.
  const metas = useMemo(
    () =>
      metasCase(
        timeModelo.resultado,
        timeModelo.entradas,
        timeModelo.proposta.plano,
        timeModelo.proposta.assentos,
        premissas,
      ),
    [timeModelo, premissas],
  );

  const cenarioLabel =
    timeModelo.sel.modo === "preset"
      ? `cenário ${CENARIOS[timeModelo.sel.cenario].label}`
      : "conjunto de parâmetros personalizados";

  const estrutura = estado.estrutura ?? estruturaVazia();
  const vendedoresDaConta = estado.times.reduce(
    (total, time) => total + (time.entradas.numVendedores ?? 0),
    0,
  );

  // A referência de fórmulas abre quando existe número para conferir.
  const formulasLiberadas = modelo.times.some((time) => time.resultado.status === "ok");

  // -------------------------------------------------------------------------
  // Navegação
  // -------------------------------------------------------------------------

  function irParaQuiz(timeId: string, pergunta: PassoId) {
    setErrosPasso([]);
    setTimeAtivoId(timeId);
    setView({ modo: "quiz", timeId, pergunta });
  }

  // A ÚNICA porta do relatório. Ela decide, num lugar só, se a pessoa atravessa
  // o processamento ou entra direto: atravessa quem acabou de fechar a conta de
  // um time NESTA sessão, e entra direto quem já sabia o número — o mesmo corte
  // que separava "descobriu agora" de "já sabia" quando o payoff era um modal.
  function irParaRelatorio() {
    setErrosPasso([]);
    const novos = timesParaCelebrar(timesVistos.current, prog);
    const time = modelo.times.find(
      (item) => novos.includes(item.id) && item.resultado.status === "ok",
    );
    if (!time) return setView({ modo: "relatorio" });
    // Marcar aqui, e não quando a tela termina: se a pessoa sair no meio do
    // processamento, o time já conta como visto e ela não é interceptada de
    // novo na próxima vez que abrir o relatório.
    timesVistos.current = [...timesVistos.current, time.id];
    setTimeAtivoId(time.id);
    return setView({ modo: "processando", timeId: time.id });
  }

  function irParaEtapa(etapa: EtapaId) {
    // A outra metade da trava. O botão desabilitado em `EtapasNav` é
    // afordância; quem monta a chamada por fora (teclado, código, um futuro
    // atalho) passaria por cima dele. A condição é a MESMA função, não uma
    // cópia — duas versões da regra divergiriam no primeiro ajuste.
    if (!etapasLiberadas(preenchimento, etapaDaView(view))[etapa]) return;
    setErrosPasso([]);
    if (etapa === "mensalidade") return setView({ modo: "mensalidade" });
    if (etapa === "quiz") {
      const posicao = primeiraPerguntaIncompleta(estadoDerivado);
      return irParaQuiz(posicao.timeId, posicao.pergunta);
    }
    return irParaRelatorio();
  }

  // Foca e rola até o primeiro campo pendente. Sem isso a mensagem existe mas
  // a pessoa ainda precisa caçar o campo.
  function focarCampo(campo: string) {
    requestAnimationFrame(() => {
      const alvo =
        document.getElementById(`campo-${campo}`) ??
        document.querySelector<HTMLElement>(`[role="radiogroup"]`);
      alvo?.focus();
      alvo?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  function avancarQuiz() {
    if (view.modo !== "quiz") return;

    const pendencias = validarPasso(timeModelo.estadoTime.entradas, view.pergunta);
    if (pendencias.length > 0) {
      setErrosPasso(pendencias);
      focarCampo(pendencias[0].campo);
      return;
    }
    setErrosPasso([]);

    if (view.pergunta < ULTIMO_PASSO) {
      setView({
        modo: "quiz",
        timeId: view.timeId,
        pergunta: (view.pergunta + 1) as PassoId,
      });
      return;
    }
    // Depois da pergunta 8 vem a etapa avançada, que é onde se criam os outros
    // times e se sobrescrevem os deltas. Dali sai o relatório.
    setView({ modo: "avancado" });
  }

  function voltarQuiz() {
    setErrosPasso([]);
    if (view.modo !== "quiz") return;
    if (view.pergunta > 1) {
      setView({
        modo: "quiz",
        timeId: view.timeId,
        pergunta: (view.pergunta - 1) as PassoId,
      });
      return;
    }
    setView({ modo: "mensalidade" });
  }

  // A pergunta opcional diz que é opcional: a saída limpa os dois campos (a
  // regra é dois ou nenhum) e segue em frente, sem cobrar nada.
  function pularFunil() {
    if (view.modo !== "quiz") return;
    setCampo(view.timeId, "cicloDias", null);
    setCampo(view.timeId, "leadsMes", null);
    setErrosPasso([]);
    setView({
      modo: "quiz",
      timeId: view.timeId,
      pergunta: (view.pergunta + 1) as PassoId,
    });
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

  const acoesHeader = (
    <>
      {view.modo !== "mensalidade" ? (
        <span
          className="hidden items-center gap-2 text-sm text-(--pf-ink-faint) lg:flex"
          role="status"
        >
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
      {/* Abaixo do `sm:` as três consultas ficam SÓ no ícone, e isso não é
          gosto: com rótulo, o grupo mede 374px contra os 341px úteis de uma
          tela de 390px, e a barra empurrava o documento inteiro para uma
          rolagem horizontal — em toda etapa da jornada, porque o cabeçalho é
          fixo. As saídas eram três e duas são piores: deixar o grupo quebrar
          empilha a barra em duas ou três fileiras logo acima do conteúdo, e
          encolher tipografia e padding não cabe (sobrariam 6px). Só o ícone
          cabe folgado, mantém o alvo de 44px da §11 e devolve o rótulo a
          partir de 640px. O nome acessível vem de `aria-label` FIXO, e não do
          texto visível — senão o botão mudaria de nome conforme a largura,
          que é o mesmo cuidado que `BotaoFormulas` já tomava. */}
      <Button
        variant="secondary"
        size="sm"
        icon={QuestionMarkCircleIcon}
        aria-label="Perguntas comuns"
        title="Perguntas comuns"
        onClick={() => {
          setGlossarioAberto(false);
          setFaqAberto(true);
        }}
      >
        <span className="hidden sm:inline">Perguntas comuns</span>
      </Button>
      <Button
        variant="secondary"
        size="sm"
        icon={BookOpenIcon}
        aria-label="Glossário"
        title="Glossário"
        onClick={() => {
          setFaqAberto(false);
          setGlossarioAberto(true);
        }}
      >
        <span className="hidden sm:inline">Glossário</span>
      </Button>
      {internoLogado ? (
        <Button
          variant="secondary"
          size="sm"
          icon={AdjustmentsHorizontalIcon}
          aria-label="Racional"
          title="Racional deste link"
          aria-pressed={view.modo === "racional"}
          onClick={() => {
            if (view.modo === "racional") {
              setView(view.voltar);
              return;
            }
            setView({ modo: "racional", voltar: view });
          }}
        >
          <span className="hidden sm:inline">Racional</span>
        </Button>
      ) : null}
      {/* Por último das três consultas: é a mais funda — o glossário explica um
          termo, as perguntas explicam um argumento, e o PDF abre o motor
          célula a célula. Fica na barra fixa porque a dúvida que ele responde
          nasce no meio da leitura, não no fim dela. */}
      <BotaoFormulas token={token} liberado={formulasLiberadas} />
    </>
  );

  // A régua de progresso das quatro etapas. Cada uma diz o quanto de si já foi
  // vencido — não onde a pessoa está, que é o que a pílula ativa já mostra.
  const preenchimento: Record<EtapaId, number> = {
    mensalidade: estado.times[0].entradas.numVendedores !== null ? 1 : 0,
    quiz: prog.total > 0 ? prog.preenchidos / prog.total : 0,
    relatorio: tudoCompleto && prog.preenchidos > 0 ? 1 : 0,
  };

  return (
    <PremissasProvider value={premissas}>
    <main
      className={cn(
        // Sem fundo próprio: a rampa azul da pele é pintada pelo body
        // (globals.css), e um chapado aqui cobriria o gradiente inteiro.
        "page-fade-in flex min-h-[100dvh] flex-col transition-[padding] duration-300",
        // Só o Glossário encolhe a página: ele é gaveta, e o formulário segue
        // editável ao lado. As Perguntas são modal.
        glossarioAberto && "sm:pr-[360px]",
      )}
    >
      <EtapasNav
        etapaAtual={etapaDaView(view)}
        onIr={irParaEtapa}
        preenchimento={preenchimento}
        acoes={acoesHeader}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        {view.modo === "racional" && internoLogado ? (
          <AbaRacional
            token={token}
            premissas={premissas}
            modelo={modelo}
            onChange={(proximo) => {
              setUsarPadrao(false);
              setPremissas(fundirPremissas(proximo));
            }}
            onRestaurar={() => {
              setUsarPadrao(true);
              setPremissas(PREMISSAS_PADRAO);
            }}
          />
        ) : null}

        {view.modo === "mensalidade" ? (
          <div className="flex flex-1 items-center justify-center">
            <EtapaMensalidade
              clientName={clientName}
              expiresAt={expiresAt}
              numVendedores={estado.times[0].entradas.numVendedores}
              plano={estado.times[0].proposta.plano ?? PLANO_DEFAULT}
              prazoMeses={estado.prazoMeses}
              temProgresso={prog.preenchidos > 0}
              onChangeVendedores={(valor) =>
                setCampo(estado.times[0].id, "numVendedores", valor)
              }
              onChangePlano={(plano) => setProposta(estado.times[0].id, { plano })}
              onComecar={() => {
                if (tudoCompleto && prog.preenchidos > 0) {
                  irParaRelatorio();
                } else {
                  const posicao = primeiraPerguntaIncompleta(estadoDerivado);
                  irParaQuiz(posicao.timeId, posicao.pergunta);
                }
              }}
            />
          </div>
        ) : null}

        {view.modo === "quiz" ? (
          // Duas colunas: o mapa de times à esquerda, a pergunta à direita. O
          // card mantém o próprio `max-w-2xl` dentro do `1fr` — a medida de
          // leitura não muda porque ganhou vizinho.
          <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[264px_1fr]">
            {/* `top-20` e não `top-8`: a barra do topo passou a ser fixa
                (~60px no desktop) e, com `z-header`, cobriria as primeiras
                bolhas do mapa de times quando ele grudasse a 32px. */}
            <div className="lg:sticky lg:top-20 lg:self-start">
              <TimesSidebar
                times={estadoDerivado.times}
                timeAtual={timeAtualId}
                passoAtual={view.pergunta}
                onIrPara={irParaQuiz}
                onAddTime={() => {
                  const novoId = addTime();
                  if (novoId) irParaQuiz(novoId, 1);
                }}
                onRemoverTime={multiTime ? (time) => setRemovendoTime(time) : undefined}
                podeAdicionar={estado.times.length < MAX_TIMES}
              />
            </div>

            <PerguntaCard
              passo={view.pergunta}
              titulo={PASSO_INTROS[view.pergunta].titulo}
              texto={PASSO_INTROS[view.pergunta].texto}
              erro={resumoDoErro(errosPasso)}
              onVoltar={voltarQuiz}
              onAvancar={avancarQuiz}
              rotuloAvancar={
                view.pergunta === ULTIMO_PASSO ? "Continuar → ajustes avançados" : "Avançar"
              }
              acaoSecundaria={
                view.pergunta === PASSO_OPCIONAL
                  ? {
                      label: "Não tenho esses dados — pular esta etapa",
                      onClick: pularFunil,
                    }
                  : undefined
              }
            >
              {/* Enter avança, como em qualquer formulário — mas não quando o
                alvo é um botão, senão a tecla dispararia a ação dele. */}
              <div
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  const alvo = event.target as HTMLElement;
                  if (alvo.tagName === "BUTTON" || alvo.tagName === "TEXTAREA") return;
                  event.preventDefault();
                  avancarQuiz();
                }}
              >
                {view.pergunta === ULTIMO_PASSO ? (
                  <PerguntaProposta
                    proposta={timeModelo.estadoTime.proposta}
                    prazoMeses={modelo.prazoMeses}
                    sel={timeModelo.sel}
                    planoHerdado={timeModelo.estadoTime.proposta.assentos === null}
                    onChangePlano={(plano) => setProposta(timeAtualId, { plano })}
                    onChangePrazo={setPrazo}
                    onChangeCenario={(sel) => setCenario(timeAtualId, sel)}
                  />
                ) : (
                  // Entradas CRUAS aqui: o formulário edita o que se persiste. As
                  // derivadas (rateadas) alimentam só o resultado.
                  <PassoForm
                    passo={view.pergunta}
                    entradas={timeModelo.estadoTime.entradas}
                    erros={errosPorCampo(errosPasso)}
                    vendedoresHerdados={
                      timeModelo.estadoTime.entradas.numVendedores !== null
                    }
                    onChange={(campo, valor) => {
                      // O erro daquele campo some assim que ele é tocado: manter
                      // a frase vermelha embaixo de um campo já preenchido é ruído.
                      setErrosPasso((atuais) =>
                        atuais.filter((erro) => erro.campo !== campo),
                      );
                      setCampo(timeAtualId, campo, valor);
                    }}
                  />
                )}
              </div>
            </PerguntaCard>
          </div>
        ) : null}

        {view.modo === "avancado" ? (
          <EtapaAvancada
            modelo={modelo}
            estrutura={estrutura}
            vendedoresDaConta={vendedoresDaConta}
            onChangeEstrutura={setEstrutura}
            onChangeCampo={setCampo}
            onChangeNome={setNome}
            onChangePlano={(timeId, plano: PlanoId) => setProposta(timeId, { plano })}
            onChangeAssentos={(timeId, assentos) =>
              setProposta(timeId, {
                assentos: assentos === null ? null : Math.min(assentos, MAX_ASSENTOS),
              })
            }
            onChangeCenario={setCenario}
            onAddTime={() => {
              const novoId = addTime();
              if (novoId) irParaQuiz(novoId, 1);
            }}
            onRemoverTime={(time) => setRemovendoTime(time.estadoTime)}
            onVoltar={() => irParaQuiz(estado.times[0].id, ULTIMO_PASSO)}
            onVerRelatorio={irParaRelatorio}
          />
        ) : null}

        {view.modo === "processando" ? (
          <ProcessandoResultado
            nomeTime={timeModelo.nome}
            multiTime={multiTime}
            onPronto={() => setView({ modo: "relatorio" })}
          />
        ) : null}

        {view.modo === "relatorio" ? (
          // gap-6 entre CAPÍTULOS, gap-2 entre os cards de um capítulo. Os dois
          // ritmos agora têm regra: 24px é troca de assunto, 8px é "o mesmo
          // assunto, outro recorte". Antes a etapa era uma pilha única de dez
          // blocos de peso idêntico, e o olho não achava onde um acabava.
          <div className="@container flex flex-col gap-10">
            {/* A capa responde, e o cálculo continua abaixo na mesma rolagem.
                Quando o time ativo não fechou a conta, quem aparece é a rede
                (`ResultadoIncompleto`) — uma capa inteira de travessões diria
                menos do que a lista do que falta. */}
            {timeModelo.resultado.status === "ok" ? (
              <CapaResultado
                modelo={modelo}
                timeAtivo={timeModelo}
                dataCalculo={dataCalculo}
                escopo={capaConsolidada ? "consolidado" : "time"}
                abas={abasEscopo}
                onVerDetalhado={() =>
                  document
                    .getElementById("ao-longo-de-12-meses")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                onAjustarProposta={() => irParaQuiz(timeAtualId, ULTIMO_PASSO)}
                // Reabre o quiz na primeira pergunta, com tudo preenchido: o
                // botão se chama "Refazer simulação" mas não apaga nada, e é a
                // própria capa que diz isso abaixo dos botões.
                onRefazer={() => irParaQuiz(timeAtualId, 1)}
                // Imprime daqui mesmo desde 21/08/2026, e é o fecho desta
                // mesma página que permite: o `ResumoVerificavel` está montado
                // lá — invisível na tela desde 21/08/2026, mas MONTADO —, e o
                // CSS de impressão que mora dentro dele
                // (`body * { visibility: hidden }` + o recorte de
                // `#resumo-verificavel`) recorta a folha sozinho. Enquanto ele
                // vivia noutra etapa, imprimir daqui saía como cópia crua da
                // tela — com régua e botões —, e por isso o botão levava para
                // lá antes de abrir o diálogo.
                onExportar={() => window.print()}
              />
            ) : null}

            {timeModelo.resultado.status === "ok" ? (
              <>
                {/* O hero saiu daqui: ele repetia, noutro desenho, os quatro
                    números que a capa acabou de dar. `HeroResultado` continua
                    exportado porque `link-detail` (tela interna) o usa. */}
                <AvisosCoerencia avisos={timeModelo.resultado.avisos} />

                <GrupoRelatorio
                  id="ao-longo-de-12-meses"
                  titulo={
                    <>
                      Ao longo de{" "}
                      <em className="not-italic text-(--pf-brand-ink)">
                        12 meses
                      </em>
                    </>
                  }
                  descricao="Editar a curva muda só a forma, nunca o ROI."
                >
                  <SecaoResultado>
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
                </GrupoRelatorio>

                {/* CARDS irmãos, não sub-blocos dentro de um painel. Cada um
                    tinha um `h3` na mesma classe do `h2` da seção que os
                    continha — títulos empatados, e nenhuma moldura dizendo onde
                    um assunto acabava.

                    Eram quatro até 21/08/2026, quando a "Decomposição do valor
                    — as alavancas" saiu (decisão do decisor). A pergunta que ela
                    respondia — de que o total é feito — já é respondida na
                    CAPA, pela `AlocacaoValor`, e o par Eficiência/Performance
                    logo acima abre as mesmas parcelas com o racional de cada
                    uma. O gráfico continua existindo para `link-detail`, que é
                    a tela interna e não tem capa. */}
                <GrupoRelatorio
                  id="de-onde-vem"
                  titulo={
                    <>
                      De onde vem o{" "}
                      <em className="not-italic text-(--pf-brand-ink)">
                        número
                      </em>
                    </>
                  }
                  descricao="As duas metades da soma."
                >
                  <SecaoResultado
                    titulo="O racional em uma imagem"
                    descricao="O que você paga contra o que a operação devolve, no mesmo ano."
                  >
                    <InvestimentoVsRetorno
                      precoAno={timeModelo.resultado.precoAno}
                      valorAno={timeModelo.resultado.valorAno}
                    />
                  </SecaoResultado>

                  {/* Container query, não breakpoint de viewport: o que decide
                      se cabem duas colunas é a largura DESTA coluna. A
                      divisória vertical saiu — cada card tem moldura própria
                      agora, e um fio entre duas molduras seria fio a mais. */}
                  <div className="grid grid-cols-1 gap-2 @3xl:grid-cols-2">
                    <SecaoResultado>
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
                                    ? (timeModelo.estadoTime.entradas
                                        .numVendedores ?? 0) / vendedoresDaConta
                                    : 0,
                              }
                            : null
                        }
                      />
                    </SecaoResultado>
                    <SecaoResultado>
                      <PerformanceCard
                        resultado={timeModelo.resultado}
                        entradas={timeModelo.entradas}
                      />
                    </SecaoResultado>
                  </div>

                  {/* A faixa dos três cenários é onde a decisão se toma sobre um
                      INTERVALO em vez de um ponto — e desde 21/08/2026 é também
                      onde ela se muda: escolher outra coluna e ajustar os deltas
                      da coluna ativa acontecem aqui, no único bloco cujo assunto
                      já era a diferença entre um cenário e outro. A pergunta 8 e
                      a etapa avançada continuam escrevendo o mesmo estado. */}
                  {comparacao ? (
                    <SecaoResultado
                      titulo="Comparação de cenários"
                      descricao={DESCRICAO_CENARIOS_EDITAVEL}
                    >
                      <ComparacaoCenarios
                        linhas={comparacao}
                        precoMes={timeModelo.resultado.precoMes}
                        cenarioAtivo={
                          timeModelo.sel.modo === "preset"
                            ? timeModelo.sel.cenario
                            : timeModelo.sel.base
                        }
                        personalizado={timeModelo.sel.modo === "personalizado"}
                        edicao={{
                          entradas: timeModelo.entradas,
                          sel: timeModelo.sel,
                          linhaAtiva,
                          onChange: (sel) => setCenario(timeAtualId, sel),
                        }}
                      />
                    </SecaoResultado>
                  ) : null}
                </GrupoRelatorio>
              </>
            ) : (
              // Sem capa, a fita de escopo vem aqui: é o único caminho de volta
              // ao consolidado depois de abrir um time que não fechou a conta.
              <div className="flex flex-col gap-4">
                {abasEscopo ? (
                  <div className="px-1 sm:px-2">{abasEscopo}</div>
                ) : null}
                <div className="rounded-md border border-(--pf-line) bg-(--pf-surface) p-6 sm:p-8">
                  <ResultadoIncompleto
                    faltando={timeModelo.resultado.faltando}
                    onIrParaPasso={(passo) => irParaQuiz(timeAtualId, passo)}
                  />
                </div>
              </div>
            )}

            {timeModelo.coi ? (
              <GrupoRelatorio
                // O id acompanha o título: âncora que não diz o nome do
                // capítulo é a que ninguém encontra depois. Nada linkava para
                // a antiga (`o-que-esta-em-jogo`) — a checagem foi feita.
                id="quanto-custa-nao-agir"
                titulo={
                  <>
                    Quanto custa{" "}
                    <em className="not-italic text-(--pf-brand-ink)">
                      não agir
                    </em>
                  </>
                }
                descricao="A lacuna que o programa endereça, medida com os seus números."
              >
                <SecaoResultado>
                  <CustoInacao
                    coi={timeModelo.coi}
                    entradas={timeModelo.entradas}
                    precoAno={
                      timeModelo.resultado.status === "ok"
                        ? timeModelo.resultado.precoAno
                        : null
                    }
                    onIrParaPasso={(passo) => irParaQuiz(timeAtualId, passo)}
                  />
                </SecaoResultado>
              </GrupoRelatorio>
            ) : null}

            {/* Leitura, não controle. Quem monta a proposta é a pergunta 8;
                aqui ela é conferida, e o atalho leva de volta a ela. */}
            <GrupoRelatorio
              id="quanto-custa"
              titulo={
                <>
                
                  <em className="not-italic text-(--pf-brand-ink)">Investimento</em>
                </>
              }
              descricao="A proposta que você montou na etapa 02."
              acao={
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={() => irParaQuiz(timeAtualId, ULTIMO_PASSO)}
                >
                  Ajustar proposta
                </Button>
              }
            >
              <SecaoResultado>
                <QuantoCusta
                  times={modelo.times}
                  preco={modelo.preco}
                  prazoMeses={modelo.prazoMeses}
                  readOnly
                  cabecalho={false}
                />
              </SecaoResultado>
            </GrupoRelatorio>

            {/* O fecho da jornada mudou de etapa em 20/08/2026: ele vinha
                depois do resumo imprimível, na 04, e agora encerra o relatório.
                É o único bloco que olha para FRENTE — tudo acima projeta doze
                meses, e aqui a proposta se compromete com noventa dias. Ele
                pertence à leitura da conta, não ao pacote que sai da tela.
                Continua não imprimindo: só `#resumo-verificavel` sai na folha. */}
            {metas ? (
              <CaseSucesso
                metas={metas}
                cenarioLabel={cenarioLabel}
                nomeTime={timeModelo.nome}
                multiTime={multiTime}
              />
            ) : null}

            {/* O fecho: resumo imprimível e envio. A referência de fórmulas
                saiu daqui em 20/08/2026 e subiu para a barra fixa do topo.
                Era a etapa 04 até 21/08/2026 — ver o cabeçalho do arquivo. Fica
                DEPOIS do case de sucesso porque é o pacote que sai da tela, não
                mais leitura da conta; e fora do `status === "ok"` acima porque
                a `EnviarBar` sabe se virar com a conta incompleta (é ela quem
                diz o que falta), enquanto o Resumo simplesmente não aparece.
                O `Disclaimer` da tela vive lá dentro desde 21/08/2026, junto
                com a `EnviarBar` — antes era condicional aqui E lá, e a conta
                incompleta rendia dois. */}
            <FechoRelatorio
              modelo={modelo}
              dataCalculo={dataCalculo}
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
    </PremissasProvider>
  );
}
