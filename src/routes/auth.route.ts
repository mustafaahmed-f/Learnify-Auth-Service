import express from "express";
import { Router } from "express";
import { clerkWebhookHandler } from "../controllers/clerkWebHook.js";
import { updateRole } from "../controllers/updateRole.js";

const router = Router();

router.post(
  `/webhooks/clerk`,
  express.raw({ type: "application/json" }),
  clerkWebhookHandler,
);

router.put(`/updateRole`, updateRole);

export default router;
