// Dependencias principales
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

// Inicializar app
const app = express();

// Configuración de vistas y estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'src', 'views'));
app.use(express.static(path.join(process.cwd(), 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());



// Conexión Mongo
const { connectDatabase } = require("./src/config/database");
connectDatabase();
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// Rutas modulares
app.use('/', authRoutes);  // login, register, etc.

app.use('/catalogo', requireAuth, catalogoRoutes);
app.use('/cita', requireAuth, citaRoutes);
app.use('/perfil', requireAuth, perfilRoutes);

app.use('/admin', requireAdmin, adminRoutes);    // SOLO admin
app.use('/dashboard', requireAuth, dashboardRoutes);


// ⛔ NO usar app.listen() en Vercel
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));

// ✔ Exportar el servidor para Vercel
module.exports = app;
