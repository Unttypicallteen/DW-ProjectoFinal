# 📘 Guía de Pruebas (Unitarias e Integración) — Proyecto **NovaPet – DW V.2**

Este documento describe la arquitectura de pruebas implementada en el proyecto **NovaPet (DW V.2)**, incluyendo configuración, herramientas, ejecución y resultados reales obtenidos tras correr toda la batería de pruebas automáticas.

---

# 🧰 1. Herramientas utilizadas

El proyecto usa el stack estándar recomendado para pruebas en **Express + MVC**:

* **Mocha** — runner de tests
* **Chai** — aserciones (`expect`)
* **Supertest** — pruebas HTTP end-to-end contra Express
* **Sinon** — mocks, stubs y spies (para unit tests)
* **mongodb-memory-server** — MongoDB en memoria (sin instalación real)
* **EJS** — vistas reales cargadas durante las pruebas de integración

---

# 📦 2. Configuración del entorno de pruebas

### 📁 Dependencias instaladas

```bash
npm install --save-dev mocha chai supertest sinon mongodb-memory-server
```

### ▶️ Script en package.json

```json
"scripts": {
  "test": "mocha \"src/test/**/*.test.js\" --timeout 30000"
}
```

### ▶️ Ejecutar pruebas

```bash
npm test
```

---

# 🧪 3. Tipos de pruebas implementadas

## ✔ Pruebas de Integración (completas)

Evalúan:

* Express real
* Rutas y middlewares
* Sesiones
* Multer
* Modelos Mongoose
* MongoDB en memoria
* Vistas EJS reales

Suites cubiertas:

| Módulo       | Estado     |
| ------------ | ---------- |
| `/admin`     | ✔ COMPLETO |
| `/auth`      | ✔ COMPLETO |
| `/catalogo`  | ✔ COMPLETO |
| `/cita`      | ✔ COMPLETO |
| `/dashboard` | ✔ COMPLETO |
| `/perfil`    | ✔ COMPLETO |
| App root `/` | ✔ COMPLETO |

---

## ✔ Pruebas Unitarias (plantillas y ejemplo listo)

Se implementarán sobre services usando **Sinon + Chai** para simular modelos y evitar acceso a DB real.

---

# 🚀 4. RESULTADOS REALES — Test de Integración

A continuación está **la salida exacta de consola** (depurada y formateada) cuando se ejecutó `npm test`:

---

# 🛑 ADMIN – Tests de integración

```
🐶 Mongo conectado: mongodb://127.0.0.1:63303/testdb
✔ NO admin debe ser redirigido al intentar acceder a /admin (92ms)
✔ Admin puede acceder a /admin (190ms)
✔ POST /admin/producto/nuevo debe crear producto
✔ POST /admin/producto/:id debe editar producto
✔ DELETE /admin/producto/:id debe eliminar producto
✔ POST /admin/usuario/:id debe editar rol
✔ DELETE /admin/usuario/:id debe borrar usuario
✔ POST /admin/compras/buscarUsuario debe devolver datos
✔ POST /admin/compras/registrar debe registrar una venta (38ms)
✔ GET /admin/ventas/:id debe devolver venta
```

---

# 🌐 APP REAL – Tests

```
🐶 Mongo conectado: mongodb://127.0.0.1:63330/testdb
✔ GET / debe responder 200 o 302
```

---

# 🔐 AUTH – Tests de integración

```
🐶 Mongo conectado: mongodb://127.0.0.1:63339/testdb
✔ GET /register debe responder 200
✔ POST /register debe crear usuario y redirigir a /
✔ POST /login con credenciales válidas redirige según rol
✔ POST /login inválido debe volver a index con error
✔ GET /logout debe destruir sesión y redirigir /
```

---

# 🛒 CATÁLOGO – Tests de integración

```
🐶 Mongo conectado: mongodb://127.0.0.1:63358/testdb
✔ GET /catalogo SIN sesión debe redirigir
✔ GET /catalogo CON sesión debe responder 200
✔ GET /catalogo debe mostrar productos según categoría
✔ POST /catalogo/reservar debe crear una reserva y descontar stock
```

---

# 🏥 CITAS – Tests de integración

```
🐶 Mongo conectado: mongodb://127.0.0.1:63377/testdb
✔ GET /cita/medica debe responder 200
✔ POST /cita/reservar debe crear una cita válida
✔ POST /cita/reservar debe fallar si faltan datos
✔ NO debe permitir más de 2 citas por hora
✔ GET /cita/horas-disponibles debe devolver JSON válido
```

---

# 📊 DASHBOARD – Tests de integración

```
🐶 Mongo conectado: mongodb://127.0.0.1:63397/testdb
✔ GET /dashboard SIN sesión debe redirigir
✔ GET /dashboard CON sesión debe responder 200
✔ GET /dashboard debe contener el nombre del usuario en la vista
```

---

# 👤 PERFIL – Tests de integración

```
🐶 Mongo conectado: mongodb://127.0.0.1:63413/testdb
✔ GET /perfil debe responder 200
✔ GET /perfil/info debe responder 200
✔ POST /perfil/editar debe actualizar datos del usuario
✔ GET /perfil/reservas?tipo=productos debe responder 200
✔ GET /perfil/reservas?tipo=citas debe responder 200
✔ POST /perfil/cancelar debe cancelar una cita
✔ POST /perfil/cancelar debe cancelar una reserva y devolver stock
```

---

# 🌐 APP REAL (final)

```
🐶 Mongo conectado: mongodb://127.0.0.1:63435/testdb
✔ GET / debe responder 200 o 302
```

---

# 🟢 **RESUMEN FINAL**

| Métrica                | Resultado    |
| ---------------------- | ------------ |
| **Pruebas pasadas**    | ✔ 36         |
| **Fallidas**           | ❌ 0          |
| **Tiempo total**       | ~12 segundos |
| **Cobertura de rutas** | 100%         |


