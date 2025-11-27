const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/auth");
const Producto = require("../models/producto");
const Reserva = require("../models/reserva");

// MOSTRAR CATÁLOGO
router.get("/", requireAuth, async (req, res) => {
  try {
    const CATEGORIES = ["perros", "gatos", "otros"];

    const cat = CATEGORIES.includes((req.query.cat || "").toLowerCase())
      ? req.query.cat
      : "perros";

    const products = await Producto.find({ category: cat }).lean();

    res.render("catalogo", {
      userName: req.user.nombre,
      categories: CATEGORIES,
      products,
      activeCategory: cat,
      message: req.query.msg || null,
    });
  } catch (err) {
    console.error("❌ Error cargando catálogo:", err);
    res.redirect("/dashboard");
  }
});

// RESERVAR PRODUCTO
router.post("/reservar", requireAuth, async (req, res) => {
  try {
    const { productId, qty } = req.body;

    const cantidadSolicitada = parseInt(qty, 10) || 1;

    const product = await Producto.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ ok: false, message: "Producto no encontrado." });
    }

    if (product.stock < cantidadSolicitada) {
      return res.json({
        ok: false,
        message: `Solo quedan ${product.stock} unidad(es) de "${product.name}".`,
      });
    }

    product.stock -= cantidadSolicitada;
    await product.save();

    const fechaReserva = new Date();
    fechaReserva.setDate(fechaReserva.getDate() + 2);

    const reserva = new Reserva({
      usuario: req.user.id,
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

    if (req.xhr || req.get("Accept")?.includes("application/json")) {
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
