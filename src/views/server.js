// server.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();
const User = require('./src/models/user');
const { isLoggedIn, isAdmin, isCajero } = require('./src/middleware/auth');
const nodemailer = require("nodemailer");
const crypto = require("crypto");



const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "vetcarenovapet@gmail.com",
    pass: "xkir plgf zfkx rubu ",  // NO tu contraseña real de Gmail
  }
});

/* =========================
   CONFIG BÁSICA
   ========================= */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
// (opcional) si algún día envías JSON desde forms/axios
// app.use(express.json());

const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/novapet', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('🐶 MongoDB conectado con éxito'))
.catch(err => console.error('❌ Error conectando a MongoDB:', err));

/* =========================
   DATOS DEMO
   ========================= */
const CATEGORIES = ['perros', 'gatos', 'otros'];

const PRODUCTS = [
  // Perros
  { id: 1, name: 'BRANDEX 15 LBS',       price: 280000, img: '/img/cat/brandex15.png',   category: 'perros', age: 'adulto',   grade: 'premium' },
  { id: 2, name: 'PET FOOD PRO MAX 2LB', price: 40000,  img: '/img/cat/pro-max.png',     category: 'perros', age: 'cachorro', grade: 'concentrado' },
  { id: 3, name: 'CACHORRO FELIZ 2LB',   price: 43000,  img: '/img/cat/cachorro-feliz.png', category: 'perros', age: 'cachorro', grade: 'premium' },

  // Gatos
  { id: 4, name: 'CAT PET 15LB',         price: 12000,  img: '/img/cat/GATO1.png',       category: 'gatos',  age: 'cachorro', grade: 'concentrado' },
  { id: 5, name: 'CAT PRO MAX 4LB',      price: 58000,  img: '/img/cat/GATO2.png',       category: 'gatos',  age: 'adulto',   grade: 'premium' },
  { id: 6, name: 'KIT MICHI FELIZ',      price: 156000, img: '/img/cat/GATO3.png',       category: 'gatos',  age: 'adulto',   grade: 'otros' },

  // Otros
  { id: 7, name: 'KIT MI PRIMER PECECITO', price: 200000, img: '/img/cat/acuario.png',  category: 'otros', age: 'adulto', grade: 'otros' },
  { id: 8, name: 'KIT MAZE RUNNER',        price: 46000,  img: '/img/cat/hamster.png',  category: 'otros', age: 'adulto', grade: 'otros' },
  { id: 9, name: 'KIT PEPE EL PAJARO',     price: 30000,  img: '/img/cat/pajaro.png',   category: 'otros', age: 'adulto', grade: 'otros' },
];

/* =========================
   HELPERS
   ========================= */
function wantsJSON(req) {
  // Detecta llamadas AJAX/fetch
  const xrw  = (req.get('X-Requested-With') || '').toLowerCase();
  const acc  = (req.get('Accept') || '').toLowerCase();
  return req.xhr || xrw === 'xmlhttprequest' || acc.includes('application/json');
}
app.use(session({
  secret: 'novapet-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }   // secure:false porque NO estás usando HTTPS
}));

/* =========================
   RUTAS PRINCIPALES
   ========================= */
app.get('/', (req, res) => res.render('index', { error: null }));

/* ---------- LOGIN REAL CON SESIONES + MONGODB ---------- */
app.post('/login', async (req, res) => {
  let { email, password } = req.body;
  email = email.trim().toLowerCase();


  try {
    const user = await User.findOne({ email, password });

    if (!user) {
      return res.status(400).render('index', { error: 'Credenciales inválidas' });
    }

    // Guardar info del usuario en la sesión
    req.session.user = {
      id: user._id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol
    };

    // Redirección según rol
    if (user.rol === "admin") return res.redirect('/admin');
    if (user.rol === "cajero") return res.redirect('/cajero');

    return res.redirect('/dashboard');

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).render('index', { error: 'Error interno' });
  }
});



app.get('/dashboard', isLoggedIn, (req, res) => {
  res.render('dashboard', { userName: req.session.user.nombre });
});


app.get('/cita', isLoggedIn, (req, res) => {
  res.render('Menu', { userName: req.session.user.nombre })
});


