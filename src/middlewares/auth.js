const jwt = require("jsonwebtoken");

// =======================================================
//   VERIFICAR TOKEN JWT
// =======================================================
function verifyToken(req, res) {
  const token = req.cookies?.token;
  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET || "novapet-secret-key");
  } catch (err) {
    console.warn("⚠️ Token inválido o expirado:", err.message);
    if (res) res.clearCookie("token");
    return null;
  }
}

// =======================================================
//   MIDDLEWARE: USUARIO LOGUEADO
// =======================================================
function requireAuth(req, res, next) {
  const user = verifyToken(req, res);

  if (!user) {
    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.status(401).json({
        ok: false,
        message: "No autorizado. Inicia sesión.",
      });
    }
    return res.redirect("/");
  }

  req.user = user;
  next();
}

// =======================================================
//   MIDDLEWARE: SOLO ADMIN
// =======================================================
function requireAdmin(req, res, next) {
  const user = verifyToken(req, res);

  if (!user || user.rol !== "admin") {
    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.status(403).json({
        ok: false,
        message: "Acceso solo para administradores",
      });
    }
    return res.status(403).send("❌ Acceso solo para administradores");
  }

  req.user = user;
  next();
}

module.exports = { requireAuth, requireAdmin };
