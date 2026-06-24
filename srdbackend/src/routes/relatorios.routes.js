const express = require('express');
const { relatorioConversao } = require('../controllers/relatorios.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Relatorios
 *   description: Relatórios de conversão e desempenho do SDR
 */

/**
 * @swagger
 * /api/relatorios/conversao:
 *   get:
 *     summary: Resumo de conversão - leads por status e interações da última semana
 *     description: >
 *       Utiliza a API de Aggregation do MongoDB para somar quantos leads existem
 *       em cada status e o total de contatos/interações realizados nos últimos 7 dias.
 *     tags: [Relatorios]
 *     responses:
 *       200:
 *         description: Resumo de conversão gerado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 leadsPorStatus:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       status:
 *                         type: string
 *                         example: Qualificado
 *                       totalLeads:
 *                         type: integer
 *                         example: 5
 *                 interacoesUltimaSemana:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 12
 *                     porTipo:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tipo:
 *                             type: string
 *                             example: Ligacao
 *                           total:
 *                             type: integer
 *                             example: 7
 *                 geradoEm:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.get('/conversao', relatorioConversao);

module.exports = router;
