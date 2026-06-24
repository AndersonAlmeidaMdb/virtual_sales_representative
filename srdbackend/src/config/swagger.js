const swaggerJsdoc = require('swagger-jsdoc');

const PORT = process.env.PORT || 3000;

const definicao = {
  openapi: '3.0.3',
  info: {
    title: 'API CRM/Sales Engagement para SDRs',
    version: '1.0.0',
    description:
      'API REST para gestão de rotinas de SDR: leads, produtos, contatos e tarefas, ' +
      'incluindo cadência diária, passagem de bastão (SQL) e relatórios de conversão.',
  },
  servers: [{ url: `http://localhost:${PORT}`, description: 'Servidor local' }],
  components: {
    schemas: {
      Produto: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
          nome: { type: 'string', example: 'Plano Enterprise' },
          descricao: { type: 'string', example: 'Plano para grandes empresas' },
          preco: { type: 'number', nullable: true, example: 999.9 },
          qtdLeadsQualificados: { type: 'integer', example: 0 },
          flagAltaDemanda: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      NovoProduto: {
        type: 'object',
        required: ['nome'],
        properties: {
          nome: { type: 'string', example: 'Plano Enterprise' },
          descricao: { type: 'string', example: 'Plano para grandes empresas' },
          preco: { type: 'number', example: 999.9 },
        },
      },
      Lead: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
          nome: { type: 'string', example: 'Joao Silva' },
          email: { type: 'string', example: 'joao@empresa.com' },
          telefone: { type: 'string', nullable: true, example: '11999999999' },
          empresa: { type: 'string', nullable: true, example: 'Empresa X' },
          origem: { type: 'string', nullable: true, example: 'Inbound - Site' },
          status: {
            type: 'string',
            enum: ['Novo', 'Em Contato', 'Qualificado', 'Descartado'],
            example: 'Novo',
          },
          produtoInteresseId: { type: 'string', nullable: true, example: '665f1a2b3c4d5e6f7a8b9c0d' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      NovoLead: {
        type: 'object',
        required: ['nome', 'email'],
        properties: {
          nome: { type: 'string', example: 'Joao Silva' },
          email: { type: 'string', example: 'joao@empresa.com' },
          telefone: { type: 'string', example: '11999999999' },
          empresa: { type: 'string', example: 'Empresa X' },
          origem: { type: 'string', example: 'Inbound - Site' },
          produtoInteresseId: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
        },
      },
      Contato: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
          leadId: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
          tipo: { type: 'string', enum: ['Email', 'Ligacao', 'WhatsApp', 'Reuniao'], example: 'Ligacao' },
          notas: { type: 'string', example: 'Lead pediu para retornar em 2 dias' },
          resultado: { type: 'string', nullable: true, example: 'Sem resposta - retornar' },
          dataContato: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      NovoContato: {
        type: 'object',
        required: ['leadId', 'tipo'],
        properties: {
          leadId: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
          tipo: { type: 'string', enum: ['Email', 'Ligacao', 'WhatsApp', 'Reuniao'], example: 'Ligacao' },
          notas: { type: 'string', example: 'Lead pediu para retornar em 2 dias' },
          resultado: { type: 'string', example: 'Sem resposta - retornar' },
          proximaTarefa: {
            type: 'object',
            description: 'Opcional: agenda automaticamente a próxima tarefa de cadência em background.',
            required: ['tipo', 'dataVencimento'],
            properties: {
              tipo: { type: 'string', enum: ['Email', 'Ligacao', 'WhatsApp', 'Reuniao'], example: 'Ligacao' },
              descricao: { type: 'string', example: 'Retornar ligação conforme solicitado' },
              dataVencimento: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      Tarefa: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
          leadId: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
          tipo: { type: 'string', example: 'Email' },
          descricao: { type: 'string', example: 'Enviar proposta comercial' },
          dataVencimento: { type: 'string', format: 'date-time' },
          concluida: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      NovaTarefa: {
        type: 'object',
        required: ['leadId', 'tipo', 'dataVencimento'],
        properties: {
          leadId: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
          tipo: { type: 'string', example: 'Email' },
          descricao: { type: 'string', example: 'Enviar proposta comercial' },
          dataVencimento: { type: 'string', format: 'date-time' },
        },
      },
      Erro: {
        type: 'object',
        properties: {
          erro: { type: 'string', example: 'Mensagem descrevendo o erro.' },
        },
      },
      MensagemSdrEntrada: {
        type: 'object',
        required: ['message'],
        properties: {
          lead_id: {
            type: 'string',
            nullable: true,
            description: 'ObjectId do lead. Se omitido, um novo lead é criado automaticamente.',
            example: '665f1a2b3c4d5e6f7a8b9c0d',
          },
          message: { type: 'string', example: 'Olá, vi o anúncio de vocês. Como funciona o plano Pro?' },
        },
      },
      MensagemSdrSaida: {
        type: 'object',
        properties: {
          response: { type: 'string', example: 'Olá! O Plano Pro inclui automação de cadência e BI avançado...' },
          next_stage: {
            type: 'string',
            enum: ['descoberta', 'qualificacao', 'agendamento', 'reuniao_agendada', 'descartado'],
            example: 'qualificacao',
          },
          lead_id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
        },
      },
    },
  },
};

const opcoes = {
  definition: definicao,
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(opcoes);
