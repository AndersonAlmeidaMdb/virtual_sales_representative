const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { KNOWLEDGE_BASE } = require('../../config/collections');

const NOME_INDICE_VETORIAL = 'autoembed_index1';
const MODELO_AUTOEMBED = 'voyage-4';
const NUM_CANDIDATOS_PADRAO = 20;
const LIMITE_PADRAO = 4;

// O índice "autoembed_index1" é do tipo autoEmbed (model "voyage-4") sobre knowledge_base.chunk_text,
// então o Atlas gera o vetor da query no próprio servidor: basta enviar o texto da pergunta em
// "query", sem nunca precisar calcular um embedding no lado da aplicação.
async function buscarConhecimentoProduto(db, { pergunta, produtoNome, limite = LIMITE_PADRAO } = {}) {
  if (!pergunta || !pergunta.trim()) {
    return [];
  }

  const candidatos = await db
    .collection(KNOWLEDGE_BASE)
    .aggregate([
      {
        $vectorSearch: {
          index: NOME_INDICE_VETORIAL,
          path: 'chunk_text',
          query: { text: pergunta },
          model: MODELO_AUTOEMBED,
          numCandidates: NUM_CANDIDATOS_PADRAO,
          limit: NUM_CANDIDATOS_PADRAO,
        },
      },
      {
        $project: {
          _id: 0,
          chunk_text: 1,
          produto_nome: 1,
          produto_id: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ])
    .toArray();

  if (produtoNome) {
    const filtrados = candidatos.filter(
      (chunk) => chunk.produto_nome?.toLowerCase() === produtoNome.toLowerCase()
    );
    if (filtrados.length > 0) {
      return filtrados.slice(0, limite);
    }
  }

  return candidatos.slice(0, limite);
}

// Usamos a Tool do LangChain (em vez do vector store MongoDBAtlasVectorSearch) porque o índice
// é autoEmbed: a busca aceita texto puro e não exige um modelo de Embeddings local no cliente.
function criarFerramentaBuscaConhecimento(db) {
  return tool(
    async ({ pergunta, produto_nome }) => {
      // Captura a falha aqui (em vez de deixar o ToolNode do LangGraph gerar sua mensagem
      // de erro padrão) para que o agente sempre receba uma instrução clara de seguir só
      // com o catálogo, em vez de um texto de erro genérico em inglês.
      let chunks;
      try {
        chunks = await buscarConhecimentoProduto(db, { pergunta, produtoNome: produto_nome });
      } catch (erro) {
        console.error('Erro ao buscar conhecimento na base vetorial:', erro);
        return 'A busca na base de conhecimento falhou agora; responda apenas com o que já está no catálogo.';
      }

      if (chunks.length === 0) {
        return 'Nenhuma informação adicional encontrada na base de conhecimento para esta pergunta.';
      }
      return chunks
        .map((chunk, indice) => `[${indice + 1}] (${chunk.produto_nome}) ${chunk.chunk_text}`)
        .join('\n\n');
    },
    {
      name: 'buscar_informacoes_produto',
      description:
        'Busca informações detalhadas sobre produtos na base de conhecimento (knowledge_base) via vector search, para responder perguntas que o resumo do catálogo não cobre.',
      schema: z.object({
        pergunta: z.string().describe('A pergunta ou tópico que o lead quer saber sobre o produto.'),
        produto_nome: z
          .string()
          .nullable()
          .optional()
          .describe('Nome do produto específico já conhecido na conversa, se houver.'),
      }),
    }
  );
}

module.exports = { buscarConhecimentoProduto, criarFerramentaBuscaConhecimento, NOME_INDICE_VETORIAL };
