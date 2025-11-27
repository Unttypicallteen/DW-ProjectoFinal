const mongoose = require("mongoose");

const productoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  price: {
    type: Number,
    required: true,
    min: 0,
  },

  category: {
    type: String,
    required: true,
    enum: ["perros", "gatos", "otros"],
  },

  grade: String,
  age: String,

  img: {
    type: String,
    required: true,
  },

  // 🔥 Campo más importante
  stock: {
    type: Number,
    default: 0,
    min: 0,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model("Producto", productoSchema);
