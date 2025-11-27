const path = require("path");
const express = require("express");
const request = require("supertest");
const session = require("express-session");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const { connectDatabase } = require("../../config/database");

// Importar TODAS tus rutas reales
const authRoutes = require("../../routes/auth");
const catalogoRoutes = require("../../routes/catalogo");
const citaRoutes = require("../../routes/cita");
const perfilRoutes = require("../../routes/perfil");
const adminRoutes = require("../../routes/admin");
const dashboardRoutes = require("../../routes/dashboard");

describe("Tests de integración - APP REAL", function () {
  this.timeout(30000);

  let mongod;
  let app;

  before(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = new URL(mongod.getUri());

    process.env.MONGO_HOST = uri.hostname;
    process.env.MONGO_PORT = uri.port;
    process.env.MONGO_DB = (uri.pathname && uri.pathname.slice(1)) || "testdb";

    await connectDatabase();

    app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    app.use(
      session({
        secret: "test-secret",
        resave: false,
        saveUninitialized: true,
      })
    );

    app.set("view engine", "ejs");
    app.set("views", path.join(__dirname, "../../../src/views"));

    app.use("/", authRoutes);
    app.use("/catalogo", catalogoRoutes);
    app.use("/cita", citaRoutes);
    app.use("/perfil", perfilRoutes);
    app.use("/admin", adminRoutes);
    app.use("/dashboard", dashboardRoutes);
  });

  after(async () => {
    await mongoose.connection.close();
    await mongod.stop();
  });

  it("GET / debe responder 200 o 302", async () => {
    const res = await request(app).get("/");
    if (![200, 302].includes(res.status)) {
      throw new Error("La ruta / no está funcionando.");
    }
  });
});
