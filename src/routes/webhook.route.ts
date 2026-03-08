import express from "express";
import { Router } from "express";
import { clerkWebhookHandler } from "../controllers/clerkWebHook.js";

const router = Router();

router.post(
  `/webhooks/clerk`,
  express.raw({ type: "application/json" }),
  clerkWebhookHandler,
);

export default router;
