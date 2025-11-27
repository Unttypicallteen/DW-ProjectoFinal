const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");
const User = require("../models/user");
const Reserva = require("../models/reserva");
const Cita = require("../models/cita");
const Producto = require("../models/producto");   // <<--- AQUI

const upload = require("../config/multer");

/* =========================
   PERFIL PRINCIPAL
========================= */
router.get("/", isLoggedIn, async (req, res) => {
  const user = await User.findById(req.session.user.id);
  res.render("perfil", { userName: user.nombre, user });
});

router.get("/info", isLoggedIn, async (req, res) => {
  const user = await User.findById(req.session.user.id);

  // Convertir fecha a formato más bonito
  const fechaCreada = new Date(user.creado).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  // Contar actividad
  const reservasActivas = await Reserva.countDocuments({
    usuario: req.session.user.id,
    estado: "activa"
  });

  const citasActivas = await Cita.countDocuments({
    usuario: req.session.user.id,
    estado: "activa"
  });

  res.render("perfil-info", {
    userName: user.nombre,
    user,
    reservasActivas,
    citasActivas,
    fechaCreada    // 👈 enviamos la fecha ya formateada
  });
});




/* =========================
   EDITAR PERFIL
========================= */
router.get("/editar", isLoggedIn, async (req, res) => {
  const user = await User.findById(req.session.user.id);
  res.render("perfil-editar", { userName: user.nombre, user });
});

router.post("/editar", isLoggedIn, async (req, res) => {
  try {
    const { nombre, email, tel, pass } = req.body;

    const update = {
      nombre,
      email,
      telefono: tel,
      actualizado: new Date()
    };

    // Si escribió contraseña → actualizar
    if (pass && pass.length >= 6) {
      update.password = pass;
    }

    await User.findByIdAndUpdate(req.session.user.id, update);

    return res.json({ ok: true, message: "Datos actualizados correctamente" });

  } catch (err) {
    console.error(err);
    return res.json({ ok: false, message: "Error actualizando datos" });
  }
});



/* =========================
   RESERVAS Y CITAS (Mongo)
========================= */
/* =========================
   RESERVAS Y CITAS (Mongo)
========================= */
router.get("/reservas", isLoggedIn, async (req, res) => {
  try {
    const tipo = req.query.tipo || "productos";

    const [reservas, citas] = await Promise.all([
      Reserva.find({ usuario: req.session.user.id }).populate("producto.id"),
      Cita.find({ usuario: req.session.user.id })
    ]);

    const hoy = new Date();
    const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    /* =========================
       FORMATEAR RESERVAS
    ========================== */
    const reservasFmt = reservas.map(r => {
      const f = new Date(r.fechaReserva);

      let estado = r.estado; 
      // estado puede ser: activa | cancelada | entregada

      return {
        _id: r._id,
        tipo: "producto",
        nombre: r.producto?.nombre,
        img: r.producto?.img,
        precio: r.producto?.price,
        cantidad: r.cantidad,
        fecha: f.toLocaleDateString("es-CO"),
        estado
      };
    });

    /* =========================
       FORMATEAR CITAS
    ========================== */
    const citasFmt = citas.map(c => {
      const [y, m, d] = c.dia.split("-");
      const fechaCita = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));

      let estado = c.estado; // activa o cancelada

      return {
        _id: c._id,
        tipo: "cita",
        nombre: `${c.tipo} (${c.servicio})`,
        img:
          c.tipo === "vacuna"
            ? "/img/servicios/vacuna.png"
            : c.tipo === "grooming"
              ? "/img/servicios/grooming.png"
              : "/img/servicios/consulta.png",
        fecha: `${c.dia} ${c.hora}`,
        estado,
        pasada: fechaCita < hoySinHora // para moverlas a historial
      };
    });

    /* =========================
       FILTRO FINAL
    ========================== */
    let items = [];

    if (tipo === "productos") {
      items = reservasFmt.filter(i => i.estado === "activa");
    }

    else if (tipo === "citas") {
      items = citasFmt.filter(i => i.estado === "activa" && !i.pasada);
    }

    else if (tipo === "historial") {
      items = [...reservasFmt, ...citasFmt].filter(i =>
        i.estado === "vencida" || i.estado === "cancelada" || i.estado === "entregada"
      );
    }


    res.render("reservas", {
      userName: req.session.user.nombre,
      items,
      tipo
    });

  } catch (err) {
    console.error("❌ Error cargando reservas:", err);
    res.redirect("/dashboard");
  }
});


/* =========================
   CANCELAR RESERVA O CITA
========================= */
router.post("/cancelar", isLoggedIn, async (req, res) => {
  try {
    const { id, tipo } = req.body;

    if (!id || !tipo) {
      return res.json({ ok: false, message: "Datos incompletos." });
    }

    // ---------- CANCELAR RESERVA O CITA ----------
    let item;

    if (tipo === "productos") {
      item = await Reserva.findById(id);

      if (!item) return res.json({ ok: false, message: "Reserva no encontrada." });

      // 🔥 1. Actualizar estado
      item.estado = "cancelada";
      await item.save();

      // 🔥 2. Devolver stock
      await Producto.findByIdAndUpdate(
        item.producto.id,
        { $inc: { stock: item.cantidad } }
      );

      return res.json({
        ok: true,
        message: "Reserva cancelada y stock actualizado."
      });
    }

    // ---------- CANCELAR CITA ----------
    if (tipo === "citas") {
      item = await Cita.findById(id);

      if (!item) return res.json({ ok: false, message: "Cita no encontrada." });

      item.estado = "cancelada";
      await item.save();

      return res.json({
        ok: true,
        message: "Cita cancelada correctamente."
      });
    }

    return res.json({ ok: false, message: "Tipo no válido." });

  } catch (err) {
    console.error("❌ Error cancelando:", err);
    res.json({ ok: false, message: "Error al cancelar." });
  }
});

/* =========================
   ACTUALIZAR FOTO DE PERFIL
========================= */
router.post("/avatar", isLoggedIn, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect("/perfil/info");
    }

    await User.findByIdAndUpdate(req.session.user.id, {
      avatar: "/uploads/avatars/" + req.file.filename,
      actualizado: new Date()
    });

    res.redirect("/perfil/info");

  } catch (err) {
    console.error("❌ Error subiendo avatar:", err);
    res.redirect("/perfil/info");
  }
});

module.exports = router;
