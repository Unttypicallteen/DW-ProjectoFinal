const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/user");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: "vetcarenovapet@gmail.com", pass: "xkir plgf zfkx rubu" },
});

/* ---------- LOGIN ---------- */
router.post("/login", async (req, res) => {
  let { email, password } = req.body;
  email = email.trim().toLowerCase();

  try {
    const user = await User.findOne({ email, password });
    if (!user)
      return res.status(400).render("index", { error: "Credenciales inválidas" });

    // Generar token JWT
    const token = generarToken(user);

    // Enviar cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,   // obligatorio en Vercel
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7
    });

    // Redirección por rol
    switch (user.rol) {
      case "admin":
        return res.redirect("/admin");
      case "cajero":
        return res.redirect("/cajero");
      default:
        return res.redirect("/dashboard");
    }

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).render("index", { error: "Error interno" });
  }
});



/* ---------- REGISTER ---------- */
router.get("/register", (req, res) => res.render("register", { errors: null, nombre: "", email: "" }));

router.post("/register", async (req, res) => {
  try {
    let { nombre, email, password, password2, telefono } = req.body;
    email = email.toLowerCase().trim();
    const errors = [];
    if (!nombre.trim()) errors.push("El nombre es obligatorio.");
    if (!email) errors.push("El correo es obligatorio.");
    if (!telefono) errors.push("El número de teléfono es obligatorio.");
    if (!password) errors.push("La contraseña es obligatoria.");
    if (password !== password2) errors.push("Las contraseñas no coinciden.");
    if (password.length < 8) errors.push("Debe tener al menos 8 caracteres.");
    const exists = await User.findOne({ email });
    if (exists) errors.push("Este correo ya está registrado.");
    if (errors.length) return res.render("register", { errors, nombre, email });

    await new User({
      nombre: nombre.trim(),
      email,
      password,
      telefono: telefono.trim(),
      rol: "cliente",
      avatar: "/img/perfil/default.png",
      creado: new Date(),
    }).save();
    return res.redirect("/");
  } catch (error) {
    console.error("❌ Error en /register:", error);
    res.render("register", { errors: ["Error interno"], nombre: "", email: "" });
  }
});

/* ---------- RECUPERAR CONTRASEÑA ---------- */
router.get("/forgot", (req, res) => res.render("forgot", { sent: false, error: null, email: "" }));

router.post("/forgot", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.render("forgot", { sent: false, error: "Correo no registrado", email });

  const token = crypto.randomBytes(32).toString("hex");
  user.resetToken = token;
  user.resetTokenExpire = Date.now() + 1000 * 60 * 10;
  await user.save();

  const link = `http://localhost:3000/reset/${token}`;
  await transporter.sendMail({
    from: '"VetCare Soporte" <vetcarenovapet@gmail.com>',
    to: email,
    subject: "Restablecer tu contraseña",
    html: `<p>Haz clic aquí para restablecer tu contraseña:</p><a href="${link}">${link}</a>`,
  });

  res.render("forgot", { sent: true, email, error: null });
});

/* ---------- RESET ---------- */
router.get("/reset/:token", async (req, res) => {
  const user = await User.findOne({ resetToken: req.params.token, resetTokenExpire: { $gt: Date.now() } });
  if (!user) return res.send("❌ Enlace inválido o expirado.");
  res.render("reset", { token: req.params.token, done: false });
});

router.post("/reset/:token", async (req, res) => {
  const user = await User.findOne({ resetToken: req.params.token, resetTokenExpire: { $gt: Date.now() } });
  if (!user) return res.send("❌ Enlace inválido o expirado.");
  user.password = req.body.password;
  user.resetToken = undefined;
  user.resetTokenExpire = undefined;
  await user.save();
  res.render("reset", { done: true, token: null });
});

/* ---------- LOGOUT ---------- */
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});



router.get('/', (req, res) => {
  res.render('index', { error: null });
});


module.exports = router;
