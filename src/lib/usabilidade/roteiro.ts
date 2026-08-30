/*
 * O roteiro do teste de usabilidade — dado puro, no molde de `faq.ts` e
 * `glossario.ts`.
 *
 * Ele mora em CÓDIGO e não numa tabela editável (decisão do decisor): um
 * roteiro de pesquisa muda entre RODADAS, não entre sessões, e trocar uma
 * pergunta é um ato que merece um commit. O preço é que a tela de edição não
 * existe; o ganho é que `perguntasDoPerfil` é a única autoridade sobre o que se
 * aplica a quem, e o parser, o formulário, o dashboard e o export leem todos
 * daqui.
 *
 * OS IDS SÃO ESTÁVEIS PARA SEMPRE. Eles são as chaves do jsonb de toda sessão
 * já salva — renomear um id "des-responde" o histórico, exatamente como trocar
 * `proposta.plano` de `pratica` para `padrao` descartaria a proposta de todo
 * link da calculadora. `roteiro.test.ts` pina a lista inteira e um hash de
 * ids + opções, então mexer aqui sem bumpar `ROTEIRO_VERSAO` reprova.
 *
 * O `rotulo` é o texto que o moderador lê E a âncora que o importador procura
 * na ficha colada. `sinonimos` existe desde o dia 1 de propósito: acrescentá-lo
 * depois obrigaria a re-testar todo parse já escrito.
 */

export type BlocoId = "b0" | "b1" | "b2" | "b3a" | "b3b" | "b4";

// Quem responde. O Bloco 2 tem duas perguntas com o MESMO número (9 e 10) e
// textos diferentes por perfil — é por isso que resolver o perfil é o primeiro
// passo do importador, e não um detalhe de apresentação.
export type Publico = "ambos" | "gestor" | "vendedor";

export type Opcao = { id: string; label: string };

/*
 * A forma decide três coisas de uma vez: como o campo é desenhado, como o texto
 * colado é coagido, e como a resposta é agregada. `escala` carrega `min`/`max`
 * porque uma média sem a régua é um número solto — 6 numa escala 1–7 e 6 numa
 * 0–10 imprimem igual e não significam o mesmo (invariante 5).
 */
export type Forma =
  | { tipo: "escolha"; opcoes: readonly Opcao[] }
  | { tipo: "escala"; min: number; max: number; ancoras?: readonly [string, string] }
  | { tipo: "texto" }
  | { tipo: "texto_curto" }
  | { tipo: "duracao" }
  | { tipo: "data" };

// Perguntas que viram COLUNA de `teste_sessoes`. A regra: uma pergunta do
// roteiro só vira coluna quando algo além da leitura depende dela — qual
// roteiro se aplica (perfil, varejo) e o eixo de ordenação e cruzamento (fluxo,
// data). Dispositivo, SO, navegador e duração são só distribuições e ficam no
// jsonb; assim acrescentar "Opera" é uma linha aqui, não uma migration.
export type ColunaSessao = "perfil" | "fluxo" | "varejo" | "realizado_em";

export type Pergunta = {
  id: string;
  bloco: BlocoId;
  numero?: number;
  rotulo: string;
  sinonimos?: readonly string[];
  ajuda?: string;
  publico: Publico;
  somenteVarejo?: boolean;
  coluna?: ColunaSessao;
  forma: Forma;
  // A resposta só EXISTE quando a dependência está satisfeita. O template em
  // branco convida a preencher "motivo de não ter finalizado" mesmo com
  // "Finalizou: Sim", e contar isso estouraria o denominador (invariante 9).
  dependeDe?: { pergunta: string; opcao: string };
};

export type Bloco = {
  id: BlocoId;
  titulo: string;
  descricao?: string;
  perguntas: readonly Pergunta[];
};

/*
 * Versão do roteiro. Gravada em `teste_sessoes.roteiro_versao` e nunca
 * reescrita: mudar o roteiro não muda o significado de sessão antiga. Como só a
 * versão corrente vive em código, resposta cujo id sumiu daqui é renderizada
 * num grupo "fora do roteiro atual" com o valor cru — nenhuma resposta salva
 * some da tela porque o roteiro mudou (invariante 10).
 */
