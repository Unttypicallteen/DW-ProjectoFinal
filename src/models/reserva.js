const mongoose = require('mongoose');
const { Schema } = mongoose;

const reservaSchema = new Schema({
  usuario: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 🔥 PRODUCTO REFERENCIADO DESDE MONGO
  producto: {
    id: {
      type: Schema.Types.ObjectId,   // ✔ AHORA SÍ ACEPTA _id REAL
      ref: 'Producto',
      required: true
    },
    nombre: String,
    precio: Number,
    img: String
  },

  cantidad: {
    type: Number,
    default: 1
  },

  fechaReserva: {
    type: Date,
    default: Date.now
  },

  estado: {
    type: String,
    enum: ['activa', 'cancelada', 'completada'],
    default: 'activa'
  }
});

module.exports = mongoose.model('Reserva', reservaSchema);
