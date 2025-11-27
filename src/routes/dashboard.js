const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/auth");

router.get("/", requireAuth, (req, res) => {
  res.render("dashboard", { userName: req.user.nombre });
});

module.exports = router;
