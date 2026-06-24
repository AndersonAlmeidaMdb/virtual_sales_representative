const { ChatOpenAI } = require('@langchain/openai');
const { ToolMessage } = require('@langchain/core/messages');
const { Annotation, MessagesAnnotation, StateGraph, START, END } = require('@langchain/langgraph');
const { ToolNode } = require('@langchain/langgraph/prebuilt');
const { MongoDBSaver } = require('@langchain/langgraph-checkpoint-mongodb');
const { getMongoClient } = require('../config/db');
const { OPENAI_MODEL, OPENAI_TIMEOUT_MS } = require('../config/openai');
const { criarFerramentaBuscaConhecimento } = require('./tools/ragRetriever');
const { criarFerramentaBuscaLeadPorEmail } = require('./tools/leadIdentityResolver');
const { criarFerramentaRetrieveMemories, criarFerramentaSaveMemories } = require('./tools/leadMemoryStore');
const { NOME_FERRAMENTA_REGISTRO_AVALIACAO, criarFerramentaRegistroAvaliacao } = require('./tools/registroAvaliacao');
const { montarPromptSistema } = require('../config/sdrPrompt');

// Quantas chamadas de apoio (busca de conhecimento, busca de lead por e-mail, memória de
// longo prazo) o modelo pode fazer no mesmo turno antes de ser forçado a encerrar com
// registrar_avaliacao_lead — ver `chamadasDeApoio` abaixo. Cobre o caminho mais longo de hoje:
// buscar_informacoes_produto + retrieve_memories + save_memories, ainda no mesmo turno.
const LIMITE_CHAMADAS_DE_APOIO = 3;

// Rede de segurança contra loop infinito: na prática o fluxo é agent -> tools -> agent, no
// máximo `LIMITE_CHAMADAS_DE_APOIO` vezes; a margem aqui só cobre o caso do modelo insistir
// em responder sem chamar nenhuma ferramenta.
const LIMITE_RECURSAO = 16;

// Janela de memória de curto prazo: quantas mensagens do histórico persistido no checkpoint
// são enviadas ao modelo a cada turno. O checkpoint em si guarda o histórico completo no
// MongoDB — só o prompt enviado à OpenAI é limitado, para não inflar tokens indefinidamente.
const LIMITE_HISTORICO_POR_CHAMADA = 12;

const TIPO_CONTATO_SDR_IA = 'Chat IA';

// Estado do grafo: o canal "messages" padrão do LangGraph (histórico real da conversa,
// sem a mensagem de sistema — ver `noAgente`) mais um contador de quantas chamadas de apoio
// (busca de conhecimento, busca de lead por e-mail, memória de longo prazo) já foram feitas
// no turno atual.
const EstadoAgenteSdr = Annotation.Root({
  ...MessagesAnnotation.spec,
  chamadasDeApoio: Annotation({
    reducer: (_anterior, novo) => novo,
    default: () => 0,
  }),
});

// Validação tardia (só no momento do uso, como em src/config/openai.js) para que a
// ausência da chave não impeça o restante da API de funcionar normalmente.
function garantirOpenAiConfigurado() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não configurada no servidor.');
  }
}

function criarModelo() {
  garantirOpenAiConfigurado();
  return new ChatOpenAI({ model: OPENAI_MODEL, apiKey: process.env.OPENAI_API_KEY, timeout: OPENAI_TIMEOUT_MS });
}

// Reconstrói o histórico a partir dos contatos já registrados por este agente, em ordem
// cronológica. Usado só na primeira mensagem de um lead que ainda não tem memória salva
// no checkpoint (ver `avaliarMensagemDoLead`) — depois disso o checkpoint é a fonte da verdade.
function montarHistoricoConversa(contatos) {
  const mensagens = [];
  contatos
    .filter((contato) => contato.tipo === TIPO_CONTATO_SDR_IA)
    .forEach((contato) => {
      if (contato.mensagemLead) {
        mensagens.push({ role: 'user', content: contato.mensagemLead });
      }
      if (contato.mensagemResposta) {
        mensagens.push({ role: 'assistant', content: contato.mensagemResposta });
      }
    });
  return mensagens;
}

// Recorta as últimas `limite` mensagens, mas nunca começa a janela numa ToolMessage órfã
// (sem o AIMessage com o tool_call correspondente): a OpenAI rejeita um histórico em que
// uma resposta de ferramenta aparece sem a chamada que a originou.
function janelaDeMemoria(mensagens, limite) {
  let inicio = Math.max(0, mensagens.length - limite);
  while (inicio > 0 && mensagens[inicio]?.getType?.() === 'tool') {
    inicio -= 1;
  }
  return mensagens.slice(inicio);
}

// Busca a AIMessage mais recente do histórico retornado pelo grafo — depois do nó
// "finalizar" (ver `montarGrafo`), a última mensagem é a ToolMessage de fechamento, não a
// AIMessage com a tool_call de avaliação em si.
function encontrarUltimaMensagemDoAssistente(mensagens) {
  for (let i = mensagens.length - 1; i >= 0; i -= 1) {
    if (mensagens[i]?.getType?.() === 'ai') {
      return mensagens[i];
    }
  }
  return undefined;
}

