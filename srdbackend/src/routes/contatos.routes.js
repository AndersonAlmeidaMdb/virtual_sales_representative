const express = require('express');
const {
  criarContato,
  listarContatos,
  buscarContatoPorId,
  atualizarContato,
  removerContato,
} = require('../controllers/contatos.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Contatos
 *   description: Histórico de interações (ligações, e-mails, etc.) com os leads
 */

/**
 * @swagger
 * /api/contatos:
 *   post:
 *     summary: Registra uma interação com o lead e, opcionalmente, agenda a próxima tarefa
 *     description: >
 *       Salva o histórico de contato (ex.: ligação realizada) e, se o campo `proximaTarefa`
 *       for enviado, agenda em background a próxima tarefa de cadência para aquele lead
 *       sem bloquear a resposta desta requisição.
 *     tags: [Contatos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NovoContato'
 *     responses:
 *       201:
 *         description: Contato registrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contato'
 *       400:
 *         description: Dados inválidos
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
router.post('/', criarContato);

/**
 * @swagger
 * /api/contatos:
 *   get:
 *     summary: Lista contatos, com filtro opcional por lead
 *     tags: [Contatos]
 *     parameters:
 *       - in: query
 *         name: leadId
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtra contatos de um lead específico
 *     responses:
 *       200:
 *         description: Lista de contatos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Contato'
 *       400:
 *         description: leadId inválido
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
router.get('/', listarContatos);

/**
 * @swagger
 * /api/contatos/{id}:
 *   get:
 *     summary: Busca um contato pelo ID
 *     tags: [Contatos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId do contato
 *     responses:
 *       200:
 *         description: Contato encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contato'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       404:
 *         description: Contato não encontrado
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
router.get('/:id', buscarContatoPorId);

/**
 * @swagger
 * /api/contatos/{id}:
 *   put:
 *     summary: Atualiza os dados de um contato (tipo, notas, resultado)
 *     tags: [Contatos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId do contato
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tipo:
 *                 type: string
 *                 enum: [Email, Ligacao, WhatsApp, Reuniao]
 *               notas:
 *                 type: string
 *               resultado:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contato atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contato'
 *       400:
 *         description: ID inválido ou nenhum campo enviado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       404:
 *         description: Contato não encontrado
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
router.put('/:id', atualizarContato);

/**
 * @swagger
 * /api/contatos/{id}:
 *   delete:
 *     summary: Remove um contato
 *     tags: [Contatos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId do contato
 *     responses:
 *       200:
 *         description: Contato removido com sucesso
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       404:
 *         description: Contato não encontrado
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
router.delete('/:id', removerContato);

module.exports = router;
