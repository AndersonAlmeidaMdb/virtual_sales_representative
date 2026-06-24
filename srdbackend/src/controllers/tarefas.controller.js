const { getDb } = require('../config/db');
const { LEADS, TAREFAS } = require('../config/collections');
const { toObjectId } = require('../utils/objectId');

async function criarTarefa(req, res) {
  try {
    const { leadId, tipo, descricao, dataVencimento } = req.body;

    if (!leadId || !tipo || !dataVencimento) {
      return res
        .status(400)
        .json({ erro: 'Os campos "leadId", "tipo" e "dataVencimento" são obrigatórios.' });
    }

    const leadObjectId = toObjectId(leadId);
    if (!leadObjectId) {
      return res.status(400).json({ erro: 'leadId inválido.' });
    }

    const db = getDb();

    const lead = await db.collection(LEADS).findOne({ _id: leadObjectId });
    if (!lead) {
      return res.status(404).json({ erro: 'Lead não encontrado.' });
    }

    const novaTarefa = {
      leadId: leadObjectId,
      tipo,
      descricao: descricao || '',
      dataVencimento: new Date(dataVencimento),
      concluida: false,
      createdAt: new Date(),
    };

    const resultado = await db.collection(TAREFAS).insertOne(novaTarefa);

    res.status(201).json({ _id: resultado.insertedId, ...novaTarefa });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao criar tarefa.' });
  }
}

async function listarTarefas(req, res) {
  try {
    const { leadId, tipo, concluida } = req.query;
    const filtro = {};

    if (leadId) {
      const leadObjectId = toObjectId(leadId);
      if (!leadObjectId) {
        return res.status(400).json({ erro: 'leadId inválido.' });
      }
      filtro.leadId = leadObjectId;
    }

    if (tipo) {
      filtro.tipo = tipo;
    }

    if (concluida !== undefined) {
      filtro.concluida = concluida === 'true';
    }

    const db = getDb();
    const tarefas = await db.collection(TAREFAS).find(filtro).sort({ dataVencimento: 1 }).toArray();
    res.status(200).json(tarefas);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao listar tarefas.' });
  }
}

async function buscarTarefaPorId(req, res) {
  try {
    const objectId = toObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ erro: 'ID de tarefa inválido.' });
    }

    const db = getDb();
    const tarefa = await db.collection(TAREFAS).findOne({ _id: objectId });

    if (!tarefa) {
      return res.status(404).json({ erro: 'Tarefa não encontrada.' });
    }

    res.status(200).json(tarefa);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar tarefa.' });
  }
}

async function atualizarTarefa(req, res) {
  try {
    const objectId = toObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ erro: 'ID de tarefa inválido.' });
    }

    const camposPermitidos = ['tipo', 'descricao', 'dataVencimento', 'concluida'];
    const atualizacoes = {};
    camposPermitidos.forEach((campo) => {
      if (req.body[campo] !== undefined) {
        atualizacoes[campo] = campo === 'dataVencimento' ? new Date(req.body[campo]) : req.body[campo];
      }
    });

    if (Object.keys(atualizacoes).length === 0) {
      return res.status(400).json({ erro: 'Nenhum campo válido para atualização foi enviado.' });
    }

    const db = getDb();
    const tarefaAtualizada = await db.collection(TAREFAS).findOneAndUpdate(
      { _id: objectId },
      { $set: atualizacoes },
      { returnDocument: 'after' }
    );

    if (!tarefaAtualizada) {
      return res.status(404).json({ erro: 'Tarefa não encontrada.' });
    }

    res.status(200).json(tarefaAtualizada);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao atualizar tarefa.' });
  }
}

async function removerTarefa(req, res) {
  try {
    const objectId = toObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ erro: 'ID de tarefa inválido.' });
    }

    const db = getDb();
    const resultado = await db.collection(TAREFAS).deleteOne({ _id: objectId });

    if (resultado.deletedCount === 0) {
      return res.status(404).json({ erro: 'Tarefa não encontrada.' });
    }

    res.status(200).json({ mensagem: 'Tarefa removida com sucesso.' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao remover tarefa.' });
  }
}

module.exports = {
  criarTarefa,
  listarTarefas,
  buscarTarefaPorId,
  atualizarTarefa,
  removerTarefa,
};