/* =========================
   RECUPERACIÓN/REGISTRO
   ========================= */

   const htmlEmailTemplate = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recupera tu contraseña - VetCare</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #f7f7f7;
      font-family: 'Poppins', sans-serif;
    }

    .email-wrapper {
      max-width: 480px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 3px 12px rgba(0,0,0,0.1);
    }

    .email-header {
      text-align: center;
      margin-bottom: 20px;
    }

    .email-logo {
      width: 120px;
      border-radius: 12px;
    }

    h2 {
      font-size: 22px;
      font-weight: 600;
      color: #333;
      text-align: center;
    }

    p {
      font-size: 15px;
      color: #555;
      line-height: 1.6;
    }

    .btn-reset {
      display: block;
      width: fit-content;
      margin: 25px auto;
      padding: 12px 20px;
      background: #4a90e2;
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      text-align: center;
      transition: background 0.3s;
    }

    .btn-reset:hover {
      background: #3573b5;
    }

    .footer {
      margin-top: 30px;
      font-size: 13px;
      text-align: center;
      color: #888;
    }
  </style>
</head>

<body>

  <div class="email-wrapper">

    <div class="email-header">
      <img src="cid:vetcare-logo" alt="VetCare" class="email-logo">
    </div>

    <h2>Restablecer tu contraseña</h2>

    <p>Hola 👋,<br>
    Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>VetCare</strong>.</p>

    <p>Para continuar, haz clic en el siguiente botón:</p>

    <a href="{{LINK}}" class="btn-reset">Restablecer contraseña</a>

    <p>Si tú no solicitaste este cambio, puedes ignorar este mensaje.<br>
    Este enlace es válido por <strong>10 minutos</strong>.</p>

    <div class="footer">
      VetCare Center · Cuidado y bienestar para cada mascota 🐾 <br>
      Este es un mensaje automático, por favor no respondas.
    </div>

  </div>

</body>
</html>`;

/* =========================
   RECUPERAR CONTRASEÑA
   ========================= */

app.get('/forgot', (req, res) => {
  res.render('forgot', {
    sent: false,
    error: null,
    email: ""
  });
});

app.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.render('forgot', {
        sent: false,
        error: "Debes ingresar un correo válido",
        email: ""
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.render('forgot', {
        sent: false,
        error: "Este correo no está registrado",
        email
      });
    }

    // Crear token único de 32 bytes
    const token = crypto.randomBytes(32).toString("hex");

    // Guardar token en el usuario
    user.resetToken = token;
    user.resetTokenExpire = Date.now() + 1000 * 60 * 10; // 10 min
    await user.save();

    // Enlace real para resetear
    const link = `http://localhost:3000/reset/${token}`;

    // Enviar correo
    await transporter.sendMail({
      from: '"VetCare Soporte" <TUCORREO@gmail.com>',
      to: email,
      subject: "Restablecer tu contraseña en VetCare",

      html: htmlEmailTemplate.replace("{{LINK}}", link),

      attachments: [
        {
          filename: "logo.jpg",
          path: path.join(__dirname, "public/img/logo.jpg"),
          cid: "vetcare-logo" // Debe MATCHEAR con el html
        }
      ]
    });


    return res.render("forgot", {
      sent: true,
      email,
      error: null
    });

  } catch (err) {
    console.log("❌ Error en POST /forgot:", err);
    return res.render('forgot', {
      sent: false,
      email: "",
      error: "Error interno. Intenta más tarde."
    });
  }
});
app.get('/reset/:token', async (req, res) => {
  const { token } = req.params;

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpire: { $gt: Date.now() }
  });

  if (!user) {
    return res.send("❌ Enlace inválido o expirado.");
  }

  res.render("reset", { token, done: false });
});

app.post('/reset/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpire: { $gt: Date.now() }
  });

  if (!user) {
    return res.send("❌ Enlace inválido o expirado.");
  }

  // Actualizar contraseña
  user.password = password;
  user.resetToken = undefined;
  user.resetTokenExpire = undefined;
  await user.save();

  res.render("reset", { done: true, token: null });
});


/* =========================
   GET — FORMULARIO DE REGISTRO
   ========================= */
app.get('/register', (req, res) => {
  res.render('register', {
    errors: null,
    nombre: "",
    email: ""
  });
});
/* =========================
   CREAR CUENTA (REGISTER)
   ========================= */
