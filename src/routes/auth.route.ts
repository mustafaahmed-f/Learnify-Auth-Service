import { clerkMiddleware } from "@clerk/express";
import { Router } from "express";
import { updateRole } from "../controllers/updateRole.js";

const router = Router();

router.use(clerkMiddleware());

router.patch(`/updateRole`, updateRole);

export default router;
