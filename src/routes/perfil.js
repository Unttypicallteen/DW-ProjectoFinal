const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/auth");

const User = require("../models/user");
const Reserva = require("../models/reserva");
const Cita = require("../models/cita");
const Producto = require("../models/producto");
const upload = require("../config/multer");

router.get("/", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.render("perfil", {
    userName: req.user.nombre,
    user,
  });
});

router.get("/info", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);

  const fechaCreada = new Date(user.creado).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const reservasActivas = await Reserva.countDocuments({
    usuario: req.user.id,
    estado: "activa",
  });

  const citasActivas = await Cita.countDocuments({
    usuario: req.user.id,
    estado: "activa",
  });

  res.render("perfil-info", {
    userName: req.user.nombre,
    user,
    reservasActivas,
    citasActivas,
    fechaCreada,
  });
});

router.get("/editar", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.render("perfil-editar", {
    userName: req.user.nombre,
    user,
  });
});

router.post("/editar", requireAuth, async (req, res) => {
  try {
    const { nombre, email, tel, pass } = req.body;

    const update = {
      nombre,
      email,
      telefono: tel,
      actualizado: new Date(),
    };

    if (pass && pass.length >= 6) {
      update.password = pass;
    }

    await User.findByIdAndUpdate(req.user.id, update);

    return res.json({ ok: true, message: "Datos actualizados correctamente" });
  } catch (err) {
    console.error(err);
    return res.json({ ok: false, message: "Error actualizando datos" });
  }
});

router.get("/reservas", requireAuth, async (req, res) => {
  try {
    const tipo = req.query.tipo || "productos";

    const [reservas, citas] = await Promise.all([
      Reserva.find({ usuario: req.user.id }).populate("producto.id"),
      Cita.find({ usuario: req.user.id }),
    ]);

    const hoy = new Date();
    const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    const reservasFmt = reservas.map((r) => {
      const f = new Date(r.fechaReserva);

      return {
        _id: r._id,
        tipo: "producto",
        nombre: r.producto?.nombre,
        img: r.producto?.img,
        precio: r.producto?.price,
        cantidad: r.cantidad,
        fecha: f.toLocaleDateString("es-CO"),
        estado: r.estado,
      };
    });

    const citasFmt = citas.map((c) => {
      const [y, m, d] = c.dia.split("-");
      const fechaCita = new Date(y, m - 1, d);

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
        estado: c.estado,
        pasada: fechaCita < hoySinHora,
      };
    });

    let items = [];

    if (tipo === "productos") {
      items = reservasFmt.filter((i) => i.estado === "activa");
    } else if (tipo === "citas") {
      items = citasFmt.filter((i) => i.estado === "activa" && !i.pasada);
    } else if (tipo === "historial") {
      items = [...reservasFmt, ...citasFmt].filter((i) =>
        ["vencida", "cancelada", "entregada"].includes(i.estado)
      );
    }

    res.render("reservas", {
      userName: req.user.nombre,
      items,
      tipo,
    });
  } catch (err) {
    console.error("❌ Error cargando reservas:", err);
    res.redirect("/dashboard");
  }
});

router.post("/cancelar", requireAuth, async (req, res) => {
  try {
    const { id, tipo } = req.body;

    if (!id || !tipo) {
      return res.json({ ok: false, message: "Datos incompletos." });
    }

    if (tipo === "productos") {
      const item = await Reserva.findById(id);
      if (!item) return res.json({ ok: false, message: "Reserva no encontrada." });

      item.estado = "cancelada";
      await item.save();

      await Producto.findByIdAndUpdate(item.producto.id, {
        $inc: { stock: item.cantidad },
      });

      return res.json({
        ok: true,
        message: "Reserva cancelada y stock actualizado.",
      });
    }

    if (tipo === "citas") {
      const item = await Cita.findById(id);
      if (!item) return res.json({ ok: false, message: "Cita no encontrada." });

      item.estado = "cancelada";
      await item.save();

      return res.json({
        ok: true,
        message: "Cita cancelada correctamente.",
      });
    }

    return res.json({ ok: false, message: "Tipo no válido." });
  } catch (err) {
    console.error("❌ Error cancelando:", err);
    res.json({ ok: false, message: "Error al cancelar." });
  }
});

router.post("/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.redirect("/perfil/info");

    await User.findByIdAndUpdate(req.user.id, {
      avatar: "/uploads/avatars/" + req.file.filename,
      actualizado: new Date(),
    });

    res.redirect("/perfil/info");
  } catch (err) {
    console.error("❌ Error subiendo avatar:", err);
    res.redirect("/perfil/info");
  }
});

module.exports = router;
