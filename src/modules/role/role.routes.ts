import { Router } from "express";
import { addRole } from "./controllers/addRole.js";
import { removeRole } from "./controllers/removeRole.js";
import {
  checkAuth,
  checkRole,
  validationMiddleware,
} from "@mustafahmed1997/learnify-backend";
import { addRoleSchema } from "./validations/addRole.validation.js";
import { removeRoleSchema } from "./validations/removeRole.validation.js";

const router = Router();

router.use(checkAuth);

router.use(checkRole(["ADMIN"]));

router.post("/:userId", validationMiddleware({ body: addRoleSchema }), addRole);
router.delete(
  "/:userId/:role",
  validationMiddleware({ body: removeRoleSchema }),
  removeRole,
);

export default router;
