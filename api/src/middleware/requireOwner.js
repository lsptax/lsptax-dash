import prisma from "../../prisma/prismaClient.js";
import { isOwnerDashboardRole } from "../utils/ownerRoles.js";

/**
 * Owner financial APIs: require User.type owner or admin.
 * Staff / default "client" portal users get 403.
 */
export async function requireOwner(req, res, next) {
  try {
    const userId = Number(req.user?.userId);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, type: true },
    });

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isOwnerDashboardRole(user.type)) {
      return res.status(403).json({
        message: "This is limited to management users.",
      });
    }

    req.ownerUser = user;
    next();
  } catch (error) {
    console.error("requireOwner error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