export const ROTEIRO_VERSAO = 1;

const SOZINHO_AJUDA_NAO: readonly Opcao[] = [
  { id: "sozinho", label: "Sozinho" },
  { id: "com_ajuda", label: "Com ajuda" },
  { id: "nao_concluiu", label: "Não concluiu" },
];

const SIM_NAO: readonly Opcao[] = [
  { id: "sim", label: "Sim" },
  { id: "nao", label: "Não" },
];

const BLOCO_0: readonly Pergunta[] = [
  {
    id: "b0_perfil",
    bloco: "b0",
    rotulo: "Perfil",
    publico: "ambos",
    coluna: "perfil",
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "gestor", label: "Gestor" },
        { id: "vendedor", label: "Vendedor" },
      ],
    },
  },
  {
    id: "b0_fluxo",
    bloco: "b0",
    rotulo: "Fluxo testado",
    publico: "ambos",
    coluna: "fluxo",
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "configuracao", label: "Configuração" },
        { id: "preparacao", label: "Preparação" },
        { id: "pre_chamada", label: "Pré-chamada" },
        { id: "chamada", label: "Chamada" },
        { id: "feedback", label: "Feedback" },
      ],
    },
  },
  /*
   * Esta pergunta NÃO está no PDF: lá a condição do Bloco 4 é uma nota de
   * rodapé ("só para participantes de loja física"). Sem um campo, a condição
   * viveria só num controle de tela e não chegaria pela ficha colada — e o
   * Bloco 4 inteiro ficaria fora do importador.
   */
  {
    id: "b0_varejo",
    bloco: "b0",
    rotulo: "Participante de loja física",
    sinonimos: ["Varejo", "Loja física"],
    ajuda: "Libera o Bloco 4 — contexto de varejo.",
    publico: "ambos",
    coluna: "varejo",
    forma: { tipo: "escolha", opcoes: SIM_NAO },
  },
  {
    id: "b0_dispositivo",
    bloco: "b0",
    rotulo: "Dispositivo",
    publico: "ambos",
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "celular", label: "Celular" },
        { id: "tablet", label: "Tablet" },
        { id: "notebook", label: "Notebook" },
        { id: "desktop", label: "Desktop" },
      ],
    },
  },
  {
    id: "b0_sistema",
    bloco: "b0",
    rotulo: "Sistema operacional",
    sinonimos: ["SO"],
    publico: "ambos",
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "ios", label: "iOS" },
        { id: "android", label: "Android" },
        { id: "macos", label: "macOS" },
        { id: "windows", label: "Windows" },
      ],
    },
  },
  {
    id: "b0_navegador",
    bloco: "b0",
    rotulo: "Navegador",
    publico: "ambos",
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "chrome", label: "Chrome" },
        { id: "safari", label: "Safari" },
        { id: "firefox", label: "Firefox" },
        { id: "edge", label: "Edge" },
      ],
    },
  },
  {
    id: "b0_data",
    bloco: "b0",
    rotulo: "Data",
    publico: "ambos",
    coluna: "realizado_em",
    forma: { tipo: "data" },
  },
  {
    id: "b0_duracao",
    bloco: "b0",
    rotulo: "Duração",
    ajuda: "Em minutos.",
    publico: "ambos",
    forma: { tipo: "duracao" },
  },
  {
    id: "b0_produto",
    bloco: "b0",
    rotulo: "Produto/serviço vendido",
    publico: "vendedor",
    forma: { tipo: "texto_curto" },
  },
  {
    id: "b0_perfil_cliente",
    bloco: "b0",
    rotulo: "Perfil de cliente usado no roleplay",
    publico: "vendedor",
    forma: { tipo: "texto_curto" },
  },
  {
    id: "b0_objecao",
    bloco: "b0",
    rotulo: "Objeção ou situação escolhida",
    publico: "vendedor",
    forma: { tipo: "texto_curto" },
  },
  {
    id: "b0_fonte_informacao",
    bloco: "b0",
    rotulo: "Fonte da informação",
    publico: "vendedor",
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "proprio_vendedor", label: "Próprio vendedor" },
        { id: "gestor", label: "Gestor" },
        { id: "material_empresa", label: "Material da empresa" },
      ],
    },
  },
];

