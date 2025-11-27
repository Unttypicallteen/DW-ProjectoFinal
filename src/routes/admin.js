const express = require("express");
const router = express.Router();
const { requireAdmin } = require("../middlewares/auth");

const Cita = require("../models/cita");
const Reserva = require("../models/reserva");
const Producto = require("../models/producto");
const User = require("../models/user");
const Venta = require("../models/venta");
const multer = require("multer");

// ======================
// MULTER
// ======================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

const HORAS = ["10:00","11:00","12:00","13:00","14:00","15:00","16:00"];

/* DASHBOARD ADMIN */
router.get("/", requireAdmin, async (req, res) => {
  try {
    let { fecha, metodo } = req.query;
    const baseDate = fecha ? new Date(fecha) : new Date();

    const inicioDia = new Date(Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
      0,0,0,0
    ));
    const finDia = new Date(Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
      23,59,59,999
    ));
    const inicioMes = new Date(Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      1,0,0,0,0
    ));
    const finMes = new Date(Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth() + 1,
      0,23,59,59,999
    ));

    const filtroVentasDia = { fecha: { $gte: inicioDia, $lte: finDia } };
    if (metodo && metodo !== "todos") filtroVentasDia.metodoPago = metodo;

    const ventasFiltradasDia = await Venta.find(filtroVentasDia)
      .populate("usuario", "nombre")
      .sort({ fecha: -1 });

    const totalDiaFiltrado = ventasFiltradasDia.reduce(
      (acc, v) => acc + (Number(v.total) || 0),
      0
    );

    const ventasDiaGeneral = await Venta.find({
      fecha: { $gte: inicioDia, $lte: finDia },
    });
    const totalDiaGeneral = ventasDiaGeneral.reduce(
      (acc, v) => acc + (Number(v.total) || 0),
      0
    );

    const ventasMesGeneral = await Venta.find({
      fecha: { $gte: inicioMes, $lte: finMes },
    });
    const totalMesGeneral = ventasMesGeneral.reduce(
      (acc, v) => acc + (Number(v.total) || 0),
      0
    );

    const filtroMes = { fecha: { $gte: inicioMes, $lte: finMes } };
    if (metodo && metodo !== "todos") filtroMes.metodoPago = metodo;

    const ventasMesFiltradas = await Venta.find(filtroMes);
    const totalMesFiltrado = ventasMesFiltradas.reduce(
      (acc, v) => acc + (Number(v.total) || 0),
      0
    );

    const hoyDate = new Date();
    const hoyStr = hoyDate.toISOString().slice(0, 10);
    const tresDiasDespues = new Date();
    tresDiasDespues.setDate(hoyDate.getDate() + 3);
    const hastaTresDias = tresDiasDespues.toISOString().slice(0, 10);

    const citas = await Cita.find({
      estado: "activa",
      dia: { $gte: hoyStr, $lte: hastaTresDias },
    })
      .sort({ dia: 1, hora: 1 })
      .populate("usuario", "nombre email telefono");

    const reservas = await Reserva.find({ estado: "activa" })
      .populate("usuario", "nombre email")
      .populate("producto.id", "name price img");

    const productos = await Producto.find();
    const usuarios = await User.find();

    const citasHoy = citas.length;
    const reservasHoy = reservas.length;
    const productosCriticos = productos.filter(p => p.stock <= 5).length;
    const ventasHoy = ventasDiaGeneral.length;

    const ordenarCriticos = (a, b) => {
      if (a.stock <= 5 && b.stock > 5) return -1;
      if (a.stock > 5 && b.stock <= 5) return 1;
      return a.stock - b.stock;
    };

    const productosPerros = productos
      .filter(p => p.category === "perros")
      .sort(ordenarCriticos);
    const productosGatos = productos
      .filter(p => p.category === "gatos")
      .sort(ordenarCriticos);
    const productosOtros = productos
      .filter(p => p.category === "otros")
      .sort(ordenarCriticos);
    const productosCriticosLista = productos
      .filter(p => p.stock <= 5)
      .sort((a, b) => a.stock - b.stock);

    res.render("admin", {
      userName: req.user.nombre,
      citas,
      reservas,
      usuarios,
      productos,
      productosPerros,
      productosGatos,
      productosOtros,
      productosCriticosLista,
      citasHoy,
      reservasHoy,
      ventasHoy,
      productosCriticos,
      ventas: ventasFiltradasDia,
      totalDiaGeneral,
      totalDiaFiltrado,
      totalMesGeneral,
      totalMesFiltrado,
      fechaFiltro: fecha || "",
      metodoFiltro: metodo || "todos",
    });
  } catch (err) {
    console.error("ERROR en /admin:", err);
    res.status(500).send("Error cargando panel del administrador");
  }
});

/* COMPRAS */
router.get("/compras", requireAdmin, (req, res) => {
  res.render("compras", { userName: req.user.nombre });
});

