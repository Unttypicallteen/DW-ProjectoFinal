const jwt = require("jsonwebtoken");

function verifyToken(req) {
  const token = req.cookies.token;
  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET || "novapet-secret-key");
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = verifyToken(req);
  if (!user) return res.redirect("/");
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = verifyToken(req);
  if (!user || user.rol !== "admin") {
    return res.status(403).send("❌ Acceso solo para administradores");
  }
  req.user = user;
  next();
}

module.exports = { requireAuth, requireAdmin };
