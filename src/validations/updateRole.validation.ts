import { requiredFieldMsg } from "@mustafahmed1997/learnify-backend";
import { z } from "zod";

export const updateRoleSchema = z.object({
  role: z.enum(["STUDENT", "INSTRUCTOR", "ADMIN"]),
  targetUser: z.cuid2().min(1, requiredFieldMsg("Target User ID")),
});
