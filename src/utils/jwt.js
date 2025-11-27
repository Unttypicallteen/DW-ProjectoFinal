const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "novapet-secret-key";

function generarToken(usuario) {
  return jwt.sign(
    {
      id: usuario._id.toString(),
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
      algorithm: "HS256",
    }
  );
}

module.exports = { generarToken };
