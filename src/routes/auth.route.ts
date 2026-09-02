import { clerkMiddleware } from "@clerk/express";
import { Router } from "express";
import { updateRole } from "../controllers/updateRole.js";
import { checkRole } from "../middlewares/checkRole.js";
import { validRoles } from "../utils/constants/validRoles.js";
import { checkAuth } from "../middlewares/checkAuth.js";

const router = Router();

router.patch(`/updateRole`, checkAuth, checkRole(["ADMIN"]), updateRole);

export default router;