app.post("/register", async (req, res) => {
  try {
    let { nombre, email, password, password2, telefono } = req.body;

    email = email.toLowerCase().trim();

    const errors = [];

    if (!nombre.trim()) errors.push("El nombre es obligatorio.");
    if (!email) errors.push("El correo es obligatorio.");
    if (!telefono) errors.push("El número de teléfono es obligatorio.");
    if (!password) errors.push("La contraseña es obligatoria.");
    if (password !== password2) errors.push("Las contraseñas no coinciden.");
    if (password.length < 8) errors.push("La contraseña debe tener al menos 8 caracteres.");

    const exists = await User.findOne({ email });
    if (exists) errors.push("Este correo ya está registrado.");

    if (errors.length > 0) {
      return res.render("register", {
        errors,
        nombre,
        email,
      });
    }

    const newUser = new User({
      nombre: nombre.trim(),
      email,
      password,
      telefono: telefono.trim(),
      rol: "cliente",
      avatar: "/img/perfil/default.png",
      creado: new Date()
    });

    await newUser.save();

    return res.redirect("/");
  } catch (error) {
    console.log("❌ Error en /register:", error);
    res.render("register", {
      errors: ["Error interno. Intenta de nuevo."],
      nombre: "",
      email: ""
    });
  }
});



/* =========================
   CATÁLOGO
   ========================= */
app.get('/catalogo', isLoggedIn, (req, res) => {
  // Tab activo por query (?cat=gatos). Si no coincide, usa 'perros'
  const cat = CATEGORIES.includes((req.query.cat || '').toLowerCase())
    ? req.query.cat.toLowerCase()
    : 'perros';

  // Mostramos TODOS los productos; el filtrado por categoría lo hace tu JS
  // con display:none (así no recargamos al cambiar tab).
  res.render('catalogo', {
    userName: req.session.user.nombre,
    categories: CATEGORIES,
    products: PRODUCTS,
    activeCategory: cat,
    message: req.query.msg || null, // para fallback no-AJAX
  });
});

app.post('/catalogo/reservar', (req, res) => {
  const { productId, qty } = req.body;
  console.log('Reserva:', { productId, qty });

  const product = PRODUCTS.find(p => p.id == productId);
  const safeQty = parseInt(qty, 10) > 0 ? parseInt(qty, 10) : 1;
  const msg = product
    ? `Has reservado ${safeQty} unidad(es) de "${product.name}".`
    : 'Reserva realizada con éxito.';

  if (wantsJSON(req)) {
    // Respuesta para fetch/AJAX
    return res.json({ ok: true, message: msg });
  }

  // Fallback: navegación tradicional (si alguien quita el JS)
  const backCat = req.query.cat && CATEGORIES.includes(req.query.cat) ? req.query.cat : 'perros';
  return res.redirect(`/catalogo?cat=${backCat}&msg=${encodeURIComponent(msg)}`);
});
app.get('/perfil', isLoggedIn, async (req, res) => {
  const user = await User.findById(req.session.user.id);
  res.render('perfil', {
    userName: user.nombre,
    user
  });
});

// GET /cita/:type  -> renderiza la misma vista con distinta foto y textos
app.get('/cita/:type', isLoggedIn, (req, res) => {
  const t = (req.params.type || '').toLowerCase();

  const viewDataByType = {
    vacuna: {
      h1: 'Programa la próxima vacuna de tu mascota',
      hero: '/img/citas/vacuna-hero.png',
      tipo: 'vacuna',
      labelTipo: 'Selecciona el tipo de vacuna',
      opcionesTipo: ['Antirrábica', 'Quíntuple', 'Sextuple'],
      recomendaciones: 'Trae el carné de vacunación. La mascota debe venir aseada.',
    },
    grooming: {
      h1: 'Programa tu servicio de grooming',
      hero: '/img/citas/grooming-hero.png',
      tipo: 'grooming',
      labelTipo: 'Selecciona el tipo de servicio',
      opcionesTipo: ['Baño', 'Corte', 'Baño + Corte'],
      recomendaciones: 'Llega 10 minutos antes. La mayoría de servicios duran ~1 hora.',
    },
    medica: {
      h1: 'Programa tu próxima visita de control',
      hero: '/img/citas/consulta-hero.png',
      tipo: 'medica',
      labelTipo: 'Selecciona el motivo',
      opcionesTipo: ['Control', 'Urgencia leve', 'Revisión general'],
      recomendaciones: 'Trae historia clínica si la tienes. Llega 10 minutos antes.',
    }
  };

  const data = viewDataByType[t] || viewDataByType.medica;

  res.render('cita', {
    ...data,
    userName: req.session.user.nombre,
    especies: ['Perro', 'Gato', 'Otro'],
    horas: ['09:00','10:00','11:00','14:00','15:00','16:00'],
  });
});