const BLOCO_1: readonly Pergunta[] = [
  {
    id: "b1_criou_roleplay",
    bloco: "b1",
    rotulo: "Criou o roleplay",
    publico: "gestor",
    forma: { tipo: "escolha", opcoes: SOZINHO_AJUDA_NAO },
  },
  {
    id: "b1_tempo_publicar",
    bloco: "b1",
    rotulo: "Tempo até publicar o roleplay",
    publico: "gestor",
    forma: { tipo: "duracao" },
  },
  {
    id: "b1_campos_hesitou",
    bloco: "b1",
    rotulo: "Campos em que hesitou",
    publico: "gestor",
    forma: { tipo: "texto" },
  },
  {
    id: "b1_refez_etapas",
    bloco: "b1",
    rotulo: "Precisou refazer ou voltar etapas",
    publico: "gestor",
    forma: { tipo: "escolha", opcoes: SIM_NAO },
  },
  {
    id: "b1_refez_quais",
    bloco: "b1",
    rotulo: "Quais etapas refez ou voltou",
    sinonimos: ["Quais"],
    publico: "gestor",
    dependeDe: { pergunta: "b1_refez_etapas", opcao: "sim" },
    forma: { tipo: "texto" },
  },
  {
    id: "b1_atribuiu_roleplay",
    bloco: "b1",
    rotulo: "Atribuiu o roleplay ao vendedor",
    publico: "gestor",
    forma: { tipo: "escolha", opcoes: SOZINHO_AJUDA_NAO },
  },
  {
    id: "b1_localizou_roleplay",
    bloco: "b1",
    rotulo: "Localizou o roleplay atribuído",
    publico: "vendedor",
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "sozinho", label: "Sozinho" },
        { id: "com_ajuda", label: "Com ajuda" },
        { id: "nao_encontrou", label: "Não encontrou" },
      ],
    },
  },
  {
    id: "b1_entendeu_cenario",
    bloco: "b1",
    rotulo: "Entendeu o cenário antes de iniciar",
    publico: "vendedor",
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "sim", label: "Sim" },
        { id: "parcialmente", label: "Parcialmente" },
        { id: "nao", label: "Não" },
      ],
    },
  },
  {
    id: "b1_releu_briefing",
    bloco: "b1",
    rotulo: "Precisou reler o briefing durante a chamada",
    publico: "vendedor",
    forma: { tipo: "escolha", opcoes: SIM_NAO },
  },
  {
    id: "b1_iniciou_chamada",
    bloco: "b1",
    rotulo: "Iniciou a chamada",
    publico: "ambos",
    forma: { tipo: "escolha", opcoes: SOZINHO_AJUDA_NAO },
  },
  {
    id: "b1_finalizou_chamada",
    bloco: "b1",
    rotulo: "Finalizou a chamada",
    publico: "ambos",
    forma: { tipo: "escolha", opcoes: SIM_NAO },
  },
  {
    id: "b1_motivo_nao_finalizou",
    bloco: "b1",
    rotulo: "Motivo de não ter finalizado",
    sinonimos: ["Se não, motivo"],
    publico: "ambos",
    dependeDe: { pergunta: "b1_finalizou_chamada", opcao: "nao" },
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "desistiu", label: "Desistiu" },
        { id: "erro_tecnico", label: "Erro técnico" },
        { id: "nao_entendeu_fim", label: "Não entendeu que havia terminado" },
      ],
    },
  },
  {
    id: "b1_acessou_feedback",
    bloco: "b1",
    rotulo: "Acessou o feedback",
    publico: "ambos",
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "sozinho", label: "Sozinho" },
        { id: "com_ajuda", label: "Com ajuda" },
        { id: "nao_encontrou", label: "Não encontrou" },
      ],
    },
  },
  {
    id: "b1_pedidos_ajuda",
    bloco: "b1",
    rotulo: "Pedidos de ajuda",
    publico: "ambos",
    forma: { tipo: "texto" },
  },
  {
    id: "b1_tempo_concluir",
    bloco: "b1",
    rotulo: "Tempo até concluir",
    publico: "ambos",
    forma: { tipo: "duracao" },
  },
  {
    id: "b1_pontos_hesitacao",
    bloco: "b1",
    rotulo: "Pontos de hesitação (tela e o que procurava)",
    sinonimos: ["Pontos de hesitação"],
    publico: "ambos",
    forma: { tipo: "texto" },
  },
  {
    id: "b1_erros_tecnicos",
    bloco: "b1",
    rotulo: "Erros técnicos (áudio, latência, corte, travamento)",
    sinonimos: ["Erros técnicos"],
    publico: "ambos",
    forma: { tipo: "texto" },
  },
];

