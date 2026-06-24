const { getDb } = require('../config/db');
const { LEADS, PRODUTOS, CONTATOS, TAREFAS } = require('../config/collections');
const { toObjectId } = require('../utils/objectId');
const { ESTAGIOS_CONVERSA, ESTAGIO_PARA_STATUS_LEAD } = require('../config/sdrPrompt');
const { avaliarMensagemDoLead, garantirOpenAiConfigurado, TIPO_CONTATO_SDR_IA } = require('../services/sdrAgentGraph');

const RESPOSTA_FALLBACK = 'Obrigado pela mensagem! Em breve um especialista dará continuidade ao seu atendimento.';

// Passo 4: ao bater um marco (reunião agendada ou lead descartado), registra a tarefa
// de próximo passo de forma síncrona (evita o gap de durabilidade do setImmediate usado
// em outros fluxos de cadência).
async function criarTarefaDeProximoPasso(db, leadId, estagio) {
  const agora = new Date();
  let tarefa = null;

  if (estagio === ESTAGIOS_CONVERSA.REUNIAO_AGENDADA) {
    tarefa = {
      leadId,
      tipo: 'Reuniao',
      descricao: 'AE realizar a discovery call agendada pelo SDR virtual.',
      dataVencimento: new Date(agora.getTime() + 24 * 60 * 60 * 1000),
      concluida: false,
      createdAt: agora,
    };
  } else if (estagio === ESTAGIOS_CONVERSA.DESCARTADO) {
    tarefa = {
      leadId,
      tipo: 'Email',
      descricao: 'Lead desqualificado pelo SDR virtual - incluir em sequência de nutrição.',
      dataVencimento: new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000),
      concluida: false,
      createdAt: agora,
    };
  }

  if (tarefa) {
    await db.collection(TAREFAS).insertOne(tarefa);
  }
}

