// Dependencias principales
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');

// Inicializar app
const app = express();

// Configuración de vistas y estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // <--- IMPORTANTE para fetch()

// Sesiones
app.use(session({
  secret: 'novapet-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

const { connectDatabase } = require("./src/config/database");
connectDatabase();


// Rutas modulares
const authRoutes = require('./src/routes/auth');
const catalogoRoutes = require('./src/routes/catalogo');
const citaRoutes = require('./src/routes/cita');
const perfilRoutes = require('./src/routes/perfil');
const adminRoutes = require('./src/routes/admin');
const dashboardRoutes = require('./src/routes/dashboard');



// Usarlas
app.use('/', authRoutes);
app.use('/catalogo', catalogoRoutes);
app.use('/cita', citaRoutes);
app.use('/perfil', perfilRoutes);
app.use('/admin', adminRoutes);
app.use('/dashboard', dashboardRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor corriendo en http://localhost:${PORT}`));
