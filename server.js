// =====================================================
// DEPENDENCIAS
// =====================================================
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");

// Inicializar app
const app = express();

// =====================================================
// CONFIGURACIÓN
// =====================================================
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src", "views"));
app.use(express.static(path.join(process.cwd(), "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// =====================================================
// CONEXIÓN A MONGO ATLAS
// =====================================================
const { connectDatabase } = require("./src/config/database");
connectDatabase();

// =====================================================
// IMPORTAR RUTAS
// =====================================================
const authRoutes = require("./src/routes/auth");
const catalogoRoutes = require("./src/routes/catalogo");
const citaRoutes = require("./src/routes/cita");
const perfilRoutes = require("./src/routes/perfil");
const adminRoutes = require("./src/routes/admin");
const dashboardRoutes = require("./src/routes/dashboard");

// =====================================================
// IMPORTAR MIDDLEWARES JWT
// =====================================================
const { requireAuth, requireAdmin } = require("./src/middlewares/auth");

// =====================================================
// RUTAS
// =====================================================
// Públicas (login, register, forgot, reset, /)
app.use("/", authRoutes);

// Protegidas con JWT
app.use("/catalogo", requireAuth, catalogoRoutes);
app.use("/cita", requireAuth, citaRoutes);
app.use("/perfil", requireAuth, perfilRoutes);
app.use("/dashboard", requireAuth, dashboardRoutes);

// Solo admin
app.use("/admin", requireAdmin, adminRoutes);

// =====================================================
// EXPORTAR PARA VERCEL
// =====================================================
module.exports = app;