// O checkpointer só envolve o MongoClient já conectado em src/config/db.js — não abre uma
// segunda conexão. É um singleton porque o client/dbName não mudam durante a vida do processo.
let checkpointerSingleton = null;
function obterCheckpointer(db) {
  if (!checkpointerSingleton) {
    checkpointerSingleton = new MongoDBSaver({ client: getMongoClient(), dbName: db.databaseName });
  }
  return checkpointerSingleton;
}

// Monta o StateGraph (agent <-> tools) para um único turno. É recriado por requisição porque
// a ferramenta de busca de conhecimento depende do `db` da requisição atual, e o prompt de
// sistema depende dos dados atuais de `lead`/`produtos` (nunca é persistido no checkpoint).
function montarGrafo(db, { lead, produtos, checkpointer, leadObjectId, contatosExistentes, resultadoIdentificacao }) {
  const ferramentaBusca = criarFerramentaBuscaConhecimento(db);
  const ferramentaAvaliacao = criarFerramentaRegistroAvaliacao();
  const ferramentas = [ferramentaBusca, ferramentaAvaliacao];

  // Só oferece a tool de identificação por e-mail enquanto o e-mail do lead ainda for
  // desconhecido — depois disso não há motivo para o modelo procurar de novo.
  if (!lead.email) {
    ferramentas.push(
      criarFerramentaBuscaLeadPorEmail(db, {
        leadObjectIdAtual: leadObjectId,
        contatosExistentes,
        resultadoIdentificacao,
      })
    );
  } else {
    // Memória de longo prazo: só faz sentido (e só é oferecida ao modelo) depois que o
    // e-mail do lead é conhecido, já que é essa a chave de busca/gravação das preferências.
    ferramentas.push(criarFerramentaRetrieveMemories(db, lead.email), criarFerramentaSaveMemories(db, lead.email));
  }

  const modeloBase = criarModelo();

  // Enquanto ainda houver "orçamento" de chamadas de apoio no turno (ver LIMITE_CHAMADAS_DE_APOIO):
  // escolha livre entre as ferramentas de apoio ou já encerrar com a avaliação. "tool_choice:
  // required" replica a regra atual de que toda mensagem do lead deve gerar pelo menos uma
  // chamada de ferramenta.
  const modeloEscolhaLivre = modeloBase.bindTools(ferramentas, {
    tool_choice: 'required',
    parallel_tool_calls: false,
  });

  // Depois de esgotar o orçamento de chamadas de apoio, força o fechamento do turno: replica
  // o que antes era feito trocando o tool_choice manualmente na segunda chamada ao modelo.
  const modeloForcandoAvaliacao = modeloBase.bindTools(ferramentas, {
    tool_choice: { type: 'function', function: { name: NOME_FERRAMENTA_REGISTRO_AVALIACAO } },
    parallel_tool_calls: false,
  });

  const noDeFerramentas = new ToolNode(ferramentas);

  async function noAgente(state) {
    // Recalculada a cada chamada (depende do estágio/ICP atual do lead e do catálogo) e
    // nunca devolvida no retorno do nó: assim ela nunca é gravada no checkpoint, só o
    // histórico real da conversa (state.messages) é persistido.
    // A mensagem atual (ainda sendo processada) é a Nª interação deste lead: contatosExistentes
    // só tem o que já foi registrado ANTES dela. Usado para graduar a urgência do pedido de
    // e-mail no prompt (1ª interação: prioridade sem insistir; 2ª: pede de novo; 3ª+: obrigatório).
    const numeroDaInteracao = contatosExistentes.length + 1;
    const mensagemSistema = { role: 'system', content: montarPromptSistema(produtos, lead, numeroDaInteracao) };
    const historicoJanela = janelaDeMemoria(state.messages, LIMITE_HISTORICO_POR_CHAMADA);

    const modelo = state.chamadasDeApoio >= LIMITE_CHAMADAS_DE_APOIO ? modeloForcandoAvaliacao : modeloEscolhaLivre;
    const resposta = await modelo.invoke([mensagemSistema, ...historicoJanela]);
    return { messages: [resposta] };
  }

  async function noFerramentas(state) {
    const resultado = await noDeFerramentas.invoke(state);
    return { messages: resultado.messages, chamadasDeApoio: state.chamadasDeApoio + 1 };
  }

  // A tool de avaliação não tem efeito colateral real (ver criarFerramentaRegistroAvaliacao)
  // e por isso nunca passa pelo nó "tools" — mas sem uma ToolMessage respondendo ao seu
  // tool_call, o histórico persistido no checkpoint fica com uma chamada de ferramenta sem
  // resposta, o que a OpenAI rejeita no próximo turno. Este nó fecha esse par antes do END.
  async function noFinalizacao(state) {
    const ultimaMensagem = state.messages[state.messages.length - 1];
    const chamada = ultimaMensagem.tool_calls[0];
    return {
      messages: [
        new ToolMessage({
          tool_call_id: chamada.id,
          name: chamada.name,
          content: 'Avaliação registrada.',
        }),
      ],
    };
  }

  // Condição de parada customizada: diferente do `toolsCondition` padrão (que encerra
  // quando não há tool_calls), aqui o turno só termina quando a ferramenta de avaliação
  // for chamada — é a única saída válida exigida pela regra de negócio do SDR virtual.
  function rotearDepoisDoAgente(state) {
    const ultimaMensagem = state.messages[state.messages.length - 1];
    const chamada = ultimaMensagem?.tool_calls?.[0];

    if (!chamada) {
      return 'agent';
    }
    if (chamada.name === NOME_FERRAMENTA_REGISTRO_AVALIACAO) {
      return 'finalizar';
    }
    return 'tools';
  }

  return new StateGraph(EstadoAgenteSdr)
    .addNode('agent', noAgente)
    .addNode('tools', noFerramentas)
    .addNode('finalizar', noFinalizacao)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', rotearDepoisDoAgente, ['agent', 'tools', 'finalizar'])
    .addEdge('tools', 'agent')
    .addEdge('finalizar', END)
    .compile({ checkpointer });
}

