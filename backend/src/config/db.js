import mongoose from "mongoose";

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected.");
  } catch (err) {
    console.log("MongoDB connection failed: ", err);
    process.exit(1);
  }
}
