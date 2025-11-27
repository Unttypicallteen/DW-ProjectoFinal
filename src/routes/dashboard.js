const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/auth");
// Dashboard cliente
router.get("/", requireAuth, (req, res) => {
  res.render("dashboard", { userName: req.session.user.nombre });
});

module.exports = router;
