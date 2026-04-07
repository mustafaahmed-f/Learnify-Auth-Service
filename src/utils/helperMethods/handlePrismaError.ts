import { Prisma } from "../../generated/prisma/client.js";

export function handlePrismaError(error: any): {
  status: number;
  message: string;
} {
  if (error instanceof (Prisma as any).PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return {
          status: 409,
          message: `Duplicate value for ${error.meta?.target}`,
        };
      case "P2003":
        return { status: 400, message: "Invalid foreign key reference" };
      case "P2025":
        return { status: 404, message: "Record not found" };
      case "P2014":
        return { status: 400, message: "Invalid relation reference" };
      case "P2000":
        return {
          status: 400,
          message: `Value too long for ${error.meta?.column_name}`,
        };
      default:
        return {
          status: 500,
          message: `Database error : ${error.message}`,
        };
    }
  }

  if (error instanceof (Prisma as any).PrismaClientValidationError) {
    return { status: 400, message: `Invalid input data :  ${error}` };
  }

  return { status: 500, message: `[Non-Prisma Error] : ${error}` };
}
