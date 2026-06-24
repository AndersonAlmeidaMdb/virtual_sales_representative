// Script de seed: popula o banco com dados de demonstração usando o driver nativo do MongoDB.
// Uso: npm run seed
require('dotenv').config();
const { MongoClient } = require('mongodb');
const { LEADS, PRODUTOS, CONTATOS, TAREFAS } = require('../src/config/collections');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'sdr_crm';

function hojeAs(horas, minutos = 0) {
  const data = new Date();
  data.setHours(horas, minutos, 0, 0);
  return data;
}

function diasAtras(dias, horas = 9) {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  data.setHours(horas, 0, 0, 0);
  return data;
}

function diasAFrente(dias, horas = 9) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  data.setHours(horas, 0, 0, 0);
  return data;
}

async function seed() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    console.log(`Conectado ao MongoDB (database: "${dbName}").`);
    console.log('Limpando coleções de demo (leads, produtos, contatos, tarefas)...');
    await Promise.all([
      db.collection(LEADS).deleteMany({}),
      db.collection(PRODUTOS).deleteMany({}),
      db.collection(CONTATOS).deleteMany({}),
      db.collection(TAREFAS).deleteMany({}),
    ]);

    // ---------- Produtos ----------
    const produtosResultado = await db.collection(PRODUTOS).insertMany([
      {
        nome: 'Plano Starter',
        descricao: 'Pacote de entrada para pequenas equipes de vendas',
        preco: 199.9,
        qtdLeadsQualificados: 0,
        flagAltaDemanda: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nome: 'Plano Pro',
        descricao: 'Automação de cadência e relatórios avançados',
        preco: 499.9,
        qtdLeadsQualificados: 0,
        flagAltaDemanda: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nome: 'Plano Enterprise',
        descricao: 'Solução completa com suporte dedicado e integrações',
        preco: 1499.9,
        qtdLeadsQualificados: 0,
        flagAltaDemanda: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nome: 'Add-on Suporte Premium',
        descricao: 'Suporte prioritário 24/7',
        preco: 99.9,
        qtdLeadsQualificados: 0,
        flagAltaDemanda: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const [starterId, proId, enterpriseId, addonId] = Object.values(produtosResultado.insertedIds);
    console.log(`Produtos inseridos: ${produtosResultado.insertedCount}`);

    // ---------- Leads ----------
    const leadsResultado = await db.collection(LEADS).insertMany([
      {
        nome: 'Mariana Costa',
        email: 'mariana.costa@texovel.com',
        telefone: '11988887777',
        empresa: 'Texovel Confecções',
        origem: 'Inbound - Site',
        status: 'Novo',
        produtoInteresseId: starterId,
        createdAt: diasAtras(1),
        updatedAt: diasAtras(1),
      },
      {
        nome: 'Bruno Almeida',
        email: 'bruno.almeida@fintechnova.com',
        telefone: '11977776666',
        empresa: 'FintechNova',
        origem: 'Outbound - LinkedIn',
        status: 'Em Contato',
        produtoInteresseId: proId,
        createdAt: diasAtras(4),
        updatedAt: diasAtras(3),
      },
      {
        nome: 'Carla Mendes',
        email: 'carla.mendes@logizap.com',
        telefone: '11966665555',
        empresa: 'LogiZap Transportes',
        origem: 'Inbound - Webinar',
        status: 'Qualificado',
        produtoInteresseId: enterpriseId,
        createdAt: diasAtras(8),
        updatedAt: diasAtras(2),
      },
      {
        nome: 'Diego Santos',
        email: 'diego.santos@varejomax.com',
        telefone: '11955554444',
        empresa: 'VarejoMax',
        origem: 'Outbound - Cold Call',
        status: 'Novo',
        produtoInteresseId: proId,
        createdAt: diasAtras(2),
        updatedAt: diasAtras(2),
      },
      {
        nome: 'Fernanda Lima',
        email: 'fernanda.lima@edutech.com',
        telefone: '11944443333',
        empresa: 'EduTech Cursos',
        origem: 'Inbound - Site',
        status: 'Descartado',
        produtoInteresseId: starterId,
        createdAt: diasAtras(12),
        updatedAt: diasAtras(6),
      },
      {
        nome: 'Gustavo Pereira',
        email: 'gustavo.pereira@agroplus.com',
        telefone: '11933332222',
        empresa: 'AgroPlus',
        origem: 'Outbound - Email',
        status: 'Em Contato',
        produtoInteresseId: enterpriseId,
        createdAt: diasAtras(5),
        updatedAt: diasAtras(1),
      },
      {
        nome: 'Helena Rocha',
        email: 'helena.rocha@saudefacil.com',
        telefone: '11922221111',
        empresa: 'SaúdeFácil',
        origem: 'Inbound - Indicação',
        status: 'Qualificado',
        produtoInteresseId: proId,
        createdAt: diasAtras(9),
        updatedAt: diasAtras(5),
      },
      {
        nome: 'Igor Tavares',
        email: 'igor.tavares@construtech.com',
        telefone: '11911110000',
        empresa: 'ConstruTech',
        origem: 'Outbound - LinkedIn',
        status: 'Novo',
        produtoInteresseId: addonId,
        createdAt: diasAtras(1),
        updatedAt: diasAtras(1),
      },
    ]);
    const leadIds = Object.values(leadsResultado.insertedIds);
    const [marianaId, brunoId, carlaId, diegoId, fernandaId, gustavoId, helenaId, igorId] = leadIds;
    console.log(`Leads inseridos: ${leadsResultado.insertedCount}`);

    // Mantém consistente a flag/contador dos produtos com os leads já qualificados acima.
    await db.collection(PRODUTOS).updateOne(
      { _id: enterpriseId },
      { $inc: { qtdLeadsQualificados: 1 }, $set: { flagAltaDemanda: true, updatedAt: new Date() } }
    );
    await db.collection(PRODUTOS).updateOne(
      { _id: proId },
      { $inc: { qtdLeadsQualificados: 1 }, $set: { flagAltaDemanda: true, updatedAt: new Date() } }
    );

    // ---------- Contatos ----------
    const contatosResultado = await db.collection(CONTATOS).insertMany([
      {
        leadId: brunoId,
        tipo: 'Ligacao',
        notas: 'Primeiro contato, lead pediu para retornar depois do almoço.',
        resultado: 'Sem resposta - retornar',
        dataContato: diasAtras(3),
        createdAt: diasAtras(3),
      },
      {
        leadId: carlaId,
        tipo: 'Reuniao',
        notas: 'Apresentação da proposta comercial para o time de operações.',
        resultado: 'Avançar para qualificação',
        dataContato: diasAtras(2),
        createdAt: diasAtras(2),
      },
      {
        leadId: carlaId,
        tipo: 'Email',
        notas: 'Envio do material institucional e cases de sucesso.',
        resultado: 'Lido',
        dataContato: diasAtras(6),
        createdAt: diasAtras(6),
      },
      {
        leadId: gustavoId,
        tipo: 'WhatsApp',
        notas: 'Confirmação de horário para demonstração do produto.',
        resultado: 'Confirmado',
        dataContato: diasAtras(1),
        createdAt: diasAtras(1),
      },
      {
        leadId: helenaId,
        tipo: 'Ligacao',
        notas: 'Lead confirmou interesse e validou orçamento disponível.',
        resultado: 'Qualificado',
        dataContato: diasAtras(5),
        createdAt: diasAtras(5),
      },
      {
        leadId: helenaId,
        tipo: 'Email',
        notas: 'Primeiro contato com apresentação da empresa.',
        resultado: 'Lido',
        dataContato: diasAtras(9), // fora da última semana, não deve entrar no relatório
        createdAt: diasAtras(9),
      },
      {
        leadId: diegoId,
        tipo: 'Email',
        notas: 'Envio de cold email com proposta de valor.',
        resultado: 'Aguardando resposta',
        dataContato: diasAtras(2),
        createdAt: diasAtras(2),
      },
    ]);
    console.log(`Contatos inseridos: ${contatosResultado.insertedCount}`);

    // ---------- Tarefas ----------
    const tarefasResultado = await db.collection(TAREFAS).insertMany([
      // Tarefas de hoje (aparecem na cadência do dia)
      {
        leadId: marianaId,
        tipo: 'Email',
        descricao: 'Enviar proposta comercial inicial',
        dataVencimento: hojeAs(10, 0),
        concluida: false,
        createdAt: diasAtras(1),
      },
      {
        leadId: igorId,
        tipo: 'Email',
        descricao: 'Enviar material técnico solicitado',
        dataVencimento: hojeAs(11, 0),
        concluida: false,
        createdAt: diasAtras(1),
      },
      {
        leadId: brunoId,
        tipo: 'Ligacao',
        descricao: 'Retornar ligação conforme solicitado pelo lead',
        dataVencimento: hojeAs(9, 0),
        concluida: false,
        createdAt: diasAtras(3),
      },
      {
        leadId: diegoId,
        tipo: 'Ligacao',
        descricao: 'Ligar para apresentar a proposta enviada por email',
        dataVencimento: hojeAs(14, 0),
        concluida: false,
        createdAt: diasAtras(2),
      },
      {
        leadId: gustavoId,
        tipo: 'WhatsApp',
        descricao: 'Confirmar presença na demonstração agendada',
        dataVencimento: hojeAs(16, 0),
        concluida: false,
        createdAt: diasAtras(1),
      },
      // Tarefas passadas e futuras (não devem aparecer na cadência de hoje)
      {
        leadId: fernandaId,
        tipo: 'Ligacao',
        descricao: 'Tentativa de reengajamento do lead descartado',
        dataVencimento: diasAtras(1, 15),
        concluida: false,
        createdAt: diasAtras(2),
      },
      {
        leadId: carlaId,
        tipo: 'Reuniao',
        descricao: 'Reunião de fechamento com o time de operações',
        dataVencimento: diasAFrente(1, 10),
        concluida: false,
        createdAt: diasAtras(2),
      },
      {
        leadId: helenaId,
        tipo: 'Email',
        descricao: 'Follow-up pós qualificação',
        dataVencimento: diasAtras(2, 9),
        concluida: true,
        createdAt: diasAtras(5),
      },
    ]);
    console.log(`Tarefas inseridas: ${tarefasResultado.insertedCount}`);

    console.log('\nSeed concluído com sucesso!');
    console.log('Experimente: GET /api/dashboard/cadencia e GET /api/relatorios/conversao');
  } catch (erro) {
    console.error('Erro ao popular o banco de dados:', erro);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

seed();
