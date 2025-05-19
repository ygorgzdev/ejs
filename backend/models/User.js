const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Schema do Usuário corrigido
const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'O nome é obrigatório'] 
  },
  email: { 
    type: String, 
    required: [true, 'O email é obrigatório'], 
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Por favor, forneça um email válido'] 
  },
  password: { 
    type: String, 
    required: [true, 'A senha é obrigatória'],
    minlength: [6, 'A senha deve ter pelo menos 6 caracteres'] 
  },
  role: { 
    type: String, 
    enum: ['developer', 'investor'], 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  bio: { 
    type: String, 
    default: '' 
  },
  skills: { 
    type: [String], 
    default: [] 
  },
  avatar: { 
    type: String, 
    default: '' 
  },
  projects: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project' 
  }]
});

// Método para criptografar a senha antes de salvar
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar senhas
UserSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);