const express = require('express');
const {
  criarLead,
  listarLeads,
  buscarLeadPorId,
  atualizarLead,
  removerLead,
  qualificarLead,
} = require('../controllers/leads.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Leads
 *   description: Gestão de leads do funil de pré-venda
 */

/**
 * @swagger
 * /api/leads:
 *   post:
 *     summary: Cria um novo lead
 *     tags: [Leads]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NovoLead'
 *     responses:
 *       201:
 *         description: Lead criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lead'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.post('/', criarLead);

/**
 * @swagger
 * /api/leads:
 *   get:
 *     summary: Lista leads, com filtro opcional por status
 *     tags: [Leads]
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [Novo, Em Contato, Qualificado, Descartado]
 *         description: Filtra leads pelo status atual
 *     responses:
 *       200:
 *         description: Lista de leads
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Lead'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.get('/', listarLeads);

/**
 * @swagger
 * /api/leads/{id}:
 *   get:
 *     summary: Busca um lead pelo ID
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId do lead
 *     responses:
 *       200:
 *         description: Lead encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lead'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       404:
 *         description: Lead não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.get('/:id', buscarLeadPorId);

/**
 * @swagger
 * /api/leads/{id}:
 *   put:
 *     summary: Atualiza os dados cadastrais de um lead
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId do lead
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NovoLead'
 *     responses:
 *       200:
 *         description: Lead atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lead'
 *       400:
 *         description: ID inválido ou nenhum campo enviado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       404:
 *         description: Lead não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.put('/:id', atualizarLead);

/**
 * @swagger
 * /api/leads/{id}:
 *   delete:
 *     summary: Remove um lead
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId do lead
 *     responses:
 *       200:
 *         description: Lead removido com sucesso
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       404:
 *         description: Lead não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.delete('/:id', removerLead);

/**
 * @swagger
 * /api/leads/{id}/qualificar:
 *   put:
 *     summary: Passagem de bastão - qualifica o lead (SQL) e atualiza o produto de interesse
 *     description: >
 *       Altera o status do lead para "Qualificado" e atualiza a flag/contador de interesse
 *       (`flagAltaDemanda`, `qtdLeadsQualificados`) do produto vinculado ao lead.
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId do lead
 *     responses:
 *       200:
 *         description: Lead qualificado e produto atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lead:
 *                   $ref: '#/components/schemas/Lead'
 *                 produto:
 *                   $ref: '#/components/schemas/Produto'
 *       400:
 *         description: ID inválido ou lead sem produto de interesse vinculado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       404:
 *         description: Lead não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.put('/:id/qualificar', qualificarLead);

module.exports = router;
