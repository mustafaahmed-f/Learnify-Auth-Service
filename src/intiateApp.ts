import { clerkMiddleware } from "@clerk/express";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import morgan from "morgan";
import { clerkWebhookHandler } from "./controllers/clerkWebHook.js";
import authRouter from "./routes/auth.route.js";
import { MainAppName } from "./utils/constants/mainAppName.js";

export async function initiateApp(app: Application) {
  const baseURL = `/${MainAppName}`;
  const port = process.env.PORT || 7001;

  app.use(clerkMiddleware());

  app.post(
    `${baseURL}/webhooks/clerk`,
    express.raw({ type: "application/json" }),
    clerkWebhookHandler,
  );

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

  app.get(baseURL, (req: Request, res: Response) => {
    return res.send(`Hello ${MainAppName}!!`);
  });

  app.use(baseURL, authRouter);

  app.use("/{*any}", (req: Request, res: Response) => {
    res.status(404).json({ error: "Auth service in-valid routing .. " });
  });

  app.listen(port, () =>
    console.log(`Server is running on port ${process.env.PORT}`),
  );

  return app;
}
