const { getDb } = require('../config/db');
const { PRODUTOS, KNOWLEDGE_BASE } = require('../config/collections');
const { toObjectId } = require('../utils/objectId');
const { extrairTextoDePdfUrl } = require('../utils/pdfExtractor');
const { chunkTexto } = require('../utils/textChunker');

/*
autoembed_index1

{
  "fields": [
    {
      "modality": "text",
      "model": "voyage-4",
      "path": "chunk_text",
      "type": "autoEmbed"
    }
  ]
}

*/


async function criarProduto(req, res) {
  try {
    const { nome, descricao, preco } = req.body;

    if (!nome) {
      return res.status(400).json({ erro: 'O campo "nome" é obrigatório.' });
    }

    const db = getDb();
    const novoProduto = {
      nome,
      descricao: descricao || '',
      preco: typeof preco === 'number' ? preco : null,
      qtdLeadsQualificados: 0,
      flagAltaDemanda: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const resultado = await db.collection(PRODUTOS).insertOne(novoProduto);

    res.status(201).json({ _id: resultado.insertedId, ...novoProduto });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao criar produto.' });
  }
}

async function listarProdutos(req, res) {
  try {
    const db = getDb();
    const produtos = await db.collection(PRODUTOS).find().sort({ createdAt: -1 }).toArray();
    res.status(200).json(produtos);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao listar produtos.' });
  }
}

async function buscarProdutoPorId(req, res) {
  try {
    const objectId = toObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ erro: 'ID de produto inválido.' });
    }

    const db = getDb();
    const produto = await db.collection(PRODUTOS).findOne({ _id: objectId });

    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    res.status(200).json(produto);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar produto.' });
  }
}

async function atualizarProduto(req, res) {
  try {
    const objectId = toObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ erro: 'ID de produto inválido.' });
    }

    const camposPermitidos = ['nome', 'descricao', 'preco'];
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
    const produtoAtualizado = await db.collection(PRODUTOS).findOneAndUpdate(
      { _id: objectId },
      { $set: atualizacoes },
      { returnDocument: 'after' }
    );

    if (!produtoAtualizado) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    res.status(200).json(produtoAtualizado);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao atualizar produto.' });
  }
}

async function removerProduto(req, res) {
  try {
    const objectId = toObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ erro: 'ID de produto inválido.' });
    }

    const db = getDb();
    const resultado = await db.collection(PRODUTOS).deleteOne({ _id: objectId });

    if (resultado.deletedCount === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    res.status(200).json({ mensagem: 'Produto removido com sucesso.' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao remover produto.' });
  }
}

async function extrairTextoProduto(req, res) {
  try {
    const objectId = toObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ erro: 'ID de produto inválido.' });
    }

    const db = getDb();
    const produto = await db.collection(PRODUTOS).findOne({ _id: objectId });

    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    if (!produto.pdf) {
      return res.status(400).json({ erro: 'Este produto não possui um PDF cadastrado no campo "pdf".' });
    }

    const contents = await extrairTextoDePdfUrl(produto.pdf);

    if (!contents) {
      return res.status(422).json({ erro: 'Não foi possível extrair texto do PDF informado.' });
    }

    const produtoAtualizado = await db.collection(PRODUTOS).findOneAndUpdate(
      { _id: objectId },
      { $set: { contents, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    res.status(200).json(produtoAtualizado);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: erro.message || 'Erro ao extrair texto do PDF.' });
  }
}

async function chunkarConteudoProduto(req, res) {
  try {
    const objectId = toObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ erro: 'ID de produto inválido.' });
    }

    const db = getDb();
    const produto = await db.collection(PRODUTOS).findOne(
      { _id: objectId },
      { projection: { nome: 1, contents: 1 } }
    );

    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    if (!produto.contents) {
      return res.status(400).json({
        erro: 'Este produto ainda não possui texto extraído. Execute a extração de texto primeiro.',
      });
    }

    const trechos = chunkTexto(produto.contents);

    if (trechos.length === 0) {
      return res.status(422).json({ erro: 'Não foi possível gerar chunks a partir do conteúdo extraído.' });
    }

    const agora = new Date();
    const documentos = trechos.map((chunk_text) => ({
      chunk_text,
      produto_nome: produto.nome,
      produto_id: objectId,
      createdAt: agora,
    }));

    const resultado = await db.collection(KNOWLEDGE_BASE).insertMany(documentos);

    res.status(201).json({ chunksCriados: resultado.insertedCount });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: erro.message || 'Erro ao gerar chunks do conteúdo.' });
  }
}

module.exports = {
  criarProduto,
  listarProdutos,
  buscarProdutoPorId,
  atualizarProduto,
  removerProduto,
  extrairTextoProduto,
  chunkarConteudoProduto,
};
