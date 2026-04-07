import express from "express";
import { Router } from "express";
import { clerkWebhookHandler } from "../controllers/clerkWebHook.js";
import { updateRole } from "../controllers/updateRole.js";
import { clerkMiddleware } from "@clerk/express";

const router = Router();

router.use(clerkMiddleware());

router.post(
  `/webhooks/clerk`,
  express.raw({ type: "application/json" }),
  clerkWebhookHandler,
);

router.patch(`/updateRole`, updateRole);

export default router;
