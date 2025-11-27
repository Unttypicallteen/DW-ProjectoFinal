// ===============================
// DEPENDENCIAS
// ===============================
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");

// Inicializar app
const app = express();

// ===============================
// CONFIGURACIÓN DE VISTAS Y ESTÁTICOS
// ===============================
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src", "views"));
app.use(express.static(path.join(process.cwd(), "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser()); // <-- IMPORTANTE ANTES DE LAS RUTAS JWT

// ===============================
// CONEXIÓN A MONGODB ATLAS
// ===============================
const { connectDatabase } = require("./src/config/database");
connectDatabase();

// ===============================
// IMPORTAR RUTAS Y MIDDLEWARES
// ===============================
const authRoutes = require("./src/routes/auth");
const catalogoRoutes = require("./src/routes/catalogo");
const citaRoutes = require("./src/routes/cita");
const perfilRoutes = require("./src/routes/perfil");
const adminRoutes = require("./src/routes/admin");
const dashboardRoutes = require("./src/routes/dashboard");

const { requireAuth, requireAdmin } = require("./src/middlewares/auth");

// ===============================
// RUTAS PÚBLICAS
// ===============================
app.use("/", authRoutes);

// ===============================
// RUTAS PROTEGIDAS (JWT)
// ===============================
app.use("/catalogo", requireAuth, catalogoRoutes);
app.use("/cita", requireAuth, citaRoutes);
app.use("/perfil", requireAuth, perfilRoutes);
app.use("/dashboard", requireAuth, dashboardRoutes);

// SOLO ADMINISTRADORES
app.use("/admin", requireAdmin, adminRoutes);

// ===============================
// EXPORT PARA VERCEL
// ===============================
module.exports = app;
