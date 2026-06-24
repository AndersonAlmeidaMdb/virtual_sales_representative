// Script de seed reduzido: popula o banco com um conjunto mínimo de dados (2 produtos, 2 leads, 2 contatos, 2 tarefas).
// Uso: npm run seed:minimal
require('dotenv').config();
const { MongoClient } = require('mongodb');
const { LEADS, PRODUTOS, CONTATOS, TAREFAS } = require('../src/config/collections');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'sdr_crm';


const erpProductDescription = `
## **SalesFlow SaaS – Sistema de Gestão de Vendas Inteligente**

O **SalesFlow** é um ERP completo baseado em nuvem, projetado para unificar suas operações comerciais, otimizar processos e impulsionar a receita da sua empresa. Com uma interface intuitiva e automações poderosas, ele transforma a complexidade da gestão de vendas em uma jornada simples e orientada a dados.

---

### **Plano em Destaque: Pacote de Entrada para Pequenas Equipes de Vendas**

Ideal para startups, comércios locais e pequenas empresas que estão dando os primeiros passos na estruturação do seu setor comercial. Esse pacote oferece as ferramentas essenciais para organizar o caos, parar de perder leads em planilhas e fechar mais negócios com menos esforço.

> **Foco do Plano:** Centralização, agilidade e baixo custo para times de até 5 usuários.

---

### **Funcionalidades Incluídas no Pacote de Entrada**

* **Funil de Vendas Visual (Estilo Kanban):** Arraste e solte seus negócios entre as etapas de negociação (Prospecção, Proposta Enviada, Em Negociação, Fechado). Tenha clareza visual do seu pipeline em segundos.
* **Gestão Centralizada de Contatos (CRM Básico):** Histórico completo de interações com clientes (e-mails, notas e tarefas) para que qualquer membro da equipe possa assumir o atendimento sem perder o contexto.
* **Faturamento e Emissão de Notas Fiscais:** Integração simplificada para emissão de NF-e/NFS-e logo após o fechamento da venda, eliminando o trabalho manual e retratos com o financeiro.
* **Relatórios de Desempenho Essenciais:** Gráficos simples de vendas por período, taxa de conversão do funil e ranking dos vendedores mais ativos.
* **Integração com WhatsApp:** Registre mensagens e envie links de pagamento ou propostas diretamente para o WhatsApp do cliente com apenas um clique.

---

### **Diferenciais e Benefícios**

* **Implantação Flash:** Sem necessidade de consultorias caras. Configure seu funil e importe seus clientes atuais em menos de 15 minutos.
* **Acesso Mobile Total:** Seu time de vendas na rua pode atualizar o status de reuniões e fechar pedidos direto pelo smartphone, com sincronização em tempo real.
* **Segurança de Nível Corporativo:** Seus dados comerciais protegidos por criptografia de ponta a ponta e backups automáticos diários na nuvem.

---

### **Informações Comerciais**
* **Preço:** R$ 149,00 / mês (Faturamento anual)
* **Usuários inclusos:** Até 5 usuários ativos.
* **Suporte:** Suporte humanizado via chat e e-mail em horário comercial.
`;

