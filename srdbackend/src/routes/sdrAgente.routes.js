const express = require('express');
const { processarMensagemSdr } = require('../controllers/sdrAgente.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: SDR Virtual
 *   description: Agente de IA (LLM) para atendimento inbound e qualificação inicial de leads
 */

/**
 * @swagger
 * /api/v1/sdr/message:
 *   post:
 *     summary: Processa uma mensagem inbound de um lead através do SDR virtual
 *     description: >
 *       Recebe a mensagem de um lead (criando-o se `lead_id` não for informado), consulta o histórico de
 *       conversa em `contatos`, usa um modelo de linguagem (OpenAI) para responder e qualificar o lead
 *       (ICP + orçamento) e, ao atingir um marco (reunião agendada ou lead descartado), cria automaticamente
 *       a tarefa de próximo passo em `tarefas`.
 *     tags: [SDR Virtual]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MensagemSdrEntrada'
 *     responses:
 *       200:
 *         description: Resposta do SDR virtual gerada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensagemSdrSaida'
 *       400:
 *         description: Dados inválidos (mensagem ausente ou lead_id malformado)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       404:
 *         description: lead_id informado não foi encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       500:
 *         description: Erro interno (banco de dados ou configuração da OpenAI ausente)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       502:
 *         description: Erro ao consultar ou interpretar a resposta do motor de IA
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       504:
 *         description: Tempo limite excedido ao consultar o motor de IA
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.post('/message', processarMensagemSdr);

module.exports = router;
