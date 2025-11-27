import { expect } from "chai";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

import { connectDatabase } from "../../config/database.js";
import perfilRoutes from "../../routes/perfil.js";

import User from "../../models/user.js";
import Reserva from "../../models/reserva.js";
import Cita from "../../models/cita.js";
import Producto from "../../models/producto.js";

// Aux paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../../");

describe("PERFIL – Tests de integración", function () {
  this.timeout(30000);

  let app;
  let mongod;
  let agent;
  let user;

  before(async () => {

    // ----- Mongo en memoria -----
    mongod = await MongoMemoryServer.create();
    const uri = new URL(mongod.getUri());

    process.env.MONGO_HOST = uri.hostname;
    process.env.MONGO_PORT = uri.port;
    process.env.MONGO_DB = (uri.pathname && uri.pathname.slice(1)) || "testdb";

    await connectDatabase();

    // ----- Usuario base -----
    user = await User.create({
      nombre: "Tester",
      email: "tester@mail.com",
      password: "123456",
      telefono: "123",
      rol: "cliente",
    });

    // ----- Express app -----
    app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    // Sesión simulada
    app.use(
      session({
        secret: "test-secret",
        resave: false,
        saveUninitialized: true,
      })
    );

    // Simular login SIEMPRE
    app.use((req, res, next) => {
      req.session.user = {
        id: user._id,
        nombre: user.nombre,
        rol: user.rol,
      };
      next();
    });

    // Views reales
    app.set("view engine", "ejs");
    app.set("views", path.join(ROOT, "views"));

    // Static
    app.use(express.static(path.join(ROOT, "public")));

    // Rutas reales
    app.use("/perfil", perfilRoutes);

    // Supertest agent
    agent = request.agent(app);
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongod.stop();
  });

  // ============================================================
  //                      TEST 1 – GET /perfil
  // ============================================================
  it("GET /perfil debe responder 200", async () => {
    const res = await agent.get("/perfil");
    expect(res.status).to.equal(200);
  });

  // ============================================================
  //                      TEST 2 – GET /perfil/info
  // ============================================================
  it("GET /perfil/info debe responder 200", async () => {
    const res = await agent.get("/perfil/info");
    expect(res.status).to.equal(200);
  });

  // ============================================================
  //                 TEST 3 – POST /perfil/editar
  // ============================================================
  it("POST /perfil/editar debe actualizar datos del usuario", async () => {
    const res = await agent
      .post("/perfil/editar")
      .send({
        nombre: "Nuevo",
        email: "nuevo@mail.com",
        tel: "555",
        pass: "abcdef",
      })
      .set("Accept", "application/json");

    expect(res.body.ok).to.equal(true);

    const actualizado = await User.findById(user._id);

    expect(actualizado.nombre).to.equal("Nuevo");
    expect(actualizado.email).to.equal("nuevo@mail.com");
    expect(actualizado.telefono).to.equal("555");
  });

  // ============================================================
  //               TEST 4 – GET /perfil/reservas (productos)
  // ============================================================
  it("GET /perfil/reservas?tipo=productos debe responder 200", async () => {
    const res = await agent.get("/perfil/reservas?tipo=productos");
    expect(res.status).to.equal(200);
  });

  // ============================================================
  //               TEST 5 – GET /perfil/reservas (citas)
  // ============================================================
  it("GET /perfil/reservas?tipo=citas debe responder 200", async () => {
    const res = await agent.get("/perfil/reservas?tipo=citas");
    expect(res.status).to.equal(200);
  });

  // ============================================================
  //             TEST 6 – POST /perfil/cancelar (cita)
  // ============================================================
  it("POST /perfil/cancelar debe cancelar una cita", async () => {
    const cita = await Cita.create({
      usuario: user._id,
      tipo: "medica",
      especie: "Perro",
      servicio: "Control",
      dia: "2025-12-01",
      hora: "10:00",
      estado: "activa",
    });

    const res = await agent
      .post("/perfil/cancelar")
      .send({ id: cita._id.toString(), tipo: "citas" })
      .set("Accept", "application/json");

    expect(res.body.ok).to.equal(true);

    const cFinal = await Cita.findById(cita._id);
    expect(cFinal.estado).to.equal("cancelada");
  });

  // ============================================================
  //           TEST 7 – POST /perfil/cancelar (reserva)
  // ============================================================
  it("POST /perfil/cancelar debe cancelar una reserva y devolver stock", async () => {

    const prod = await Producto.create({
      name: "Croquetas",
      price: 10000,
      stock: 5,
      category: "perros",
      img: "/img/test.png",
    });

    const reserva = await Reserva.create({
      usuario: user._id,
      producto: { id: prod._id },
      cantidad: 2,
      estado: "activa",
    });

    const res = await agent
      .post("/perfil/cancelar")
      .send({ id: reserva._id.toString(), tipo: "productos" })
      .set("Accept", "application/json");

    expect(res.body.ok).to.equal(true);

    const r = await Reserva.findById(reserva._id);
    const p = await Producto.findById(prod._id);

    expect(r.estado).to.equal("cancelada");
    expect(p.stock).to.equal(7); // 5 + 2 devueltos
  });

});
