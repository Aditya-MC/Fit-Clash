import dotenv from "dotenv";
import app from "./app.js";
import { connectDb } from "./config/db.js";

dotenv.config();

const port = process.env.PORT || 5000;

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception", error);
});

const startServer = async () => {
  try {
    await connectDb();
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

startServer();