const BLOCO_2: readonly Pergunta[] = [
  {
    id: "b2_facilidade",
    bloco: "b2",
    numero: 1,
    rotulo: "O quão fácil ou difícil foi realizar essa tarefa?",
    publico: "ambos",
    forma: {
      tipo: "escala",
      min: 1,
      max: 7,
      ancoras: ["muito difícil", "muito fácil"],
    },
  },
  {
    id: "b2_conversa_real",
    bloco: "b2",
    numero: 2,
    rotulo: "De 0 a 10, o quanto a conversa pareceu real?",
    publico: "ambos",
    forma: { tipo: "escala", min: 0, max: 10 },
  },
  {
    id: "b2_feedback_util",
    bloco: "b2",
    numero: 3,
    rotulo: "De 0 a 10, o quanto o feedback final foi útil pra você?",
    publico: "ambos",
    forma: { tipo: "escala", min: 0, max: 10 },
  },
  {
    id: "b2_concordou_avaliacao",
    bloco: "b2",
    numero: 4,
    rotulo: "Você concordou com a avaliação que a ferramenta te deu?",
    publico: "ambos",
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "concordei", label: "Concordei" },
        { id: "concordei_em_parte", label: "Concordei em parte" },
        { id: "discordei", label: "Discordei" },
      ],
    },
  },
  {
    id: "b2_faria_de_novo",
    bloco: "b2",
    numero: 5,
    rotulo: "Você faria esse roleplay de novo por vontade própria essa semana?",
    publico: "ambos",
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "sim", label: "Sim" },
        { id: "so_se_pedissem", label: "Só se me pedissem" },
        { id: "nao", label: "Não" },
      ],
    },
  },
  {
    id: "b2_quando_treinaria",
    bloco: "b2",
    numero: 6,
    rotulo: "Se fosse treinar de verdade, quando você faria?",
    publico: "ambos",
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "durante_expediente", label: "Durante o expediente" },
        { id: "fora_expediente", label: "Antes ou depois do expediente" },
        { id: "na_folga", label: "Na folga" },
        { id: "nao_faria", label: "Não faria" },
      ],
    },
  },
  {
    id: "b2_onde_treinaria",
    bloco: "b2",
    numero: 7,
    rotulo: "E onde?",
    publico: "ambos",
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "loja_escritorio", label: "Loja/escritório com gente por perto" },
        { id: "sala_reservada", label: "Sala reservada" },
        { id: "em_casa", label: "Em casa" },
        { id: "carro_transporte", label: "No carro ou transporte" },
      ],
    },
  },
  {
    id: "b2_ruido",
    bloco: "b2",
    numero: 8,
    rotulo: "Esse lugar tem ruído ou movimentação?",
    publico: "ambos",
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "silencioso", label: "Silencioso" },
        { id: "algum_ruido", label: "Algum ruído" },
        { id: "bastante_ruido", label: "Bastante ruído" },
      ],
    },
  },
  {
    id: "b2_gestor_parecido",
    bloco: "b2",
    numero: 9,
    rotulo:
      "De 0 a 10, o quanto o roleplay que você criou ficou parecido com o que você imaginou?",
    publico: "gestor",
    forma: { tipo: "escala", min: 0, max: 10 },
  },
  {
    id: "b2_gestor_entregaria",
    bloco: "b2",
    numero: 10,
    rotulo: "Você entregaria esse roleplay pro seu time do jeito que ficou?",
    publico: "gestor",
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "sim", label: "Sim" },
        { id: "so_com_ajustes", label: "Só com ajustes" },
        { id: "nao", label: "Não" },
      ],
    },
  },
  {
    id: "b2_vendedor_cliente_real",
    bloco: "b2",
    numero: 9,
    rotulo: "De 0 a 10, o quanto esse cenário parecia com um cliente real seu?",
    publico: "vendedor",
    forma: { tipo: "escala", min: 0, max: 10 },
  },
  {
    id: "b2_vendedor_o_que_faltou",
    bloco: "b2",
    numero: 10,
    rotulo: "Se ficou diferente, o que estava fora?",
    publico: "vendedor",
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "perfil_cliente", label: "O perfil do cliente" },
        { id: "objecao", label: "A objeção" },
        { id: "jeito_de_falar", label: "O jeito de falar" },
        { id: "produto_oferta", label: "O produto ou a oferta" },
        { id: "estava_fiel", label: "Estava fiel" },
      ],
    },
  },
];

