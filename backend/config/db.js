// backend/config/db.js (melhorado)

const mongoose = require('mongoose');

// Função para conectar ao MongoDB com melhorias
const connectDB = async () => {
  try {
    // Definir opções de conexão mais robustas
    const options = {
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10, // Controlar tamanho do pool de conexões
      connectTimeoutMS: 30000, // Timeout de conexão de 30 segundos
      socketTimeoutMS: 45000, // Timeout para operações de 45 segundos
      serverSelectionTimeoutMS: 30000, // Timeout para seleção de servidor
      heartbeatFrequencyMS: 10000, // Intervalo de verificação de conexão
      minPoolSize: 1, // Manter pelo menos uma conexão aberta
      maxIdleTimeMS: 30000, // Tempo máximo de conexão inativa
      family: 4 // Forçar IPv4
    };

    // Verificar se a URI do MongoDB está definida
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI não definida no arquivo .env');
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, options);

    console.log(`MongoDB conectado: ${conn.connection.host}`);

    // Tratar eventos da conexão
    mongoose.connection.on('error', (err) => {
      console.error(`Erro na conexão MongoDB: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('Desconectado do MongoDB');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('Reconectado ao MongoDB');
    });

    // Tratamento para fechamento limpo da conexão
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Conexão com MongoDB encerrada devido ao encerramento da aplicação');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await mongoose.connection.close();
      console.log('Conexão com MongoDB encerrada devido ao término da aplicação');
      process.exit(0);
    });

    return mongoose.connection;
  } catch (err) {
    console.error(`Erro ao conectar ao MongoDB: ${err.message}`);
    // Registrar detalhes adicionais do erro em ambientes de desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      console.error(err);
    }
    process.exit(1);
  }
};

// Função auxiliar para iniciar transações no MongoDB
exports.withTransaction = async (callback) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  connectDB,
  withTransaction: exports.withTransaction
};