const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { LEADS } = require('../../config/collections');

const NOME_FERRAMENTA_BUSCA_LEAD_POR_EMAIL = 'buscar_lead_por_email';

async function buscarLeadPorEmail(db, { email, leadObjectIdAtual }) {
  return db.collection(LEADS).findOne({ email, _id: { $ne: leadObjectIdAtual } });
}

function montarResumoLead(lead) {
  const partes = [
    `nome: ${lead.nome || 'desconhecido'}`,
    `empresa: ${lead.empresa || 'desconhecida'}`,
    `status: ${lead.status || 'Novo'}`,
    `estágio da conversa: ${lead.estagioConversa || 'descoberta'}`,
  ];
  if (lead.produtoInteresseId) {
    partes.push('já demonstrou interesse em um produto específico');
  }
  return partes.join(', ');
}

// Só é seguro apagar o lead em branco da requisição atual e redirecionar a conversa para
// o lead encontrado quando esse lead em branco ainda não tem nenhum histórico em "contatos"
// (ninguém referencia o _id dele ainda). Se já houver histórico, não apaga nada — só informa
// o modelo do registro existente e deixa o fluxo normal de registrar_avaliacao_lead.email
// gravar o e-mail no lead atual, como já acontecia antes desta funcionalidade.
function criarFerramentaBuscaLeadPorEmail(db, { leadObjectIdAtual, contatosExistentes, resultadoIdentificacao }) {
  return tool(
    async ({ email }) => {
      let leadEncontrado;
      try {
        leadEncontrado = await buscarLeadPorEmail(db, { email, leadObjectIdAtual });
      } catch (erro) {
        console.error('Erro ao buscar lead por e-mail:', erro);
        return 'Não foi possível verificar esse e-mail na nossa base agora; continue normalmente.';
      }

      if (!leadEncontrado) {
        return 'Nenhum lead encontrado com esse e-mail; siga tratando como um contato novo.';
      }

      if (contatosExistentes.length === 0) {
        try {
          await db.collection(LEADS).deleteOne({ _id: leadObjectIdAtual });
        } catch (erro) {
          console.error('Erro ao remover lead em branco durante a identificação por e-mail:', erro);
          return 'Encontramos um registro existente com esse e-mail, mas houve um problema ao unificar os dados; continue normalmente.';
        }
        resultadoIdentificacao.leadIdEncontradoPorEmail = leadEncontrado._id;
      }

      return `Encontramos um lead existente com esse e-mail (${montarResumoLead(leadEncontrado)}). Use essas informações para personalizar a conversa.`;
    },
    {
      name: NOME_FERRAMENTA_BUSCA_LEAD_POR_EMAIL,
      description:
        'Procura um lead já existente pelo e-mail informado, para reconhecer um contato que já falou com o SDR virtual antes. Use assim que o lead informar o e-mail, se ainda não soubermos o e-mail dele.',
      schema: z.object({
        email: z.string().email().describe('O e-mail que o lead acabou de informar.'),
      }),
    }
  );
}

module.exports = { buscarLeadPorEmail, criarFerramentaBuscaLeadPorEmail, NOME_FERRAMENTA_BUSCA_LEAD_POR_EMAIL };
