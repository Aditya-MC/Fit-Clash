import mongoose from "mongoose";

export const connectDb = async () => {
  if (process.env.DEMO_MODE === "true") {
    console.log("Demo mode enabled, skipping MongoDB connection");
    return;
  }

  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is not configured.");
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
};
