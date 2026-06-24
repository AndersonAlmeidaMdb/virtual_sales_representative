const { getDb } = require('../config/db');
const { LEADS, PRODUTOS } = require('../config/collections');
const { toObjectId } = require('../utils/objectId');

const STATUS_PADRAO = 'Novo';

async function criarLead(req, res) {
  try {
    const { nome, email, telefone, empresa, origem, produtoInteresseId } = req.body;

    if (!nome || !email) {
      return res.status(400).json({ erro: 'Os campos "nome" e "email" são obrigatórios.' });
    }

    let produtoObjectId = null;
    if (produtoInteresseId) {
      produtoObjectId = toObjectId(produtoInteresseId);
      if (!produtoObjectId) {
        return res.status(400).json({ erro: 'produtoInteresseId inválido.' });
      }
    }

    const db = getDb();

    if (produtoObjectId) {
      const produto = await db.collection(PRODUTOS).findOne({ _id: produtoObjectId });
      if (!produto) {
        return res.status(400).json({ erro: 'Produto de interesse informado não existe.' });
      }
    }

    const novoLead = {
      nome,
      email,
      telefone: telefone || null,
      empresa: empresa || null,
      origem: origem || null,
      status: STATUS_PADRAO,
      produtoInteresseId: produtoObjectId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const resultado = await db.collection(LEADS).insertOne(novoLead);

    res.status(201).json({ _id: resultado.insertedId, ...novoLead });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao criar lead.' });
  }
}

async function listarLeads(req, res) {
  try {
    const { status } = req.query;
    const filtro = {};
    if (status) {
      filtro.status = status;
    }

    const db = getDb();
    const leads = await db.collection(LEADS).find(filtro).sort({ createdAt: -1 }).toArray();
    res.status(200).json(leads);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao listar leads.' });
  }
}

async function buscarLeadPorId(req, res) {
  try {
    const objectId = toObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ erro: 'ID de lead inválido.' });
    }

    const db = getDb();
    const lead = await db.collection(LEADS).findOne({ _id: objectId });

    if (!lead) {
      return res.status(404).json({ erro: 'Lead não encontrado.' });
    }

    res.status(200).json(lead);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar lead.' });
  }
}

async function atualizarLead(req, res) {
  try {
    const objectId = toObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ erro: 'ID de lead inválido.' });
    }

    const camposPermitidos = ['nome', 'email', 'telefone', 'empresa', 'origem'];
    const atualizacoes = {};
    camposPermitidos.forEach((campo) => {
      if (req.body[campo] !== undefined) {
        atualizacoes[campo] = req.body[campo];
      }
    });

    if (Object.keys(atualizacoes).length === 0) {
      return res.status(400).json({ erro: 'Nenhum campo válido para atualização foi enviado.' });
    }

    atualizacoes.updatedAt = new Date();

    const db = getDb();
    const leadAtualizado = await db.collection(LEADS).findOneAndUpdate(
      { _id: objectId },
      { $set: atualizacoes },
      { returnDocument: 'after' }
    );

    if (!leadAtualizado) {
      return res.status(404).json({ erro: 'Lead não encontrado.' });
    }

    res.status(200).json(leadAtualizado);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao atualizar lead.' });
  }
}

async function removerLead(req, res) {
  try {
    const objectId = toObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ erro: 'ID de lead inválido.' });
    }

    const db = getDb();
    const resultado = await db.collection(LEADS).deleteOne({ _id: objectId });

    if (resultado.deletedCount === 0) {
      return res.status(404).json({ erro: 'Lead não encontrado.' });
    }

    res.status(200).json({ mensagem: 'Lead removido com sucesso.' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao remover lead.' });
  }
}

// Passagem de bastão / SQL: o SDR valida o lead, que passa a ser Sales Qualified Lead.
async function qualificarLead(req, res) {
  try {
    const objectId = toObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ erro: 'ID de lead inválido.' });
    }

    const db = getDb();

    const lead = await db.collection(LEADS).findOne({ _id: objectId });
    if (!lead) {
      return res.status(404).json({ erro: 'Lead não encontrado.' });
    }

    if (!lead.produtoInteresseId) {
      return res
        .status(400)
        .json({ erro: 'Lead não possui produto de interesse vinculado e não pode ser qualificado.' });
    }

    const leadQualificado = await db.collection(LEADS).findOneAndUpdate(
      { _id: objectId },
      { $set: { status: 'Qualificado', updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    // Atualiza a flag/contador de interesse do produto vinculado ao lead qualificado.
    const produtoAtualizado = await db.collection(PRODUTOS).findOneAndUpdate(
      { _id: lead.produtoInteresseId },
      {
        $set: { flagAltaDemanda: true, updatedAt: new Date() },
        $inc: { qtdLeadsQualificados: 1 },
      },
      { returnDocument: 'after' }
    );

    res.status(200).json({ lead: leadQualificado, produto: produtoAtualizado });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao qualificar lead.' });
  }
}

module.exports = {
  criarLead,
  listarLeads,
  buscarLeadPorId,
  atualizarLead,
  removerLead,
  qualificarLead,
};
