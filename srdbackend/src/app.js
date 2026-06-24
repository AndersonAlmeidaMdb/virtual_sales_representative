const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./config/swagger');
const leadsRoutes = require('./routes/leads.routes');
const produtosRoutes = require('./routes/produtos.routes');
const contatosRoutes = require('./routes/contatos.routes');
const tarefasRoutes = require('./routes/tarefas.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const relatoriosRoutes = require('./routes/relatorios.routes');
const sdrAgenteRoutes = require('./routes/sdrAgente.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

app.use('/api/leads', leadsRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/contatos', contatosRoutes);
app.use('/api/tarefas', tarefasRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/v1/sdr', sdrAgenteRoutes);

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// Handler de erros central: garante retorno HTTP estruturado para falhas não tratadas nas rotas.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ erro: err.message || 'Erro interno do servidor.' });
});

module.exports = app;