router.post("/compras/buscarUsuario", requireAdmin, async (req, res) => {
  const { nombreUsuario } = req.body;

  let usuario = await User.findOne({ nombre: nombreUsuario.trim() });

  const reservas = usuario
    ? await Reserva.find({ usuario: usuario._id, estado: "activa" }).populate(
        "producto.id"
      )
    : [];

  const productos = await Producto.find();

  res.json({
    usuario,
    reservas,
    productos,
    servicios: [
      { id: "antirrabica", nombre: "Vacuna Antirrábica", precio: 45000 },
      { id: "quintuple", nombre: "Vacuna Quíntuple", precio: 80000 },
      { id: "sextuple", nombre: "Vacuna Séxtuple", precio: 85000 },
      { id: "baño", nombre: "Baño", precio: 30000 },
      { id: "corte", nombre: "Corte", precio: 35000 },
      { id: "baño_corte", nombre: "Baño + Corte", precio: 55000 },
      { id: "control", nombre: "Consulta de Control", precio: 35000 },
      { id: "urgencia_leve", nombre: "Urgencia leve", precio: 40000 },
      { id: "revision_general", nombre: "Revisión general", precio: 35000 },
    ],
  });
});

router.post("/compras/registrar", requireAdmin, async (req, res) => {
  try {
    let {
      usuarioId,
      reservasSeleccionadas = [],
      productosSeleccionados = [],
      serviciosSeleccionados = [],
      metodoPago,
      total,
    } = req.body;

    if (typeof reservasSeleccionadas === "string")
      reservasSeleccionadas = [reservasSeleccionadas];

    if (typeof productosSeleccionados === "string")
      productosSeleccionados = JSON.parse(productosSeleccionados);

    if (typeof serviciosSeleccionados === "string")
      serviciosSeleccionados = JSON.parse(serviciosSeleccionados);

    let productosFinal = [];

    for (const p of productosSeleccionados) {
      const prodDB = await Producto.findById(p.id);

      productosFinal.push({
        id: prodDB._id,
        nombre: prodDB.name,
        cantidad: Number(p.cantidad),
        precioUnitario: Number(prodDB.price),
      });
    }

    for (const idReserva of reservasSeleccionadas) {
      const reserva = await Reserva.findById(idReserva).populate("producto.id");

      productosFinal.push({
        id: reserva.producto.id._id,
        nombre: reserva.producto.id.name,
        cantidad: reserva.cantidad,
        precioUnitario: reserva.producto.id.price,
      });
    }

    await Venta.create({
      usuario: usuarioId || null,
      metodoPago,
      total,
      fecha: new Date(),
      productos: productosFinal,
      servicios: serviciosSeleccionados,
    });

    for (const id of reservasSeleccionadas) {
      await Reserva.findByIdAndUpdate(id, { estado: "entregada" });
    }

    for (const p of productosFinal) {
      await Producto.findByIdAndUpdate(p.id, {
        $inc: { stock: -Number(p.cantidad) },
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Error registrando compra:", err);
    res.status(500).send("Error registrando compra");
  }
});

router.get("/ventas/:id", requireAdmin, async (req, res) => {
  const venta = await Venta.findById(req.params.id)
    .populate("usuario", "nombre")
    .populate("productos.id", "name price img");

  res.json(venta);
});

/* CRUD PRODUCTOS */
router.post("/producto/nuevo", requireAdmin, upload.single("img"), async (req, res) => {
  try {
    const { name, price, stock, category } = req.body;

    await Producto.create({
      name,
      price,
      stock,
      category,
      img: req.file ? `/uploads/${req.file.filename}` : "/img/default-product.png",
    });

    res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

router.post("/producto/:id", requireAdmin, upload.single("img"), async (req, res) => {
  try {
    const { name, price, stock, category } = req.body;
    const update = { name, price, stock, category };

    if (req.file) {
      update.img = `/uploads/${req.file.filename}`;
    }

    await Producto.findByIdAndUpdate(req.params.id, update);

    res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

router.delete("/producto/:id", requireAdmin, async (req, res) => {
  try {
    await Producto.findByIdAndDelete(req.params.id);
    res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error eliminando producto");
  }
});

/* USUARIOS */
router.post("/usuario/:id", requireAdmin, async (req, res) => {
  try {
    const { rol } = req.body;
    await User.findByIdAndUpdate(req.params.id, { rol });
    res.send("OK");
  } catch (err) {
    console.error("Error editando usuario:", err);
    res.status(500).send("Error");
  }
});

router.delete("/usuario/:id", requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.send("OK");
  } catch (err) {
    console.error("Error eliminando usuario:", err);
    res.status(500).send("Error");
  }
});

router.put("/usuario/:id", requireAdmin, async (req, res) => {
  try {
    const { nombre, rol } = req.body;

    await User.findByIdAndUpdate(req.params.id, {
      nombre,
      rol,
    });

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

module.exports = router;
