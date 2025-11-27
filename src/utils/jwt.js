const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "novapet-secret-key";

function generarToken(usuario) {
  return jwt.sign(
    {
      id: usuario._id,
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre
    },
    JWT_SECRET,
    { expiresIn: "7d" } // duración de 7 días
  );
}

function verificarToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { generarToken, verificarToken };
