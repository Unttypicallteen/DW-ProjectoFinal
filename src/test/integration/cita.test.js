import { expect } from "chai";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

import { connectDatabase } from "../../config/database.js";
import citaRoutes from "../../routes/cita.js";
import Cita from "../../models/cita.js";

// Paths auxiliares
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../../");

describe("CITAS – Tests de integración", function () {
  this.timeout(30000);

  let app;
  let mongod;
  let agent;

  before(async () => {
    // Mongo en memoria
    mongod = await MongoMemoryServer.create();
    const uri = new URL(mongod.getUri());

    process.env.MONGO_HOST = uri.hostname;
    process.env.MONGO_PORT = uri.port;
    process.env.MONGO_DB = (uri.pathname && uri.pathname.slice(1)) || "testdb";

    await connectDatabase();

    // App Express real
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

    // <<< FIX CRÍTICO – simular usuario logueado >>>
    app.use((req, res, next) => {
      req.session.user = {
        id: new mongoose.Types.ObjectId(),
        nombre: "Tester",
        rol: "cliente",
      };
      next();
    });

    // Vistas
    app.set("view engine", "ejs");
    app.set("views", path.join(ROOT, "views"));
    app.use(express.static(path.join(ROOT, "public")));

    // Rutas reales
    app.use("/cita", citaRoutes);

    agent = request.agent(app);
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongod.stop();
  });

  /* 1) GET /cita/medica */
  it("GET /cita/medica debe responder 200", async () => {
    const res = await agent.get("/cita/medica");
    expect(res.status).to.equal(200);
  });

  /* 2) Crear cita válida */
  it("POST /cita/reservar debe crear una cita válida", async () => {
    const dia = "2025-12-01";

    const res = await agent
      .post("/cita/reservar")
      .send({
        tipo: "medica",
        especie: "Perro",
        servicio: "Control",
        dia,
        hora: "10:00",
      })
      .set("Accept", "application/json");

    expect(res.body.ok).to.equal(true);

    const count = await Cita.countDocuments({ dia, hora: "10:00" });
    expect(count).to.equal(1);
  });

  /* 3) Error por falta de datos */
  it("POST /cita/reservar debe fallar si faltan datos", async () => {
    const res = await agent
      .post("/cita/reservar")
      .send({ tipo: "" })
      .set("Accept", "application/json");

    expect(res.status).to.equal(400);
    expect(res.body.ok).to.equal(false);
  });

  /* 4) Límite de 2 citas por hora */
  it("NO debe permitir más de 2 citas por hora", async () => {
    const dia = "2025-12-02";

    await Cita.create({
      usuario: new mongoose.Types.ObjectId(),
      tipo: "medica",
      especie: "Gato",
      servicio: "Control",
      dia,
      hora: "11:00",
    });

    await Cita.create({
      usuario: new mongoose.Types.ObjectId(),
      tipo: "medica",
      especie: "Gato",
      servicio: "Control",
      dia,
      hora: "11:00",
    });

    const res = await agent
      .post("/cita/reservar")
      .send({
        tipo: "medica",
        especie: "Perro",
        servicio: "Control",
        dia,
        hora: "11:00",
      })
      .set("Accept", "application/json");

    expect(res.body.ok).to.equal(false);
    expect(res.body.message).to.include("no hay cupos");
  });

  /* 5) Horas disponibles */
 it("GET /cita/horas-disponibles debe devolver JSON válido", async () => {
  const dia = "2025-12-03";

  // <<< FIX: Forzar creación de sesión >>>
  await agent.get("/cita/medica");

  await Cita.create({
    usuario: new mongoose.Types.ObjectId(),
    tipo: "medica",
    especie: "Perro",
    servicio: "Control",
    dia,
    hora: "10:00",
  });

  await Cita.create({
    usuario: new mongoose.Types.ObjectId(),
    tipo: "medica",
    especie: "Gato",
    servicio: "Control",
    dia,
    hora: "10:00",
  });

  const res = await agent
    .get("/cita/horas-disponibles")
    .query({ dia, tipo: "medica" })
    .set("Accept", "application/json");

  expect(res.status).to.equal(200);
  expect(res.body).to.have.property("horas");
  expect(res.body.horas).to.not.include("10:00");
});

});
