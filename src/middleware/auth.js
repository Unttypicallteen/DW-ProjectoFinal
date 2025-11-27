const { verificarToken } = require("../utils/jwt");

function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/");

  const data = verificarToken(token);
  if (!data) return res.redirect("/");

  req.user = data;
  next();
}

function requireAdmin(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/");

  const data = verificarToken(token);
  if (!data || data.rol !== "admin") {
    return res.status(403).send("❌ Acceso solo para administradores");
  }

  req.user = data;
  next();
}

module.exports = {
  requireAuth,
  requireAdmin
};
