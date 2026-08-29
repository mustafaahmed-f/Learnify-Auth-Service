import { clerkMiddleware } from "@clerk/express";
import { Router } from "express";
import { updateRole } from "../controllers/updateRole.js";
import { checkRole } from "../middlewares/checkRole.js";
import { validRoles } from "../utils/constants/validRoles.js";

const router = Router();
router.use(checkRole([validRoles[0]]));

router.patch(`/updateRole`, clerkMiddleware(), updateRole);

export default router;
