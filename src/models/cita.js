// src/models/cita.js
const mongoose = require("mongoose");

const citaSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  tipo: { type: String, required: true },          // vacuna, grooming, medica
  especie: { type: String, required: true },       // Perro, Gato, Otro
  servicio: { type: String, required: true },      // Antirrábica, Baño, etc.
  dia: { type: String, required: true },           // YYYY-MM-DD
  hora: { type: String, required: true },          // 10:00, 14:00...
  estado: { type: String, default: "activa" },
  fechaCreacion: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Cita", citaSchema);
