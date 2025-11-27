const path = require("path");
const express = require("express");
const request = require("supertest");
const session = require("express-session");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const { connectDatabase } = require("../../config/database");

const authRoutes = require("../../routes/auth");
const User = require("../../models/user");

describe("AUTH – Tests de integración", function () {
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
    app.set("views", path.resolve(__dirname, "../../../src/views"));

    app.use("/", authRoutes);
  });

  after(async () => {
    await mongoose.connection.close();
    await mongod.stop();
  });

  it("GET /register debe responder 200", async () => {
    const res = await request(app).get("/register");
    if (res.status !== 200) throw new Error("GET /register debe ser 200");
  });

  it("POST /register debe crear usuario y redirigir a /", async () => {
    const res = await request(app)
      .post("/register")
      .type("form")
      .send({
        nombre: "TestUser",
        email: "test@test.com",
        password: "12345678",
        password2: "12345678",
        telefono: "3000000000",
      });

    if (res.status !== 302) throw new Error("POST /register debe redirigir");

    const created = await User.findOne({ email: "test@test.com" });
    if (!created) throw new Error("El usuario no fue creado");
  });

  it("POST /login con credenciales válidas redirige según rol", async () => {
    await User.create({
      nombre: "LoginUser",
      email: "login@test.com",
      password: "123456",
      telefono: "300",
      rol: "cliente",
    });

    const res = await request(app)
      .post("/login")
      .type("form")
      .send({ email: "login@test.com", password: "123456" });

    if (res.status !== 302) throw new Error("Login válido debe redirigir");
  });

  it("POST /login inválido debe volver a index con error", async () => {
    const res = await request(app)
      .post("/login")
      .type("form")
      .send({ email: "noexiste@test.com", password: "wrong" });

    if (res.status !== 400) throw new Error("Debe devolver 400 en login inválido");
  });

  it("GET /logout debe destruir sesión y redirigir /", async () => {
    const agent = request.agent(app);

    await agent
      .post("/login")
      .type("form")
      .send({ email: "login@test.com", password: "123456" });

    const logoutRes = await agent.get("/logout");

    if (logoutRes.status !== 302) throw new Error("Logout debe redirigir /");
  });
});
