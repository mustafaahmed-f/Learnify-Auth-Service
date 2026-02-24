import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import { clerkMiddleware } from "@clerk/express";
import express, { Application, Request, Response } from "express";
import { MainAppName } from "./utils/constants/mainAppName.js";
import { globalErrorHandler } from "./utils/helperMethods/globalErrorHandler.js";

export async function initiateApp(app: Application) {
  const baseURL = `/${MainAppName}`;
  const port = process.env.PORT || 7001;

  app.use(clerkMiddleware());

  app.use(express.json());

  app.use(cookieParser());

  app.use(morgan("dev"));
  app.set("trust proxy", true);

  const allowedOrigins = ["http://localhost:3000"];

  app.use(
    cors({
      origin: allowedOrigins,
      allowedHeaders: ["Content-Type", "Authorization", "x-client-id"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // allow all methods you need
      credentials: true,
    }),
  );

  app.get(`/`, (req: Request, res: Response) => {
    return res.send(`Hello ${MainAppName}!!`);
  });

  app.use("/{*any}", (req: Request, res: Response) => {
    res.status(404).json({ error: "In-valid routing .. " });
  });

  app.use(globalErrorHandler);
  app.listen(port, () =>
    console.log(`Server is running on port ${process.env.PORT}`),
  );

  return app;
}
