import { Router } from "express";
import { updateRole } from "../controllers/updateRole.js";
import { checkAuth, checkRole } from "@mustafahmed1997/learnify-backend";

const router = Router();

router.patch(`/updateRole`, checkAuth, checkRole(["ADMIN"]), updateRole);

export default router;
