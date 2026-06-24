const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { ESTAGIOS_CONVERSA } = require('../../config/sdrPrompt');

const NOME_FERRAMENTA_REGISTRO_AVALIACAO = 'registrar_avaliacao_lead';

// Tool do LangChain usada apenas para capturar a saída estruturada do modelo no
// grafo do agente (src/services/sdrAgentGraph.js) — não tem efeito colateral real,
// por isso o "func" apenas devolve os próprios argumentos recebidos.
function criarFerramentaRegistroAvaliacao() {
  return tool(
    async (avaliacao) => avaliacao,
    {
      name: NOME_FERRAMENTA_REGISTRO_AVALIACAO,
      description:
        'Registra a resposta a ser enviada ao lead e a avaliação atualizada (ICP, orçamento e estágio da conversa). Ferramenta final e obrigatória de todo turno.',
      schema: z.object({
        resposta_ao_lead: z.string().describe('Mensagem em português a ser enviada ao lead.'),
        fit_icp: z.enum(['sim', 'nao', 'indefinido']),
        orcamento_estimado: z
          .number()
          .nullable()
          .optional()
          .describe('Valor mensal estimado em reais, ou null se ainda desconhecido.'),
        proximo_estagio: z.enum(Object.values(ESTAGIOS_CONVERSA)),
        nome: z.string().nullable().optional(),
        empresa: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        telefone: z.string().nullable().optional(),
        motivo: z
          .string()
          .nullable()
          .optional()
          .describe('Justificativa interna da avaliação, não exibida ao lead.'),
      }),
    }
  );
}

module.exports = { NOME_FERRAMENTA_REGISTRO_AVALIACAO, criarFerramentaRegistroAvaliacao };
