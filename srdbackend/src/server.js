require('dotenv').config();

const app = require('./app');
const { connectToDatabase, closeDatabaseConnection } = require('./config/db');

const PORT = process.env.PORT || 3000;

async function iniciar() {
  try {
    await connectToDatabase();

    const server = app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });

    const encerrarComGraca = async () => {
      console.log('Encerrando servidor...');
      server.close();
      await closeDatabaseConnection();
      process.exit(0);
    };

    process.on('SIGINT', encerrarComGraca);
    process.on('SIGTERM', encerrarComGraca);
  } catch (erro) {
    console.error('Falha ao iniciar o servidor:', erro);
    process.exit(1);
  }
}

iniciar();
