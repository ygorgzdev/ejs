const mongoose = require('mongoose');

// Schema do Projeto corrigido com valores em português
const ProjectSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'O título do projeto é obrigatório'] 
  },
  description: { 
    type: String, 
    required: [true, 'Descrição do projeto é obrigatória!']
  },
  status: {
    type: String, 
    required: true, 
    enum: ['Conceito', 'Em andamento', 'Versão beta', 'No ar (lançado)'], 
    default: 'Conceito',
  },
  category: { 
    type: String, 
    required: [true, 'A categoria do projeto é obrigatória!'], 
    enum: ['Desenvolvimento Web', 'Aplicativo Mobile', 'IA/Machine Learning', 'Blockchain', 'IoT', 'Jogos', 'Outros'],
  },
  fundingGoal: { 
    type: Number, 
    required: [true, 'A meta de financiamento é obrigatória'] 
  },
  creator: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  rewards: [String],
  currentFunding: {
    type: Number, 
    default: 0,
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

module.exports = mongoose.model('Project', ProjectSchema);