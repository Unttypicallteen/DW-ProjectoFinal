const multer = require("multer");
const path = require("path");

// Carpeta donde se guardan las imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/avatars");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname)); // ej: 3232323.png
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    const valid = ["image/png", "image/jpeg", "image/jpg"];
    if (!valid.includes(file.mimetype)) {
      return cb(new Error("Solo se permiten imágenes JPG/PNG"));
    }
    cb(null, true);
  }
});

module.exports = upload;
