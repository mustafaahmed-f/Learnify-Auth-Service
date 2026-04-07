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

router.patch(`/updateRole`, updateRole);

export default router;
