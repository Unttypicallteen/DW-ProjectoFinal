import mongoose from "mongoose";

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("❌ ERROR: MONGODB_URI no está definida en Vercel.");
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("🐶 MongoDB conectado a Atlas correctamente");
  } catch (error) {
    console.error("❌ Error conectando a MongoDB Atlas:", error.message);
  }
}