// POST /cita/reservar  -> guarda la reserva (demo) y responde JSON si viene por fetch
app.post('/cita/reservar', (req, res) => {
  const { tipo, especie, servicio, dia, hora } = req.body || {};

  // Validación mínima
  if (!tipo || !especie || !servicio || !dia || !hora) {
    // Si llega por fetch/AJAX, responde JSON; si no, redirige con mensaje de error
    if (wantsJSON(req)) {
      return res.status(400).json({ ok: false, message: 'Faltan datos de la reserva.' });
    }
    return res.redirect(`/cita/${tipo || 'medica'}?err=1`);
  }

  // Aquí podrías guardar en DB; por ahora solo log
  console.log('💾 Reserva:', { tipo, especie, servicio, dia, hora });

  const msg = `¡Reserva confirmada! ${tipo} para ${especie} — ${servicio} el ${dia} a las ${hora}.`;

  // Si viene por fetch (tu frontend lo hace), responde JSON
  if (wantsJSON(req)) {
    return res.json({ ok: true, message: msg });
  }

  // Fallback tradicional (si alguien desactiva JS)
  return res.redirect(`/cita/${tipo}?ok=1&msg=${encodeURIComponent(msg)}`);
});
// --- Ver perfil ---
app.get('/perfil/info', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);

    if (!user) return res.redirect('/dashboard');

    // TODO: cuando tengas mascotas reales, las cargas desde DB
    const mascotas = [
      { id: 1, nombre: 'Luna', especie: 'Perro', raza: 'Beagle', edad: '3 años', foto: '/img/perfil/user/beagle.jpg' },
      { id: 2, nombre: 'Michi', especie: 'Gato',  raza: 'Mestizo', edad: '1 año',  foto: '/img/perfil/user/michi.png' }
    ];

    res.render('perfil-ver', {
      userName: user.nombre,
      user,
      mascotas
    });

  } catch (err) {
    console.log('❌ Error en /perfil/info:', err);
    res.redirect('/dashboard');
  }
});
app.get('/perfil/editar', isLoggedIn, async (req, res) => {
  const user = await User.findById(req.session.user.id);
  res.render('perfil-editar', {
    userName: user.nombre,
    user
  });
});

app.post('/perfil/editar', isLoggedIn, async (req, res) => {
  try {
    const { email = '', pass = '', tel = '' } = req.body;

    // Validaciones
    const errors = [];
    if (!email.trim()) errors.push('El correo es obligatorio.');
    if (pass && pass.length < 6) errors.push('La contraseña debe tener al menos 6 caracteres.');

    if (errors.length) {
      if (wantsJSON(req)) {
        return res.status(400).json({ ok: false, errors });
      }
      return res.redirect('/perfil/editar?err=1');
    }

    // Objeto de actualización
    const updateData = {
      email,
      telefono: tel,
      actualizado: new Date()
    };

    // Solo actualizar password si el usuario escribió una nueva
    if (pass.trim()) {
      updateData.password = pass;
    }

    // Actualizar usuario en DB
    const updatedUser = await User.findByIdAndUpdate(
      req.session.user.id,
      updateData,
      { new: true }  // devuelve el usuario actualizado
    );

    // Actualizar los datos de sesión (nombre/email si cambian)
    req.session.user.nombre = updatedUser.nombre;
    req.session.user.email = updatedUser.email;

    console.log('✅ PERFIL ACTUALIZADO EN BD:', updateData);

    if (wantsJSON(req)) {
      return res.json({ ok: true, message: 'Perfil actualizado correctamente.' });
    }

    return res.redirect('/perfil/info?ok=1');

  } catch (err) {
    console.log('❌ Error en POST /perfil/editar:', err);
    res.redirect('/perfil/editar?err=1');
  }
});



/* ------ Cancelar (demo) ------ */
app.post('/cita/cancelar', (req, res) => {
  const { id } = req.body || {};
  console.log('🗑️  cancelar cita id', id);
  return res.json({ ok:true, message:'Cita cancelada correctamente.' });
});

