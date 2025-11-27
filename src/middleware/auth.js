module.exports = {
  isLoggedIn: (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/');
    }
    next();
  },

  isAdmin: (req, res, next) => {
    if (!req.session.user || req.session.user.rol !== 'admin') {
      return res.status(403).send("❌ Acceso solo para administradores");
    }
    next();
  },

  isCajero: (req, res, next) => {
    if (!req.session.user || req.session.user.rol !== "cajero") {
      return res.redirect("/"); // ← MÁS AMIGABLE
    }
    next();
  }

};
