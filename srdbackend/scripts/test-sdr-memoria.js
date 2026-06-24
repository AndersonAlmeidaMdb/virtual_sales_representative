// Testa o fluxo completo do SDR virtual em 4 turnos de uma mesma conversa, validando:
// 1) resposta de um lead novo (sem checkpoint ainda);
// 2) memória de curto prazo (checkpointer do LangGraph) sem reenviar contexto;
// 3) a ferramenta de busca de conhecimento (RAG) dentro do grafo;
// 4) avanço de estágio/qualificação e persistência no MongoDB (lead, contatos, checkpoints).
//
// Sobe um servidor isolado (porta own, não a de dev) para o teste e encerra ao final.
// Uso: npm run test:sdr-memoria
// Variáveis opcionais: TEST_PORT (porta do servidor de teste, padrão 3055),
//                      KEEP_TEST_DATA=1 (não remove o lead/contatos/checkpoints de teste ao final)
require('dotenv').config();
const path = require('path');
const { spawn } = require('child_process');
const { MongoClient } = require('mongodb');
const { LEADS, CONTATOS, TAREFAS } = require('../src/config/collections');
const { toObjectId } = require('../src/utils/objectId');

const PORTA_TESTE = process.env.TEST_PORT || 3055;
const BASE_URL = `http://localhost:${PORTA_TESTE}`;
const MANTER_DADOS_DE_TESTE = process.env.KEEP_TEST_DATA === '1';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'sdr_crm';

function aguardarServidor(processoServidor) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Servidor de teste não respondeu a tempo (15s).')), 15000);

    processoServidor.stdout.on('data', (dado) => {
      const texto = dado.toString();
      process.stdout.write(`[servidor] ${texto}`);
      if (texto.includes('Servidor rodando')) {
        clearTimeout(timeout);
        resolve();
      }
    });

    processoServidor.stderr.on('data', (dado) => {
      process.stderr.write(`[servidor] ${dado.toString()}`);
    });

    processoServidor.on('exit', (codigo) => {
      clearTimeout(timeout);
      reject(new Error(`Servidor de teste encerrou inesperadamente (código ${codigo}).`));
    });
  });
}

