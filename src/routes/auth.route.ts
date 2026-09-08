import { Router } from "express";
import { updateRole } from "../controllers/updateRole.js";
import {
  checkAuth,
  checkRole,
  validationMiddleware,
} from "@mustafahmed1997/learnify-backend";
import { updateRoleSchema } from "../validations/updateRole.validation.js";

const router = Router();

router.patch(
  `/updateRole`,
  checkAuth,
  checkRole(["ADMIN"]),
  validationMiddleware(updateRoleSchema),
  updateRole,
);

export default router;
