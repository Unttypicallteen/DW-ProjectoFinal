const path = require("path");
const express = require("express");
const request = require("supertest");
const session = require("express-session");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const { connectDatabase } = require("../../config/database");

const catalogoRoutes = require("../../routes/catalogo");
const authRoutes = require("../../routes/auth");

const User = require("../../models/user");
const Producto = require("../../models/producto");
const Reserva = require("../../models/reserva");

describe("CATÁLOGO – Tests de integración", function () {
  this.timeout(30000);

  let mongod;
  let app;
  let agent;
  let testUser;

  before(async () => {
    // Mongo en memoria
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

    // Auth para poder loguear
    app.use("/", authRoutes);

    // Rutas reales del catálogo
    app.use("/catalogo", catalogoRoutes);

    agent = request.agent(app);

    // Crear usuario de prueba
    testUser = await User.create({
      nombre: "CatUser",
      email: "cat@test.com",
      password: "12345678",
      telefono: "300",
      rol: "cliente",
    });

    // Simular login
    await agent
      .post("/login")
      .type("form")
      .send({ email: "cat@test.com", password: "12345678" });
  });

  after(async () => {
    await mongoose.connection.close();
    await mongod.stop();
  });

  it("GET /catalogo SIN sesión debe redirigir", async () => {
    const res = await request(app).get("/catalogo");
    if (![302, 301].includes(res.status)) {
      throw new Error("Debe redirigir cuando no hay sesión");
    }
  });

  it("GET /catalogo CON sesión debe responder 200", async () => {
    const res = await agent.get("/catalogo");
    if (res.status !== 200) throw new Error("GET /catalogo (con sesión) debe ser 200");
  });

  it("GET /catalogo debe mostrar productos según categoría", async () => {
    await Producto.create({
      name: "Comida Perro",
      price: 20000,
      stock: 10,
      category: "perros",
      img: "/img/test.png",
    });

    const res = await agent.get("/catalogo?cat=perros");

    if (res.status !== 200) throw new Error("Debe responder 200");

    if (!/Comida Perro/.test(res.text)) {
      throw new Error("El producto no aparece en el catálogo");
    }
  });

  it("POST /catalogo/reservar debe crear una reserva y descontar stock", async () => {
    const p = await Producto.create({
      name: "Collar Azul",
      price: 15000,
      stock: 5,
      category: "perros",
      img: "/img/collar.png",
    });

    const res = await agent
      .post("/catalogo/reservar")
      .send({ productId: p._id.toString(), qty: 2 })
      .set("Accept", "application/json");

    if (!res.body.ok) throw new Error("La reserva no fue creada");

    const reservaDB = await Reserva.findOne({ usuario: testUser._id }).populate("producto.id");
    if (!reservaDB) throw new Error("La reserva no se guardó en Mongo");

    if (reservaDB.cantidad !== 2) throw new Error("Cantidad incorrecta");

    const productDB = await Producto.findById(p._id);
    if (productDB.stock !== 3) throw new Error("No se descontó el stock correctamente");
  });
});
