import {
  checkAuth,
  checkRole,
  validationMiddleware,
} from "@mustafahmed1997/learnify-backend";
import { Router } from "express";
import { getUser } from "./controllers/getUser.js";
import { getUsers } from "./controllers/getUsers.js";
import { blockUser } from "./controllers/blockUser.js";
import { getUsersSchema } from "./validations/getUsers.validation.js";
import { getUserSchema } from "./validations/getUser.validation.js";
import { blockUserSchema } from "./validations/blockUser.validation.js";

const router = Router();

router.get("/:userId", validationMiddleware({ body: getUserSchema }), getUser);

router.use(checkAuth);
router.use(checkRole(["ADMIN"]));

router.get("/users", validationMiddleware({ body: getUsersSchema }), getUsers);
router.patch(
  "/block/:userId",
  validationMiddleware({ body: blockUserSchema }),
  blockUser,
);
router.patch(
  "/unblock/:userId",
  validationMiddleware({ body: blockUserSchema }),
  blockUser,
);

export default router;
