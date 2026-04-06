import { Response } from "express";
import { prisma } from "../../services/prismaClient.js";
import { clerkClient } from "@clerk/express";

export async function clerkEventHandler(event: any, res: Response) {
  switch (event.type) {
    case "user.created": {
      const {
        id,
        email_addresses,
        first_name,
        last_name,
        username,
        image_url,
      } = event.data;
      let email_address = email_addresses[0].email_address;
      let result = await prisma.user.create({
        data: {
          email: email_address,
          firstName: first_name ?? "",
          lastName: last_name ?? "",
          userName: username ?? "",
          clerkId: id,
          img: image_url,
        },
      });
      if (!result) {
        throw new Error("Failed to add user !!");
      }

      await clerkClient.users.updateUserMetadata(id, {
        publicMetadata: {
          role: result.role,
        },
      });
      console.log("✅ User has been added to DB:", id);
      return res.status(200).json({ success: true });
    }
    case "user.updated": {
      const {
        id,
        email_addresses,
        first_name,
        last_name,
        username,
        image_url,
      } = event.data;
      let email_address = email_addresses[0].email_address;
      let result = await prisma.user.update({
        where: {
          email: email_address,
        },
        data: {
          email: email_address,
          firstName: first_name ?? "",
          lastName: last_name ?? "",
          userName: username ?? "",
          clerkId: id,
          img: image_url,
        },
      });
      if (!result) {
        throw new Error("Failed to update user !!");
      }
      console.log("✅ User has been updated :", id);
      return res.status(200).json({ success: true });
    }
    case "user.deleted": {
      const { id } = event.data;

      let result = await prisma.user.delete({
        where: {
          clerkId: id,
        },
      });
      if (!result) {
        throw new Error("Failed to delete user !!");
      }
      console.log("✅ User has been deleted :", id);
      return res.status(200).json({ success: true });
    }
    default:
      console.log("Unhandled event:", event.type);
      return res.status(200).json({ received: true });
  }
}