async function enviarMensagem({ leadId, message }) {
  const resposta = await fetch(`${BASE_URL}/api/v1/sdr/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadId ? { lead_id: leadId, message } : { message }),
  });
  const corpo = await resposta.json();
  return { status: resposta.status, corpo };
}

function checar(condicao, mensagem) {
  if (!condicao) {
    throw new Error(mensagem);
  }
  console.log(`  OK: ${mensagem}`);
}

async function executarTurnos() {
  // ---------- Turno 1: lead novo, sem checkpoint ainda ----------
  console.log('\nTurno 1: primeira mensagem (lead novo)');
  const turno1 = await enviarMensagem({
    message: 'Oi, meu nome eh Bruno e trabalho na empresa Orbita Sistemas.',
  });
  checar(turno1.status === 200, `status 200 no turno 1 (recebido ${turno1.status})`);
  checar(!!turno1.corpo.lead_id, 'turno 1 devolveu lead_id');
  checar(
    turno1.corpo.next_stage === 'descoberta',
    `turno 1 com next_stage "descoberta" (recebido "${turno1.corpo.next_stage}")`
  );
  const leadId = turno1.corpo.lead_id;
  console.log(`  lead_id: ${leadId}`);

  // ---------- Turno 2: memória de curto prazo (checkpoint), sem reenviar contexto ----------
  console.log('\nTurno 2: pede pro agente lembrar nome/empresa só com a memória do checkpoint');
  const turno2 = await enviarMensagem({
    leadId,
    message: 'Qual o meu nome e onde eu trabalho? Esqueci o que te disse.',
  });
  checar(turno2.status === 200, `status 200 no turno 2 (recebido ${turno2.status})`);
  const respostaTurno2 = (turno2.corpo.response || '').toLowerCase();
  checar(respostaTurno2.includes('bruno'), 'turno 2 lembrou o nome "Bruno" (memória de curto prazo funcionando)');
  checar(respostaTurno2.includes('orbita') || respostaTurno2.includes('órbita'), 'turno 2 lembrou a empresa "Orbita Sistemas"');

  // ---------- Turno 3: ferramenta de busca de conhecimento (RAG) dentro do grafo ----------
  console.log('\nTurno 3: pergunta específica de produto, deve disparar a ferramenta de RAG');
  const turno3 = await enviarMensagem({
    leadId,
    message: 'O plano Pro tem quantos GB de armazenamento?',
  });
  checar(turno3.status === 200, `status 200 no turno 3 (recebido ${turno3.status})`);
  checar(/100\s*gb/i.test(turno3.corpo.response || ''), 'turno 3 citou "100 GB" (resposta vinda da base de conhecimento via RAG)');

  // ---------- Turno 4: qualificação/agendamento ----------
  console.log('\nTurno 4: informa ICP/orçamento e pede para agendar');
  const turno4 = await enviarMensagem({
    leadId,
    message: 'Somos 4 vendedores, orçamento de R$300/mês. Quero agendar uma reunião.',
  });
  checar(turno4.status === 200, `status 200 no turno 4 (recebido ${turno4.status})`);
  const estagiosDeAvanco = ['qualificacao', 'agendamento', 'reuniao_agendada'];
  checar(
    estagiosDeAvanco.includes(turno4.corpo.next_stage),
    `turno 4 avançou o estágio além de "descoberta" (recebido "${turno4.corpo.next_stage}")`
  );

  return leadId;
}

async function verificarPersistencia(db, leadId) {
  console.log('\nVerificação direta no MongoDB');
  const leadObjectId = toObjectId(leadId);

  const lead = await db.collection(LEADS).findOne({ _id: leadObjectId });
  checar(!!lead, 'documento do lead existe em "leads"');
  checar((lead.nome || '').toLowerCase().includes('bruno'), `lead.nome contém "Bruno" (recebido "${lead.nome}")`);
  checar(
    (lead.empresa || '').toLowerCase().includes('rbita'),
    `lead.empresa contém "Orbita" (recebido "${lead.empresa}")`
  );

  const totalContatos = await db.collection(CONTATOS).countDocuments({ leadId: leadObjectId });
  checar(totalContatos === 4, `4 contatos registrados em "contatos" (recebido ${totalContatos})`);

  const totalCheckpoints = await db.collection('checkpoints').countDocuments({ thread_id: leadId });
  checar(totalCheckpoints > 0, `memória de curto prazo persistida em "checkpoints" (recebido ${totalCheckpoints} documentos)`);
}

async function limparDadosDeTeste(db, leadId) {
  if (MANTER_DADOS_DE_TESTE) {
    console.log('\nKEEP_TEST_DATA=1: mantendo lead/contatos/checkpoints de teste para inspeção.');
    return;
  }
  const leadObjectId = toObjectId(leadId);
  await Promise.all([
    db.collection(LEADS).deleteOne({ _id: leadObjectId }),
    db.collection(CONTATOS).deleteMany({ leadId: leadObjectId }),
    db.collection(TAREFAS).deleteMany({ leadId: leadObjectId }),
    db.collection('checkpoints').deleteMany({ thread_id: leadId }),
    db.collection('checkpoint_writes').deleteMany({ thread_id: leadId }),
  ]);
  console.log('Dados de teste removidos.');
}

async function main() {
  if (!uri) {
    throw new Error('A variável de ambiente MONGODB_URI não foi definida.');
  }

  console.log(`Subindo servidor de teste na porta ${PORTA_TESTE}...`);
  const processoServidor = spawn('node', [path.join(__dirname, '..', 'src', 'server.js')], {
    env: { ...process.env, PORT: String(PORTA_TESTE) },
  });

  let falhou = false;

  try {
    await aguardarServidor(processoServidor);
    const leadId = await executarTurnos();

    const mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    try {
      const db = mongoClient.db(dbName);
      await verificarPersistencia(db, leadId);
      await limparDadosDeTeste(db, leadId);
    } finally {
      await mongoClient.close();
    }

    console.log('\nOs 4 turnos passaram.');
  } catch (erro) {
    falhou = true;
    console.error(`\nFALHOU: ${erro.message}`);
  } finally {
    processoServidor.kill();
  }

  process.exitCode = falhou ? 1 : 0;
}

main();