/* --------  RESERVAS / CITAS / HISTORIAL (demo)  -------- */
app.get('/perfil/reservas', (req, res) => {
  const reservas = [
    { id:1, img:'/img/cat/brandex15.png', nombre:'BRANDEX 15 LBS', precio:260000, qty:1,  expira:'15/11/2025' },
    { id:2, img:'/img/cat/pro-max.png',   nombre:'CAT PRO MAX',     precio:50000,  qty:2,  expira:'15/11/2025' },
    { id:3, img:'/img/cat/acuario.png',   nombre:'KIT PEPE EL PAJARO', precio:30000, qty:1, expira:'15/11/2025' },
    ];

  const citas = [
   { id:4, tipo:'vacunas',  titulo:'Vacunación',        fecha:'15-Nov-2025', hora:'10:00', especie:'Gato',  img:'/img/servicios/vacuna.png'   },
    { id:5, tipo:'grooming', titulo:'Servicio Grooming', fecha:'20-Nov-2025', hora:'14:00', especie:'Perro', img:'/img/servicios/grooming.png' },
    { id:6, tipo:'consulta', titulo:'Consulta médica',   fecha:'30-Nov-2025', hora:'09:00', especie:'Perro',  img:'/img/servicios/consulta.png' }
  ];

  /* 👉 historial ya finalizado */
const historial = [
  { fecha:'10-Sep-2025',  detalle:'Consulta general', mascota:'Michi', especie:'Gato',  img:'/img/servicios/consulta.png',  estado:'cancelada'},
  { fecha:'15-Oct-2025',  detalle:'Grooming — Corte', mascota:'Luna',  especie:'Perro', img:'/img/servicios/grooming.png',  estado:'completada'},
  { fecha:'22-Oct-2025',  detalle:'Reserva-brandex15', mascota:'Luna', especie:'Perro', img:'/img/cat/brandex15.png',      estado:'vencida'},
];


res.render('reservas', { userName: req.session.user.nombre, reservas, citas, historial });
});



/* --------  Cancelar (demo)  -------- */
app.post('/perfil/reserva/cancelar', (req, res) => {
  console.log('🗑️  cancelar', req.body.id);
  res.json({ ok: true, message: 'Reserva cancelada correctamente.' });
});
app.get('/admin', isAdmin, (req, res) => {
  res.render("admin", {
    userName: req.session.user.nombre,
    citasHoy: 4,
    reservasHoy: 2,
    ventasHoy: 1850000,
    productosCriticos: 3,
    usuarios: [
      { nombre: "Laura Rojas", email: "laura@vet.com", rol: "Cajero" },
      { nombre: "Santiago López", email: "santi@vet.com", rol: "Veterinario" }
    ],
    ventas: [
      { id: 1001, producto: "Shampoo VetCare", monto: 28000, hora: "10:32 AM" },
      { id: 1002, producto: "Consulta general", monto: 65000, hora: "11:10 AM" }
    ],
    inventario: [
      { nombre: "Shampoo VetCare", cantidad: 4, estado: "Crítico" },
      { nombre: "Galletas CaninePro", cantidad: 26, estado: "Normal" }
    ],
    citas: [
      { hora: "10:00 AM", tipo: "Cita", mascota: "Lucas", cliente: "Daniela Gómez" },
      { hora: "11:30 AM", tipo: "Reserva", mascota: "Milo", cliente: "Juan Romero" }
    ]
  });
});
app.get('/cajero', isCajero, (req, res) => {
  res.render("cajero", {
    userName: req.session.user.nombre,
    citasHoy: 4,
    reservasHoy: 2,
    ventasHoy: 1850000,
    productosCriticos: 3,
    usuarios: [
      { nombre: "Laura Porras", email: "laura@vet.com", rol: "Cajero" },
      { nombre: "Santiago López", email: "santi@vet.com", rol: "Veterinario" }
    ],
    ventas: [
      { id: 1001, producto: "Shampoo VetCare", monto: 28000, hora: "10:32 AM" },
      { id: 1002, producto: "Consulta general", monto: 65000, hora: "11:10 AM" }
    ],
    inventario: [
      { nombre: "Shampoo VetCare", cantidad: 4, estado: "Crítico" },
      { nombre: "Galletas CaninePro", cantidad: 26, estado: "Normal" }
    ],
    citas: [
      { hora: "10:00 AM", tipo: "Cita", mascota: "Lucas", cliente: "Daniela Gómez" },
      { hora: "11:30 AM", tipo: "Reserva", mascota: "Milo", cliente: "Juan Romero" }
    ]
  });
});


/* =========================
   LOGOUT
   ========================= */
app.post('/logout', (req, res) => res.redirect('/'));
app.get('/logout',  (req, res) => res.redirect('/'));

/* =========================
   404 / ERRORES
   ========================= */
app.use((req, res) => res.status(404).send('404 - Página no encontrada'));
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).send('Error interno del servidor');
});

/* =========================
   ARRANQUE
   ========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ http://localhost:${PORT}`));