const aberta = (
  id: string,
  bloco: BlocoId,
  numero: number,
  publico: Publico,
  rotulo: string,
): Pergunta => ({ id, bloco, numero, rotulo, publico, forma: { tipo: "texto" } });

const BLOCO_3A: readonly Pergunta[] = [
  aberta("b3a_experiencia", "b3a", 1, "vendedor", "Descreva a sua experiência."),
  aberta(
    "b3a_preparacao_hoje",
    "b3a",
    2,
    "vendedor",
    "Como é a sua preparação hoje para uma reunião de vendas ou um atendimento? Me conta o que você fez na última.",
  ),
  aberta(
    "b3a_busca_informacao",
    "b3a",
    3,
    "vendedor",
    "Quando você precisa de uma informação técnica sobre o produto durante o atendimento, onde você busca? Quanto tempo leva?",
  ),
  aberta(
    "b3a_resposta_boa_ruim",
    "b3a",
    4,
    "vendedor",
    "Na avaliação que a ferramenta te deu, o que pra você seria uma resposta boa e uma resposta ruim nesse critério?",
  ),
  aberta(
    "b3a_cliente_real_faria",
    "b3a",
    5,
    "vendedor",
    "Pensando num cliente real seu: o que ele teria feito ou falado que esse agente não fez?",
  ),
  aberta(
    "b3a_lembrou_ia",
    "b3a",
    6,
    "vendedor",
    "Em algum momento você lembrou que estava falando com uma IA? Em qual exatamente?",
  ),
  aberta(
    "b3a_irritou",
    "b3a",
    7,
    "vendedor",
    "O que te irritou, mesmo que pareça bobagem?",
  ),
  aberta(
    "b3a_falta_substituir",
    "b3a",
    8,
    "vendedor",
    "O que ainda falta aqui pra substituir o que você faz hoje pra treinar?",
  ),
  aberta(
    "b3a_mudaria_cenario",
    "b3a",
    9,
    "vendedor",
    "Se você fosse mudar uma coisa nesse cenário pra ficar igual ao seu dia a dia, o que mudaria?",
  ),
  aberta(
    "b3a_mostraria_gestor",
    "b3a",
    10,
    "vendedor",
    "Você mostraria esse resultado pro seu gestor? Por quê?",
  ),
];

