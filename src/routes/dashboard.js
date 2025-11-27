const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");

// Dashboard cliente
router.get("/", isLoggedIn, (req, res) => {
  res.render("dashboard", { userName: req.session.user.nombre });
});

module.exports = router;
