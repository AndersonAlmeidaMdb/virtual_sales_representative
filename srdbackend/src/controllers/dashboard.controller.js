const { getDb } = require('../config/db');
const { TAREFAS } = require('../config/collections');

// Próxima ação da cadência: tarefas do dia, não concluídas, agrupadas por tipo
// (Email, Ligacao, ...) e ordenadas pela data de vencimento mais antiga.
async function cadenciaDoDia(req, res) {
  try {
    const db = getDb();

    const inicioDoDia = new Date();
    inicioDoDia.setHours(0, 0, 0, 0);
    const fimDoDia = new Date();
    fimDoDia.setHours(23, 59, 59, 999);

    const pipeline = [
      {
        $match: {
          concluida: false,
          dataVencimento: { $gte: inicioDoDia, $lte: fimDoDia },
        },
      },
      // Ordena antes de agrupar para que cada grupo já saia com a tarefa mais antiga primeiro.
      { $sort: { dataVencimento: 1 } },
      {
        $lookup: {
          from: 'leads',
          localField: 'leadId',
          foreignField: '_id',
          as: 'lead',
        },
      },
      { $unwind: { path: '$lead', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          tipo: 1,
          descricao: 1,
          dataVencimento: 1,
          leadId: 1,
          'lead.nome': 1,
          'lead.empresa': 1,
          'lead.email': 1,
        },
      },
      {
        $group: {
          _id: '$tipo',
          totalTarefas: { $sum: 1 },
          tarefas: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          _id: 0,
          tipo: '$_id',
          totalTarefas: 1,
          tarefas: 1,
        },
      },
      { $sort: { tipo: 1 } },
    ];

    const cadencia = await db.collection(TAREFAS).aggregate(pipeline).toArray();

    res.status(200).json(cadencia);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao gerar a cadência do dia.' });
  }
}

module.exports = { cadenciaDoDia };