// Encapsula a invocação do grafo (com memória de curto prazo via checkpointer de MongoDB) e
// traduz falhas (timeout vs. erro genérico) em um erro com "statusHttp" já definido, no mesmo
// formato usado hoje pelo controller.
async function avaliarMensagemDoLead({ db, leadObjectId, lead, produtos, contatos, message }) {
  const checkpointer = obterCheckpointer(db);
  // Canal de saída do merge feito por buscar_lead_por_email (src/services/tools/leadIdentityResolver.js):
  // o retorno da tool só vira texto visto pelo modelo, então a tool escreve aqui quando
  // encontra (e redireciona para) um lead já existente, para o controller usar depois.
  const resultadoIdentificacao = { leadIdEncontradoPorEmail: null };
  const grafo = montarGrafo(db, {
    lead,
    produtos,
    checkpointer,
    leadObjectId,
    contatosExistentes: contatos,
    resultadoIdentificacao,
  });
  const configDaThread = { configurable: { thread_id: String(leadObjectId) } };

  // Se já existe checkpoint para este lead, o histórico já está salvo na memória de curto
  // prazo — envia só a mensagem nova. Senão (primeira mensagem após este recurso entrar no
  // ar, para um lead com conversa em andamento), semeia a partir de `contatos` como antes,
  // para não perder o contexto já existente.
  const checkpointExistente = await checkpointer.getTuple(configDaThread);
  const novaMensagem = { role: 'user', content: message };
  const entrada = {
    messages: checkpointExistente ? [novaMensagem] : [...montarHistoricoConversa(contatos), novaMensagem],
    // Reseta o contador a cada novo turno: sem isso, o valor do turno anterior seria
    // recuperado do checkpoint e o orçamento de chamadas de apoio quebraria.
    chamadasDeApoio: 0,
  };

  let resultado;
  try {
    resultado = await grafo.invoke(entrada, { ...configDaThread, recursionLimit: LIMITE_RECURSAO });
  } catch (erro) {
    console.error('Erro ao consultar a LLM:', erro);
    const ehTimeout = erro.code === 'ETIMEDOUT' || erro.name === 'APIConnectionTimeoutError' || erro.status === 408;
    const erroHttp = new Error(
      ehTimeout ? 'Tempo limite excedido ao consultar o motor de IA.' : 'Erro ao consultar o motor de IA.'
    );
    erroHttp.statusHttp = ehTimeout ? 504 : 502;
    throw erroHttp;
  }

  const ultimaMensagemDoAssistente = encontrarUltimaMensagemDoAssistente(resultado.messages);
  const chamadaAvaliacao = ultimaMensagemDoAssistente?.tool_calls?.find(
    (chamada) => chamada.name === NOME_FERRAMENTA_REGISTRO_AVALIACAO
  );

  if (!chamadaAvaliacao) {
    const respostaInvalida = ultimaMensagemDoAssistente?.invalid_tool_calls?.find(
      (chamada) => chamada.name === NOME_FERRAMENTA_REGISTRO_AVALIACAO
    );
    const erroHttp = new Error(
      respostaInvalida
        ? 'Erro ao interpretar a resposta do motor de IA.'
        : 'O motor de IA não retornou uma avaliação estruturada.'
    );
    erroHttp.statusHttp = 502;
    throw erroHttp;
  }

  return { avaliacao: chamadaAvaliacao.args, leadIdEncontradoPorEmail: resultadoIdentificacao.leadIdEncontradoPorEmail };
}

module.exports = { avaliarMensagemDoLead, garantirOpenAiConfigurado, TIPO_CONTATO_SDR_IA };
