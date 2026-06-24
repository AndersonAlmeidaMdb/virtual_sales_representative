const express = require('express');
const { cadenciaDoDia } = require('../controllers/dashboard.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Próxima ação da cadência diária do SDR
 */

/**
 * @swagger
 * /api/dashboard/cadencia:
 *   get:
 *     summary: Lista a cadência do dia agrupada por tipo de tarefa
 *     description: >
 *       Retorna as tarefas do dia ainda não concluídas, agrupadas por tipo
 *       (Email, Ligacao, etc.) e ordenadas pela data de vencimento mais antiga,
 *       com os dados do lead vinculado.
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Cadência do dia agrupada por tipo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   tipo:
 *                     type: string
 *                     example: Email
 *                   totalTarefas:
 *                     type: integer
 *                     example: 2
 *                   tarefas:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/Tarefa'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.get('/cadencia', cadenciaDoDia);

module.exports = router;
