import { NextFunction, Request, Response } from "express";
import { Webhook } from "svix";
import { clerkEventHandler } from "../utils/helperMethods/clerkEventHandler.js";

const webhookSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET!;

export async function clerkWebhookHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const headers = {
    "svix-id": req.headers["svix-id"] as string,
    "svix-timestamp": req.headers["svix-timestamp"] as string,
    "svix-signature": req.headers["svix-signature"] as string,
  };

  if (
    !headers["svix-id"] ||
    !headers["svix-timestamp"] ||
    !headers["svix-signature"]
  ) {
    console.error("❌ Missing required Svix headers");
    return res.status(400).send("Missing Svix headers");
  }

  try {
    const wh = new Webhook(webhookSecret);
    const event = wh.verify(req.body.toString(), headers) as any;
    console.log("✅ Verified Clerk event:", event.type);

    clerkEventHandler(event, res);
  } catch (error: any) {
    console.error("Webhook verification failed:", error);
    return res.status(400).send(`Webhook error : ${error.message}`);
  }
}
