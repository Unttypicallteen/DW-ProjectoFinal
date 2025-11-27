const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");

const Producto = require("../models/producto");
const Reserva = require("../models/reserva");

// Mostrar catálogo
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const CATEGORIES = ["perros", "gatos", "otros"];

    const cat = CATEGORIES.includes((req.query.cat || "").toLowerCase())
      ? req.query.cat
      : "perros";

    // Obtener productos desde MongoDB
    const products = await Producto.find({ category: cat }).lean();

    res.render("catalogo", {
      userName: req.session.user.nombre,
      categories: CATEGORIES,
      products: products,
      activeCategory: cat,
      message: req.query.msg || null,
    });

  } catch (err) {
    console.error("❌ Error cargando catálogo:", err);
    res.redirect("/dashboard");
  }
});

// Crear reserva (con control de stock)
router.post("/reservar", isLoggedIn, async (req, res) => {
  try {
    const { productId, qty } = req.body;

    console.log("🟢 Recibido en POST /catalogo/reservar:", { productId, qty });

    const cantidadSolicitada = parseInt(qty, 10) || 1;

    // Buscar producto real en Mongo
    const product = await Producto.findById(productId);

    if (!product) {
      return res.status(404).json({ ok: false, message: "Producto no encontrado." });
    }

    // Validar stock
    if (product.stock < cantidadSolicitada) {
      return res.json({
        ok: false,
        message: `Solo quedan ${product.stock} unidad(es) de "${product.name}".`,
      });
    }

    // Descontar stock
    product.stock -= cantidadSolicitada;
    await product.save();

    // Crear reserva
    const fechaReserva = new Date();
    fechaReserva.setDate(fechaReserva.getDate() + 2);

    const reserva = new Reserva({
      usuario: req.session.user.id,
      producto: {
        id: product._id,
        nombre: product.name,
        precio: product.price,
        img: product.img,
      },
      cantidad: cantidadSolicitada,
      fechaReserva,
    });

    await reserva.save();

    const message = `Reservaste ${cantidadSolicitada} unidad(es) de "${product.name}".`;

    // Respuesta AJAX
    if (req.xhr || req.get("Accept").includes("application/json")) {
      return res.json({ ok: true, message });
    }

    res.redirect(`/catalogo?msg=${encodeURIComponent(message)}`);

  } catch (err) {
    console.error("❌ Error en POST /reservar:", err);
    res.status(500).json({
      ok: false,
      message: "No se pudo completar la reserva.",
    });
  }
});

module.exports = router;
