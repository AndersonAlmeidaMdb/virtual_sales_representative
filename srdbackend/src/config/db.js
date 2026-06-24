const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'sdr_crm';

if (!uri) {
  throw new Error('A variável de ambiente MONGODB_URI não foi definida.');
}

const client = new MongoClient(uri);

let db = null;

async function connectToDatabase() {
  if (db) {
    return db;
  }

  await client.connect();
  db = client.db(dbName);
  console.log(`Conectado ao MongoDB (database: "${dbName}")`);

  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Banco de dados não inicializado. Chame connectToDatabase() antes de usar getDb().');
  }
  return db;
}

// Expõe o MongoClient já conectado para quem precisar dele diretamente (ex.: o
// MongoDBSaver do LangGraph, que exige um client e não um Db) — evita abrir uma
// segunda conexão duplicada com o mesmo MongoDB.
function getMongoClient() {
  return client;
}

async function closeDatabaseConnection() {
  await client.close();
  db = null;
}

module.exports = { connectToDatabase, getDb, getMongoClient, closeDatabaseConnection };
