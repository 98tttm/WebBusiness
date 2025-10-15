import mongoose from "mongoose";

export async function connectDB(uri) {
  if (!uri) {
    throw new Error("Missing MongoDB connection string. Set MONGO_URI in environment.");
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
  });
  return mongoose.connection;
}
