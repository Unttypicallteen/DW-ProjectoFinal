const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

// Validación temprana (solo en desarrollo)
if (!JWT_SECRET) {
  console.warn("⚠️ ADVERTENCIA: JWT_SECRET no está definido en variables de entorno.");
}

/**
 * Genera un token JWT seguro con toda la información del usuario.
 * Este token se usará en cookies httpOnly.
 */
function generarToken(usuario) {
  return jwt.sign(
    {
      id: usuario._id.toString(),
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre
    },
    JWT_SECRET,
    {
      expiresIn: "7d", // Token válido por 7 días
      algorithm: "HS256"
    }
  );
}

module.exports = { generarToken };
