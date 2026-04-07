import { getAuth } from "@clerk/express";
import { Request, Response } from "express";
import { prisma } from "../../services/prismaClient.js";

export async function checkIdAndUser(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) throw new Error("UserId from clerk is not found!!");
  const user = await prisma.user.findUnique({
    where: {
      clerkId: userId,
    },
  });
  if (!user) throw new Error("User not found");
  return user;
}
