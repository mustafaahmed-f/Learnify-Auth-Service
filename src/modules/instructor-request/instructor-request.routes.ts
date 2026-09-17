import {
  checkAuth,
  checkRole,
  validationMiddleware,
} from "@mustafahmed1997/learnify-backend";
import { Router } from "express";
import { submitRequestSchema } from "./validations/submitRequest.validation.js";
import { submitRequest } from "./controllers/submitRequest.js";
import { cancelRequestSchema } from "./validations/cancelRequest.validation.js";
import { cancelRequest } from "./controllers/cancelRequest.js";
import { approveRequest } from "./controllers/approveRequest.js";

const router = Router();

router.use(checkAuth);

router.post(
  "/submit/:userId",
  checkRole(["STUDENT"], { mode: "Exact" }),
  validationMiddleware({ body: submitRequestSchema }),
  submitRequest,
);
router.delete(
  "/cancel/:userId/:requestId",
  checkRole(["STUDENT"], { mode: "Exact" }),
  validationMiddleware({ body: cancelRequestSchema }),
  cancelRequest,
);
router.post("/approve/:requestId", checkRole(["ADMIN"]), approveRequest);

export default router;
