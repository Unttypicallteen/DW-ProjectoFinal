const mongoose = require("mongoose");

const ventaSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  metodoPago: String,
  total: Number,
  fecha: { type: Date, default: Date.now },

  productos: [
    {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "Producto" },
      nombre: String,
      cantidad: Number,
      precioUnitario: Number
    }
  ],

  servicios: [
    {
      id: String,
      nombre: String,
      precio: Number
    }
  ]
});

module.exports = mongoose.model("Venta", ventaSchema);