const BLOCO_3B: readonly Pergunta[] = [
  aberta("b3b_experiencia", "b3b", 1, "gestor", "Descreva a sua experiência."),
  aberta(
    "b3b_prepara_time",
    "b3b",
    2,
    "gestor",
    "Como você prepara o time hoje para as conversas com cliente? Me conta o que você fez na última vez que precisou desenvolver alguém.",
  ),
  aberta(
    "b3b_descobre_erro",
    "b3b",
    3,
    "gestor",
    "Quando um vendedor erra numa abordagem, como você descobre e o que você faz? Quanto tempo passa entre o erro e o feedback?",
  ),
  aberta(
    "b3b_acesso_informacao",
    "b3b",
    4,
    "gestor",
    "Como o time acessa hoje as informações técnicas dos produtos? Isso costuma gerar erro no atendimento?",
  ),
  aberta(
    "b3b_avaliacao_concorda",
    "b3b",
    5,
    "gestor",
    "Na avaliação que a ferramenta gerou: ela avaliou o que você avaliaria? O que ela apontou que você não apontaria, e o que ela deixou passar?",
  ),
  aberta(
    "b3b_clientes_reais_fazem",
    "b3b",
    6,
    "gestor",
    "Pensando nos clientes reais que seu time atende: o que eles fazem ou falam que esse agente não fez?",
  ),
  aberta(
    "b3b_ficou_claro_ia",
    "b3b",
    7,
    "gestor",
    "Em algum momento ficou claro que era uma IA e não uma pessoa? Em qual exatamente?",
  ),
  aberta("b3b_irritou", "b3b", 8, "gestor", "O que te irritou, mesmo que pareça bobagem?"),
  aberta(
    "b3b_nao_soube_preencher",
    "b3b",
    9,
    "gestor",
    "Enquanto criava o roleplay, teve algum momento em que você não soube o que preencher? O que faltou de orientação?",
  ),
  aberta(
    "b3b_precisaria_configurar",
    "b3b",
    10,
    "gestor",
    "O que você precisaria conseguir configurar aqui que hoje não dá?",
  ),
  aberta(
    "b3b_falta_substituir",
    "b3b",
    11,
    "gestor",
    "O que ainda falta pra isso substituir o que você faz hoje pra treinar o time?",
  ),
];

const BLOCO_4: readonly Pergunta[] = [
  {
    id: "b4_usa_dispositivo",
    bloco: "b4",
    numero: 1,
    rotulo: "Vocês usam algum dispositivo na loja durante o atendimento?",
    publico: "ambos",
    somenteVarejo: true,
    forma: { tipo: "escolha", opcoes: SIM_NAO },
  },
  {
    id: "b4_qual_dispositivo",
    bloco: "b4",
    numero: 2,
    rotulo: "Qual?",
    publico: "ambos",
    somenteVarejo: true,
    dependeDe: { pergunta: "b4_usa_dispositivo", opcao: "sim" },
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "tablet", label: "Tablet" },
        { id: "celular", label: "Celular" },
        { id: "computador_balcao", label: "Computador do balcão" },
        { id: "coletor", label: "Coletor" },
        { id: "outro", label: "Outro" },
      ],
    },
  },
  {
    id: "b4_qual_dispositivo_outro",
    bloco: "b4",
    rotulo: "Qual outro dispositivo",
    sinonimos: ["Outro"],
    publico: "ambos",
    somenteVarejo: true,
    dependeDe: { pergunta: "b4_qual_dispositivo", opcao: "outro" },
    forma: { tipo: "texto_curto" },
  },
  {
    id: "b4_para_que_usam",
    bloco: "b4",
    numero: 3,
    rotulo: "Pra que vocês usam ele no dia a dia?",
    publico: "ambos",
    somenteVarejo: true,
    forma: { tipo: "texto" },
  },
  {
    id: "b4_de_quem",
    bloco: "b4",
    numero: 4,
    rotulo: "É da loja ou seu?",
    publico: "ambos",
    somenteVarejo: true,
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "da_loja", label: "Da loja" },
        { id: "do_colaborador", label: "Do colaborador" },
        { id: "os_dois", label: "Os dois" },
      ],
    },
  },
  {
    id: "b4_compartilhado",
    bloco: "b4",
    numero: 5,
    rotulo: "Se for da loja: é compartilhado ou individual?",
    sinonimos: ["Compartilhado ou individual"],
    publico: "ambos",
    somenteVarejo: true,
    dependeDe: { pergunta: "b4_de_quem", opcao: "da_loja" },
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "compartilhado", label: "Compartilhado" },
        { id: "individual", label: "Individual" },
      ],
    },
  },
  {
    id: "b4_internet",
    bloco: "b4",
    numero: 6,
    rotulo: "Como é a internet lá? Wi-Fi da loja, 4G, cai muito?",
    publico: "ambos",
    somenteVarejo: true,
    forma: { tipo: "texto" },
  },
  {
    id: "b4_treino_sem_cliente",
    bloco: "b4",
    numero: 7,
    rotulo: "Você teria onde fazer um treino desses sem cliente ouvindo?",
    publico: "ambos",
    somenteVarejo: true,
    forma: {
      tipo: "escolha",
      opcoes: [
        { id: "sim", label: "Sim" },
        { id: "nao", label: "Não" },
        { id: "so_fora_do_horario", label: "Só fora do horário" },
      ],
    },
  },
];

