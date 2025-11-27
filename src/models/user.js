const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: {
    type: String,
    unique: true,
    lowercase: true,   // <-- convierte en minúscula automáticamente
    trim: true         // <-- limpia espacios
  },
  password: { type: String, required: true },
  rol: { type: String, required: true },

  telefono: { type: String, default: '' },
  avatar: { type: String, default: '/img/perfil/default.png' },

  creado: { type: Date, default: Date.now },
  actualizado: { type: Date, default: Date.now },

  // 🔥 NUEVOS CAMPOS PARA RESET PASSWORD 🔥
  resetToken: { type: String, default: null },
  resetTokenExpire: { type: Date, default: null }
});

module.exports = mongoose.model('User', userSchema, 'users');
