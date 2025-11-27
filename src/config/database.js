import mongoose from "mongoose";

export async function connectDatabase() {
  const host = process.env.MONGO_HOST || "127.0.0.1";
  const port = process.env.MONGO_PORT || "27017";
  const dbName = process.env.MONGO_DB || "novapet";

  const uri = `mongodb://${host}:${port}/${dbName}`;

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("🐶 Mongo conectado:", uri);
}
