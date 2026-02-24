import dotenv from "dotenv";
import express, { Application } from "express";
import { initiateApp } from "./intiateApp.js";
dotenv.config();

const app: Application = express();

try {
  initiateApp(app);
} catch (error) {
  console.log("Auth service error : ", error);
}

process.on("unhandledRejection", (reason, p) => {
  console.error("Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("uncaughtExceptionMonitor", (err) => {
  console.error("Uncaught Exception (Monitor):", err);
});

export default app;