async function processarMensagemSdr(req, res) {
  const { lead_id, message } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ erro: 'O campo "message" é obrigatório.' });
  }

  let leadObjectIdInformado = null;
  if (lead_id) {
    leadObjectIdInformado = toObjectId(lead_id);
    if (!leadObjectIdInformado) {
      return res.status(400).json({ erro: 'lead_id inválido.' });
    }
  }

  let db;
  try {
    db = getDb();
  } catch (erro) {
    console.error('Erro ao acessar o banco de dados:', erro);
    return res.status(500).json({ erro: 'Erro ao conectar ao banco de dados.' });
  }

  try {
    garantirOpenAiConfigurado();
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: erro.message });
  }

  try {
    // ---------- Passo 1: Fetch Context ----------
    let lead;
    let leadObjectId;

    if (leadObjectIdInformado) {
      leadObjectId = leadObjectIdInformado;
      lead = await db.collection(LEADS).findOne({ _id: leadObjectId });
      if (!lead) {
        return res.status(404).json({ erro: 'Lead não encontrado.' });
      }
    } else {
      const novoLead = {
        nome: null,
        email: null,
        telefone: null,
        empresa: null,
        origem: 'Inbound - SDR Virtual',
        status: 'Novo',
        produtoInteresseId: null,
        icpFit: 'indefinido',
        orcamentoEstimado: null,
        estagioConversa: ESTAGIOS_CONVERSA.DESCOBERTA,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const resultadoInsercao = await db.collection(LEADS).insertOne(novoLead);
      leadObjectId = resultadoInsercao.insertedId;
      lead = { _id: leadObjectId, ...novoLead };
    }

    const [produtos, contatos] = await Promise.all([
      db.collection(PRODUTOS).find().toArray(),
      db.collection(CONTATOS).find({ leadId: leadObjectId }).sort({ dataContato: 1 }).toArray(),
    ]);

    // ---------- Passo 2: LLM Processing (+ Passo 2.5: RAG, memória de curto prazo e identificação por e-mail, dentro do grafo) ----------
    let avaliacao;
    let leadIdEncontradoPorEmail;
    try {
      ({ avaliacao, leadIdEncontradoPorEmail } = await avaliarMensagemDoLead({
        db,
        leadObjectId,
        lead,
        produtos,
        contatos,
        message,
      }));
    } catch (erro) {
      return res.status(erro.statusHttp || 502).json({ erro: erro.message });
    }

    // A tool buscar_lead_por_email já apagou o lead em branco desta requisição e encontrou
    // um lead existente com o e-mail informado: a partir daqui (avaliação, log de contato,
    // tarefa e lead_id devolvido) passamos a usar esse lead já existente.
    if (leadIdEncontradoPorEmail) {
      leadObjectId = leadIdEncontradoPorEmail;
      lead = await db.collection(LEADS).findOne({ _id: leadObjectId });
    }

    const proximoEstagio = Object.values(ESTAGIOS_CONVERSA).includes(avaliacao.proximo_estagio)
      ? avaliacao.proximo_estagio
      : ESTAGIOS_CONVERSA.DESCOBERTA;
    const respostaAoLead =
      typeof avaliacao.resposta_ao_lead === 'string' && avaliacao.resposta_ao_lead.trim()
        ? avaliacao.resposta_ao_lead
        : RESPOSTA_FALLBACK;

    // ---------- Passo 3: Intent/Data Extraction ----------
    const atualizacoesLead = {
      estagioConversa: proximoEstagio,
      status: ESTAGIO_PARA_STATUS_LEAD[proximoEstagio] || lead.status,
      icpFit: ['sim', 'nao', 'indefinido'].includes(avaliacao.fit_icp) ? avaliacao.fit_icp : lead.icpFit,
      updatedAt: new Date(),
    };

    if (avaliacao.orcamento_estimado !== undefined && avaliacao.orcamento_estimado !== null) {
      atualizacoesLead.orcamentoEstimado = Number(avaliacao.orcamento_estimado);
    }
    if (avaliacao.nome) atualizacoesLead.nome = avaliacao.nome;
    if (avaliacao.empresa) atualizacoesLead.empresa = avaliacao.empresa;
    if (avaliacao.email) atualizacoesLead.email = avaliacao.email;
    if (avaliacao.telefone) atualizacoesLead.telefone = avaliacao.telefone;

    const leadAtualizado = await db.collection(LEADS).findOneAndUpdate(
      { _id: leadObjectId },
      { $set: atualizacoesLead },
      { returnDocument: 'after' }
    );

    // Reaproveita o efeito de "passagem de bastão" (igual a /leads/:id/qualificar) quando
    // a reunião é agendada e o lead já tem um produto de interesse vinculado.
    if (proximoEstagio === ESTAGIOS_CONVERSA.REUNIAO_AGENDADA && leadAtualizado.produtoInteresseId) {
      await db.collection(PRODUTOS).findOneAndUpdate(
        { _id: leadAtualizado.produtoInteresseId },
        { $set: { flagAltaDemanda: true, updatedAt: new Date() }, $inc: { qtdLeadsQualificados: 1 } }
      );
    }

    // Log da interação (CONTATOS), com os campos estruturados usados para reconstruir o histórico.
    await db.collection(CONTATOS).insertOne({
      leadId: leadObjectId,
      tipo: TIPO_CONTATO_SDR_IA,
      notas: `Avaliação do SDR virtual: ${avaliacao.motivo || 'sem observações.'}`,
      mensagemLead: message,
      mensagemResposta: respostaAoLead,
      resultado: proximoEstagio,
      dataContato: new Date(),
      createdAt: new Date(),
    });

    // ---------- Passo 4: Check for Completion ----------
    if (proximoEstagio === ESTAGIOS_CONVERSA.REUNIAO_AGENDADA || proximoEstagio === ESTAGIOS_CONVERSA.DESCARTADO) {
      await criarTarefaDeProximoPasso(db, leadObjectId, proximoEstagio);
    }

    return res.status(200).json({
      response: respostaAoLead,
      next_stage: proximoEstagio,
      lead_id: String(leadObjectId),
    });
  } catch (erro) {
    console.error('Erro ao processar mensagem do SDR virtual:', erro);
    return res.status(500).json({ erro: 'Erro interno ao processar a mensagem.' });
  }
}

module.exports = { processarMensagemSdr };
