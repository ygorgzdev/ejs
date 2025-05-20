const mongoose = require('mongoose');

// Função para conectar ao MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Opções de conexão recomendadas para evitar warnings
      retryWrites: true,
      w: 'majority'
    });

    console.log('Conectado ao MongoDB com sucesso!!!');

    // Configurando event listeners para a conexão
    mongoose.connection.on('error', (err) => {
      console.error('Erro na conexão MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('Desconectado do MongoDB');
    });

    // Tratamento para fechamento limpo da conexão caso a aplicação seja encerrada
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Conexão com MongoDB encerrada devido ao encerramento da aplicação');
      process.exit(0);
    });

    return mongoose.connection;
  } catch (err) {
    console.error('Erro ao conectar ao MongoDB:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;