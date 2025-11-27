import { expect } from "chai";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

import { connectDatabase } from "../../config/database.js";
import adminRoutes from "../../routes/admin.js";

import User from "../../models/user.js";
import Producto from "../../models/producto.js";
import Reserva from "../../models/reserva.js";
import Venta from "../../models/venta.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../../");

describe("ADMIN – Tests de integración", function () {
    this.timeout(30000);

    let app, agent, mongod;
    let currentUser = null;

    function loginAs(data) {
        currentUser = data;
    }

    before(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = new URL(mongod.getUri());

        process.env.MONGO_HOST = uri.hostname;
        process.env.MONGO_PORT = uri.port;
        process.env.MONGO_DB =
            (uri.pathname && uri.pathname.slice(1)) || "testdb";

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

        app.use((req, res, next) => {
            req.session.user = currentUser || null;
            next();
        });

        app.set("view engine", "ejs");
        app.set("views", path.join(ROOT, "views"));

        app.use("/admin", adminRoutes);

        agent = request.agent(app);
    });

    after(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongod.stop();
    });

    // 1) Cliente NO puede entrar
    it("NO admin debe ser redirigido al intentar acceder a /admin", async () => {
        loginAs({ nombre: "Pepe", rol: "cliente" });

        const res = await agent.get("/admin");

        expect([302, 403]).to.include(res.status);
    });

    // 2) Admin sí puede entrar
    it("Admin puede acceder a /admin", async () => {
        loginAs({ nombre: "Admin", rol: "admin" });

        await Venta.create({
            fecha: new Date(),
            total: 0,
            productos: [],
        });

        const res = await agent.get("/admin");
        expect(res.status).to.equal(200);
    });

    // 3) Crear producto
    it("POST /admin/producto/nuevo debe crear producto", async () => {
        loginAs({ rol: "admin" });

        const res = await agent
            .post("/admin/producto/nuevo")
            .field("name", "Dog Food")
            .field("price", 12000)
            .field("stock", 5)
            .field("category", "perros");

        expect(res.status).to.equal(200);

        const prod = await Producto.findOne({ name: "Dog Food" });
        expect(prod).to.exist;
    });

    // 4) Editar producto
    it("POST /admin/producto/:id debe editar producto", async () => {
        loginAs({ rol: "admin" });

        const prod = await Producto.create({
            name: "Arena",
            price: 10000,
            stock: 5,
            category: "gatos",
            img: "/img/default.png",
        });

        const res = await agent
            .post(`/admin/producto/${prod._id}`)
            .field("name", "Arena Premium")
            .field("price", 20000)
            .field("stock", 3)
            .field("category", "gatos");

        expect(res.status).to.equal(200);

        const updated = await Producto.findById(prod._id);
        expect(updated.name).to.equal("Arena Premium");
    });

    // 5) Eliminar producto
    it("DELETE /admin/producto/:id debe eliminar producto", async () => {
        loginAs({ rol: "admin" });

        const prod = await Producto.create({
            name: "Juguete",
            price: 5000,
            stock: 10,
            category: "otros",
            img: "/img/default.png",
        });

        const res = await agent.delete(`/admin/producto/${prod._id}`);
        expect(res.status).to.equal(200);

        const deleted = await Producto.findById(prod._id);
        expect(deleted).to.be.null;
    });

    // 6) Editar rol usuario
    it("POST /admin/usuario/:id debe editar rol", async () => {
        loginAs({ rol: "admin" });

        const user = await User.create({
            nombre: "Luis",
            email: "luis@mail.com",
            password: "12345678",
            rol: "cliente",
        });

        const res = await agent
            .post(`/admin/usuario/${user._id}`)
            .send({ rol: "cajero" });

        expect(res.status).to.equal(200);

        const updated = await User.findById(user._id);
        expect(updated.rol).to.equal("cajero");
    });

    // 7) Eliminar usuario
    it("DELETE /admin/usuario/:id debe borrar usuario", async () => {
        loginAs({ rol: "admin" });

        const user = await User.create({
            nombre: "Ana",
            email: "ana@mail.com",
            password: "12345678",
            rol: "cliente",
        });

        const res = await agent.delete(`/admin/usuario/${user._id}`);
        expect(res.status).to.equal(200);

        const deleted = await User.findById(user._id);
        expect(deleted).to.be.null;
    });

    // 8) Buscar usuario
    it("POST /admin/compras/buscarUsuario debe devolver datos", async () => {
        loginAs({ rol: "admin" });

        await User.create({
            nombre: "Carlos",
            email: "c@mail.com",
            password: "12345678",
            rol: "cliente",
        });

        const res = await agent
            .post("/admin/compras/buscarUsuario")
            .send({ nombreUsuario: "Carlos" });

        expect(res.status).to.equal(200);
        expect(res.body.usuario.nombre).to.equal("Carlos");
    });

    // 9) Registrar venta
    it("POST /admin/compras/registrar debe registrar una venta", async () => {
        loginAs({ rol: "admin" });

        const prod = await Producto.create({
            name: "Snack",
            price: 2000,
            stock: 10,
            category: "otros",
            img: "/img/default.png",
        });

        const res = await agent.post("/admin/compras/registrar").send({
            usuarioId: "",
            productosSeleccionados: JSON.stringify([
                { id: prod._id, cantidad: 1 },
            ]),
            reservasSeleccionadas: [],
            serviciosSeleccionados: [],
            metodoPago: "efectivo",
            total: 2000,
        });

        expect(res.status).to.equal(200);
    });

    // 10) Obtener venta
    it("GET /admin/ventas/:id debe devolver venta", async () => {
        loginAs({ rol: "admin" });

        const venta = await Venta.create({
            total: 30000,
            fecha: new Date(),
            productos: [],
            servicios: [],
        });

        const res = await agent.get(`/admin/ventas/${venta._id}`);
        expect(res.status).to.equal(200);
        expect(res.body.total).to.equal(30000);
    });
});
