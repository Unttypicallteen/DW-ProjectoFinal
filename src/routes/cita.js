const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middlewares/auth");
const Cita = require("../models/cita");

/* ============================
   PANTALLA PRINCIPAL /cita
============================ */
router.get("/", requireAuth, (req, res) => {
  res.render("Menu", { userName: req.user.nombre }); // ← CORREGIDO
});

// Horarios permitidos
const HORAS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

/* ============================
   GENERAR FECHAS DISPONIBLES
============================ */
function generarFechasDisponibles() {
  const hoy = new Date();

  // Día mínimo = hoy + 3 días
  const inicio = new Date(hoy);
  inicio.setDate(hoy.getDate() + 3);

  // 7 días disponibles
  const fechas = [];
  for (let i = 0; i < 7; i++) {
    const f = new Date(inicio);
    f.setDate(inicio.getDate() + i);
    fechas.push(f.toISOString().split("T")[0]);
  }

  return fechas;
}

/* ============================
   HORAS DISPONIBLES (máx 2)
============================ */
router.get("/horas-disponibles", requireAuth, async (req, res) => {
  try {
    const { dia, tipo } = req.query;

    if (!dia || !tipo) return res.json({ horas: [] });

    const citas = await Cita.find({ dia, tipo });

    const horasDisponibles = HORAS.filter(h => {
      const count = citas.filter(c => c.hora === h).length;
      return count < 2; // Máximo 2 citas por hora
    });

    res.json({ horas: horasDisponibles });

  } catch {
    res.json({ horas: [] });
  }
});

/* ============================
   FORMULARIO /cita/:type
============================ */
router.get("/:type", requireAuth, async (req, res) => {
  const t = (req.params.type || "").toLowerCase();

  const viewDataByType = {
    vacuna: {
      h1: "Programa la próxima vacuna",
      hero: "/img/citas/vacuna-hero.png",
      tipo: "vacuna",
      labelTipo: "Tipo de vacuna",
      opcionesTipo: ["Antirrábica", "Quíntuple", "Sextuple"],
      recomendaciones: "Trae el carné de vacunación.",
    },

    grooming: {
      h1: "Programa tu servicio de grooming",
      hero: "/img/citas/grooming-hero.png",
      tipo: "grooming",
      labelTipo: "Tipo de servicio",
      opcionesTipo: ["Baño", "Corte", "Baño + Corte"],
      recomendaciones: "Llega 10 minutos antes.",
    },

    medica: {
      h1: "Programa tu visita médica",
      hero: "/img/citas/consulta-hero.png",
      tipo: "medica",
      labelTipo: "Motivo",
      opcionesTipo: ["Control", "Urgencia leve", "Revisión general"],
      recomendaciones: "Trae historia clínica si la tienes.",
    },
  };

  const data = viewDataByType[t] || viewDataByType.medica;

  // Fechas posibles
  const fechasDisponibles = generarFechasDisponibles();

  // Cargar citas existentes en el rango
  const citasEnRango = await Cita.find({
    dia: { $in: fechasDisponibles },
    tipo: data.tipo,
  });

  res.render("cita", {
    ...data,
    userName: req.user.nombre, // ← CORREGIDO
    especies: ["Perro", "Gato", "Otro"],
    fechasDisponibles,
    horas: HORAS,
    citasEnRango,
  });
});

/* ============================
   GUARDAR CITA (límite 2 por hora)
============================ */
router.post("/reservar", requireAuth, async (req, res) => {
  try {
    const { tipo, especie, servicio, dia, hora } = req.body;

    if (!tipo || !especie || !servicio || !dia || !hora) {
      if (req.headers.accept?.includes("application/json"))
        return res.status(400).json({ ok: false, message: "Faltan datos." });

      return res.redirect("/cita/medica?error=1");
    }

    const count = await Cita.countDocuments({ tipo, dia, hora });

    if (count >= 2) {
      if (req.headers.accept?.includes("application/json"))
        return res.json({ ok: false, message: "Ya no hay cupos." });

      return res.redirect(`/cita/${tipo}?full=1`);
    }

    const cita = new Cita({
      usuario: req.user.id, // ← CORREGIDO
      tipo,
      especie,
      servicio,
      dia,
      hora,
      estado: "activa",
    });

    await cita.save();

    const msg = `Cita confirmada para ${dia} a las ${hora}.`;

    if (req.headers.accept?.includes("application/json"))
      return res.json({ ok: true, message: msg });

    res.redirect(`/cita/${tipo}?ok=1`);

  } catch (err) {
    console.error("❌ Error al guardar la cita:", err);
    res.status(500).json({
      ok: false,
      message: "Error al guardar la cita.",
    });
  }
});

module.exports = router;