const enterpriseErpDescription2 = `
## **SalesFlow Enterprise – Plataforma Avançada de Aceleração de Vendas**

O **SalesFlow Enterprise** é a solução definitiva para operações comerciais de escala que exigem previsibilidade, controle rigoroso e eficiência máxima. Desenvolvido para transformar dados brutos em inteligência competitiva, este ERP elimina gargalos operacionais e empodera gestores com uma visão de 360 graus de todo o ecossistema de vendas.

---

### **Plano em Destaque: Automação de Cadência e Relatórios Avançados**

Projetado especificamente para equipas comerciais em expansão, equipas de Inside Sales (vendas internas) e gestores que necessitam de métricas profundas para tomada de decisões estratégicas. Este plano automatiza o trabalho repetitivo dos vendedores e entrega análises preditivas em tempo real.

> **Foco do Plano:** Escalar o volume de abordagens com qualidade e garantir total visibilidade de performance através de dados robustos.

---

### **Funcionalidades Principais Destacadas**

* **Automação de Cadência de Prospecção (Flow Sequences):** Crie fluxos de trabalho sequenciais e automatizados para a sua equipa. Defina regras como: *Dia 1: Enviar e-mail de introdução (automático) -> Dia 3: Lembrete de ligação no sistema -> Dia 5: Mensagem personalizada no LinkedIn*. Garanta que nenhum lead seja esquecido e aumente a taxa de resposta em até 40%.
  
* **Módulo de Relatórios Avançados e Business Intelligence (BI):** Aceda a dashboards interativos e personalizáveis. Monitorize métricas cruciais como:
  * *Análise de Cohort e Tempo de Ciclo de Venda:* Descubra quanto tempo um negócio leva para fechar em cada etapa.
  * *Previsibilidade de Receita (Forecasting):* Algoritmos que calculam a probabilidade de fecho com base no histórico.
  * *Performance por Canal e Origem:* Identifique exatamente quais campanhas ou canais geram o maior Retorno sobre o Investimento (ROI).

* **Pontuação de Leads Inteligente (Lead Scoring):** Classifique os leads automaticamente com base no comportamento e perfil demográfico, direcionando as melhores oportunidades prioritariamente para os vendedores mais experientes.

* **Gestão de Metas e Comissões Automatizada:** Defina objetivos mensais por vendedor ou equipa e deixe o SalesFlow calcular as comissões complexas em tempo real, integrando os dados diretamente com o departamento financeiro.

---

### **Diferenciais Corporativos**

* **API Aberta e Integrações Robustas:** Conecte-se nativamente com ferramentas de Marketing Automation (HubSpot, RD Station), ERPs legados e sistemas de telefonia Cloud.
* **Auditoria e Logs de Atividade:** Histórico completo de alterações para conformidade com normas de segurança de dados (RGPD).

---

### **Informações Comerciais**
* **Preço:** R$ 499,00 / mês (Faturamento anual)
* **Usuários inclusos:** Até 20 usuários ativos (com possibilidade de expansão).
* **Suporte:** Gestor de Conta Dedicado (Sucesso do Cliente) e suporte 24/7.
`;

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
        description: erpProductDescription,
        pdf:"https://drive.google.com/uc?export=download&id=1Z4aTG7P2jkxF3zBFWH-9V7vSN0N2ua0W"
      },
      {
        nome: 'Plano Pro',
        descricao: 'Automação de cadência e relatórios avançados',
        preco: 499.9,
        qtdLeadsQualificados: 0,
        flagAltaDemanda: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        decription: enterpriseErpDescription2,
        pdf:"https://drive.google.com/uc?export=download&id=1tnUcdTZsJigrlRZtly6rHPATM8O6xap0"
      },
    ]);
    const [starterId, proId] = Object.values(produtosResultado.insertedIds);
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
    ]);
    const [marianaId, brunoId] = Object.values(leadsResultado.insertedIds);
    console.log(`Leads inseridos: ${leadsResultado.insertedCount}`);  

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
        leadId: marianaId,
        tipo: 'Email',
        notas: 'Envio do material institucional e cases de sucesso.',
        resultado: 'Lido',
        dataContato: diasAtras(1),
        createdAt: diasAtras(1),
      },
    ]);
    console.log(`Contatos inseridos: ${contatosResultado.insertedCount}`);

    // ---------- Tarefas ----------
    const tarefasResultado = await db.collection(TAREFAS).insertMany([
      {
        leadId: marianaId,
        tipo: 'Email',
        descricao: 'Enviar proposta comercial inicial',
        dataVencimento: hojeAs(10, 0),
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
    ]);
    console.log(`Tarefas inseridas: ${tarefasResultado.insertedCount}`);

    console.log('\nSeed reduzido concluído com sucesso!');
    console.log('Experimente: GET /api/dashboard/cadencia e GET /api/relatorios/conversao');
  } catch (erro) {
    console.error('Erro ao popular o banco de dados:', erro);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

seed();