export const ROTEIRO: readonly Bloco[] = [
  {
    id: "b0",
    titulo: "Registro do moderador",
    descricao: "Preenchido pelo moderador, antes e durante a sessão.",
    perguntas: BLOCO_0,
  },
  {
    id: "b1",
    titulo: "Observação durante a tarefa",
    descricao: "O que o moderador viu — não o que o participante disse.",
    perguntas: BLOCO_1,
  },
  { id: "b2", titulo: "Perguntas fechadas ao participante", perguntas: BLOCO_2 },
  { id: "b3a", titulo: "Perguntas abertas · vendedor", perguntas: BLOCO_3A },
  { id: "b3b", titulo: "Perguntas abertas · gestor", perguntas: BLOCO_3B },
  {
    id: "b4",
    titulo: "Contexto de varejo",
    descricao: "Só para participantes de loja física.",
    perguntas: BLOCO_4,
  },
];

export type Perfil = "gestor" | "vendedor";

export const TODAS_AS_PERGUNTAS: readonly Pergunta[] = ROTEIRO.flatMap(
  (bloco) => bloco.perguntas,
);

const POR_ID = new Map(TODAS_AS_PERGUNTAS.map((p) => [p.id, p]));

export function perguntaPorId(id: string): Pergunta | null {
  return POR_ID.get(id) ?? null;
}

/*
 * A ÚNICA autoridade sobre o que se aplica a quem. Tudo — formulário, parser,
 * denominador do dashboard — passa por aqui, senão cada consumidor
 * reimplementaria a regra e um deles a implementaria errado.
 *
 * `dependeDe` NÃO é resolvido aqui: ele depende das respostas, não do perfil, e
 * quem o resolve é `validarRespostas`. Uma pergunta dependente continua "do
 * perfil" mesmo quando a dependência não está satisfeita — é o formulário que
 * decide mostrá-la.
 */
export function perguntasDoPerfil(
  perfil: Perfil | null,
  varejo: boolean,
): readonly Pergunta[] {
  return TODAS_AS_PERGUNTAS.filter((pergunta) => {
    if (pergunta.somenteVarejo && !varejo) return false;
    if (pergunta.publico === "ambos") return true;
    // Perfil indefinido (importação sem o Bloco 0 resolvido): só o que vale
    // para os dois. O Bloco 2 tem duas perguntas nº 9 com textos diferentes por
    // perfil, e adivinhar qual delas é seria escolher a resposta errada.
    if (!perfil) return false;
    return pergunta.publico === perfil;
  });
}

export function blocosDoPerfil(
  perfil: Perfil | null,
  varejo: boolean,
): readonly Bloco[] {
  const aplicaveis = new Set(perguntasDoPerfil(perfil, varejo).map((p) => p.id));
  return ROTEIRO.map((bloco) => ({
    ...bloco,
    perguntas: bloco.perguntas.filter((pergunta) => aplicaveis.has(pergunta.id)),
  })).filter((bloco) => bloco.perguntas.length > 0);
}

export function opcaoPorId(pergunta: Pergunta, opcaoId: string): Opcao | null {
  if (pergunta.forma.tipo !== "escolha") return null;
  return pergunta.forma.opcoes.find((opcao) => opcao.id === opcaoId) ?? null;
}
