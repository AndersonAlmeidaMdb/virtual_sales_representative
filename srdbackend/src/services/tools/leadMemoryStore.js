const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { MEMORIAS_LEAD } = require('../../config/collections');

const NOME_FERRAMENTA_RETRIEVE_MEMORIES = 'retrieve_memories';
const NOME_FERRAMENTA_SAVE_MEMORIES = 'save_memories';

async function buscarMemoriasDoLead(db, email) {
  return db.collection(MEMORIAS_LEAD).findOne({ email });
}

// Upsert por chave: nunca sobrescreve o documento inteiro, então preferências salvas em
// conversas/leads diferentes (mesmo e-mail) se acumulam em vez de se perder.
async function salvarMemoriasDoLead(db, email, memorias) {
  const camposParaAtualizar = { updatedAt: new Date() };
  memorias.forEach(({ chave, valor }) => {
    camposParaAtualizar[`preferencias.${chave}`] = valor;
  });

  await db.collection(MEMORIAS_LEAD).updateOne(
    { email },
    {
      $set: camposParaAtualizar,
      $setOnInsert: { email, createdAt: new Date() },
    },
    { upsert: true }
  );
}

function montarResumoPreferencias(preferencias) {
  return Object.entries(preferencias)
    .map(([chave, valor]) => `- ${chave}: ${valor}`)
    .join('\n');
}

// Lê as preferências de longo prazo já salvas para este e-mail. Não recebe `email` como
// argumento do schema (a Tool fecha sobre o e-mail do lead atual) para o modelo nunca poder
// consultar/confundir o e-mail de outra pessoa.
function criarFerramentaRetrieveMemories(db, email) {
  return tool(
    async () => {
      let documento;
      try {
        documento = await buscarMemoriasDoLead(db, email);
      } catch (erro) {
        console.error('Erro ao buscar memórias de longo prazo:', erro);
        return 'Não foi possível consultar as memórias de longo prazo agora; continue sem elas.';
      }

      if (!documento || !documento.preferencias || Object.keys(documento.preferencias).length === 0) {
        return 'Nenhuma preferência de longo prazo registrada para este e-mail ainda.';
      }

      return montarResumoPreferencias(documento.preferencias);
    },
    {
      name: NOME_FERRAMENTA_RETRIEVE_MEMORIES,
      description:
        'Busca preferências de longo prazo já salvas para este lead (pelo e-mail), como duração de reunião preferida, melhor horário de contato, melhor horário para reuniões, cloud preferida ou stack tecnológica atual. Use quando essa informação ajudar a personalizar a conversa.',
      schema: z.object({}),
    }
  );
}

// Grava uma ou mais preferências de longo prazo reveladas pelo lead nesta conversa, associadas
// ao e-mail dele (mesma observação sobre não receber `email` do schema do modelo).
function criarFerramentaSaveMemories(db, email) {
  return tool(
    async ({ memorias }) => {
      try {
        await salvarMemoriasDoLead(db, email, memorias);
      } catch (erro) {
        console.error('Erro ao salvar memórias de longo prazo:', erro);
        return 'Não foi possível salvar essas preferências agora; prossiga normalmente.';
      }

      return `Preferências salvas: ${memorias.map((memoria) => memoria.chave).join(', ')}.`;
    },
    {
      name: NOME_FERRAMENTA_SAVE_MEMORIES,
      description:
        'Salva uma ou mais preferências de longo prazo reveladas pelo lead (ex.: duração de reunião preferida, melhor horário de contato, melhor horário para reuniões, cloud preferida, stack tecnológica atual), associadas ao e-mail dele.',
      schema: z.object({
        memorias: z
          .array(
            z.object({
              chave: z
                .string()
                .describe(
                  'Identificador curto e estável da preferência, em snake_case (ex.: duracao_reuniao_preferida, melhor_horario_contato, melhor_horario_reuniao, cloud_preferida, stack_tecnologica_atual).'
                ),
              valor: z
                .string()
                .describe('Valor da preferência em texto livre, como o lead expressou (ex.: "30 minutos", "manhã", "AWS").'),
            })
          )
          .min(1)
          .describe('Uma ou mais preferências reveladas pelo lead nesta mensagem.'),
      }),
    }
  );
}

module.exports = {
  buscarMemoriasDoLead,
  salvarMemoriasDoLead,
  criarFerramentaRetrieveMemories,
  criarFerramentaSaveMemories,
  NOME_FERRAMENTA_RETRIEVE_MEMORIES,
  NOME_FERRAMENTA_SAVE_MEMORIES,
};
