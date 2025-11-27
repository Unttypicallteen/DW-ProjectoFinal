const path = require("path");
const express = require("express");
const request = require("supertest");
const session = require("express-session");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const { connectDatabase } = require("../../config/database");

const authRoutes = require("../../routes/auth");
const dashboardRoutes = require("../../routes/dashboard");

const User = require("../../models/user");

describe("DASHBOARD – Tests de integración", function () {
  this.timeout(30000);

  let mongod;
  let app;
  let agent;
  let user;

  before(async () => {
    // Mongo temporal
    mongod = await MongoMemoryServer.create();
    const uri = new URL(mongod.getUri());

    process.env.MONGO_HOST = uri.hostname;
    process.env.MONGO_PORT = uri.port;
    process.env.MONGO_DB = (uri.pathname && uri.pathname.slice(1)) || "testdb";

    await connectDatabase();

    // Express real
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
    app.set("views", path.resolve(__dirname, "../../../src/views"));

    // Rutas reales
    app.use("/", authRoutes);
    app.use("/dashboard", dashboardRoutes);

    agent = request.agent(app);

    // Crear usuario
    user = await User.create({
      nombre: "DashUser",
      email: "dash@test.com",
      password: "123456",
      telefono: "300",
      rol: "cliente",
    });
  });

  after(async () => {
    await mongoose.connection.close();
    await mongod.stop();
  });

  it("GET /dashboard SIN sesión debe redirigir", async () => {
    const res = await request(app).get("/dashboard");
    if (![302, 301].includes(res.status)) {
      throw new Error("Debe redirigir si no hay sesión");
    }
  });

  it("GET /dashboard CON sesión debe responder 200", async () => {
    // Login primero
    await agent
      .post("/login")
      .type("form")
      .send({ email: "dash@test.com", password: "123456" });

    const res = await agent.get("/dashboard");

    if (res.status !== 200) {
      throw new Error("Dashboard debe responder 200 estando logueado");
    }
  });

  it("GET /dashboard debe contener el nombre del usuario en la vista", async () => {
    const res = await agent.get("/dashboard");

    if (!/DashUser/.test(res.text)) {
      throw new Error("La vista no muestra el nombre del usuario");
    }
  });
});
