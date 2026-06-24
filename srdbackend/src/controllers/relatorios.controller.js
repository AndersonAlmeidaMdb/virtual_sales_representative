const { getDb } = require('../config/db');
const { LEADS, CONTATOS } = require('../config/collections');

// Resumo de quantos leads existem em cada status e o total de
// contatos/interações realizados na última semana.
async function relatorioConversao(req, res) {
  try {
    const db = getDb();

    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    const leadsPorStatusPipeline = [
      { $group: { _id: '$status', totalLeads: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', totalLeads: 1 } },
      { $sort: { status: 1 } },
    ];

    const contatosUltimaSemanaPipeline = [
      { $match: { dataContato: { $gte: seteDiasAtras } } },
      { $group: { _id: '$tipo', total: { $sum: 1 } } },
      { $project: { _id: 0, tipo: '$_id', total: 1 } },
    ];

    const [leadsPorStatus, contatosPorTipo] = await Promise.all([
      db.collection(LEADS).aggregate(leadsPorStatusPipeline).toArray(),
      db.collection(CONTATOS).aggregate(contatosUltimaSemanaPipeline).toArray(),
    ]);

    const totalContatosUltimaSemana = contatosPorTipo.reduce((acumulado, item) => acumulado + item.total, 0);

    res.status(200).json({
      leadsPorStatus,
      interacoesUltimaSemana: {
        total: totalContatosUltimaSemana,
        porTipo: contatosPorTipo,
      },
      geradoEm: new Date(),
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao gerar relatório de conversão.' });
  }
}

module.exports = { relatorioConversao };
