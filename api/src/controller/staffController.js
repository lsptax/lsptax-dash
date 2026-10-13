import prisma from "../../prisma/prismaClient.js";
import { isAssignableStaffType } from "../utils/propertyClassification.js";

export async function listStaff(_req, res) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, type: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    const staff = users.filter((user) => isAssignableStaffType(user.type));
    res.status(200).json({ staff });
  } catch (error) {
    console.error("listStaff error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
