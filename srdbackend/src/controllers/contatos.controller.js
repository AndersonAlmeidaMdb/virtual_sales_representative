const { getDb } = require('../config/db');
const { LEADS, CONTATOS, TAREFAS } = require('../config/collections');
const { toObjectId } = require('../utils/objectId');

// Insere a próxima tarefa de cadência sem bloquear a resposta da requisição atual.
function agendarProximaTarefaEmBackground(db, leadId, proximaTarefa) {
  const novaTarefa = {
    leadId,
    tipo: proximaTarefa.tipo,
    descricao: proximaTarefa.descricao || '',
    dataVencimento: new Date(proximaTarefa.dataVencimento),
    concluida: false,
    createdAt: new Date(),
  };

  setImmediate(async () => {
    try {
      await db.collection(TAREFAS).insertOne(novaTarefa);
    } catch (erro) {
      console.error('Erro ao agendar próxima tarefa em background:', erro);
    }
  });
}

async function criarContato(req, res) {
  try {
    const { leadId, tipo, notas, resultado, proximaTarefa } = req.body;

    if (!leadId || !tipo) {
      return res.status(400).json({ erro: 'Os campos "leadId" e "tipo" são obrigatórios.' });
    }

    const leadObjectId = toObjectId(leadId);
    if (!leadObjectId) {
      return res.status(400).json({ erro: 'leadId inválido.' });
    }

    if (proximaTarefa && (!proximaTarefa.tipo || !proximaTarefa.dataVencimento)) {
      return res
        .status(400)
        .json({ erro: 'proximaTarefa, quando enviada, precisa de "tipo" e "dataVencimento".' });
    }

    const db = getDb();

    const lead = await db.collection(LEADS).findOne({ _id: leadObjectId });
    if (!lead) {
      return res.status(404).json({ erro: 'Lead não encontrado.' });
    }

    const novoContato = {
      leadId: leadObjectId,
      tipo,
      notas: notas || '',
      resultado: resultado || null,
      dataContato: new Date(),
      createdAt: new Date(),
    };

    const resultadoInsercao = await db.collection(CONTATOS).insertOne(novoContato);

    // Gatilho: se o SDR pediu o agendamento da próxima ação (ex.: "Ligar daqui a 2 dias"),
    // a tarefa é criada em background, sem atrasar a resposta deste registro de contato.
    if (proximaTarefa) {
      agendarProximaTarefaEmBackground(db, leadObjectId, proximaTarefa);
    }

    res.status(201).json({ _id: resultadoInsercao.insertedId, ...novoContato });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao registrar contato.' });
  }
}

async function listarContatos(req, res) {
  try {
    const { leadId } = req.query;
    const filtro = {};

    if (leadId) {
      const leadObjectId = toObjectId(leadId);
      if (!leadObjectId) {
        return res.status(400).json({ erro: 'leadId inválido.' });
      }
      filtro.leadId = leadObjectId;
    }

    const db = getDb();
    const contatos = await db.collection(CONTATOS).find(filtro).sort({ dataContato: -1 }).toArray();
    res.status(200).json(contatos);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao listar contatos.' });
  }
}

async function buscarContatoPorId(req, res) {
  try {
    const objectId = toObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ erro: 'ID de contato inválido.' });
    }

    const db = getDb();
    const contato = await db.collection(CONTATOS).findOne({ _id: objectId });

    if (!contato) {
      return res.status(404).json({ erro: 'Contato não encontrado.' });
    }

    res.status(200).json(contato);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar contato.' });
  }
}

async function atualizarContato(req, res) {
  try {
    const objectId = toObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ erro: 'ID de contato inválido.' });
    }

    const camposPermitidos = ['tipo', 'notas', 'resultado'];
    const atualizacoes = {};
    camposPermitidos.forEach((campo) => {
      if (req.body[campo] !== undefined) {
        atualizacoes[campo] = req.body[campo];
      }
    });

    if (Object.keys(atualizacoes).length === 0) {
      return res.status(400).json({ erro: 'Nenhum campo válido para atualização foi enviado.' });
    }

    const db = getDb();
    const contatoAtualizado = await db.collection(CONTATOS).findOneAndUpdate(
      { _id: objectId },
      { $set: atualizacoes },
      { returnDocument: 'after' }
    );

    if (!contatoAtualizado) {
      return res.status(404).json({ erro: 'Contato não encontrado.' });
    }

    res.status(200).json(contatoAtualizado);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao atualizar contato.' });
  }
}

async function removerContato(req, res) {
  try {
    const objectId = toObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ erro: 'ID de contato inválido.' });
    }

    const db = getDb();
    const resultado = await db.collection(CONTATOS).deleteOne({ _id: objectId });

    if (resultado.deletedCount === 0) {
      return res.status(404).json({ erro: 'Contato não encontrado.' });
    }

    res.status(200).json({ mensagem: 'Contato removido com sucesso.' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao remover contato.' });
  }
}

module.exports = {
  criarContato,
  listarContatos,
  buscarContatoPorId,
  atualizarContato,
  removerContato,
};
