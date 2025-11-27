// Dependencias principales
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');

// Inicializar app
const app = express();

// Configuración de vistas y estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'src', 'views'));
app.use(express.static(path.join(process.cwd(), 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sesiones
app.use(session({
  secret: 'novapet-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Conexión Mongo
const { connectDatabase } = require("./src/config/database");
connectDatabase();

// Rutas modulares
app.use('/', require('./src/routes/auth'));
app.use('/catalogo', require('./src/routes/catalogo'));
app.use('/cita', require('./src/routes/cita'));
app.use('/perfil', require('./src/routes/perfil'));
app.use('/admin', require('./src/routes/admin'));
app.use('/dashboard', require('./src/routes/dashboard'));

// ⛔ NO usar app.listen() en Vercel
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));

// ✔ Exportar el servidor para Vercel
module.exports = app;
