import bcrypt from "bcrypt";
import prisma from "../../prisma/prismaClient.js";
import { sendError } from "../services/exportService.js";

function toSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    type: user.type || "client",
  };
}

export async function getProfile(req, res) {
  try {
    const userId = Number(req.user?.userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, type: true },
    });
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    res.status(200).json(toSafeUser(user));
  } catch (error) {
    sendError(res, 500, "Failed to load profile", error);
  }
}

export async function updateProfile(req, res) {
  try {
    const userId = Number(req.user?.userId);
    const name = String(req.body?.name ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();

    if (!name) return res.status(400).json({ message: "Name is required" });
    if (!email || !email.includes("@")) {
      return res.status(400).json({ message: "A valid email is required" });
    }

    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } },
      select: { id: true },
    });
    if (existing) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name, email },
      select: { id: true, name: true, email: true, type: true },
    });
    res.status(200).json(toSafeUser(user));
  } catch (error) {
    sendError(res, 500, "Failed to update profile", error);
  }
}

export async function updatePassword(req, res) {
  try {
    const userId = Number(req.user?.userId);
    const currentPassword = String(req.body?.currentPassword ?? "");
    const newPassword = String(req.body?.newPassword ?? "");

    if (!currentPassword) {
      return res.status(400).json({ message: "Current password is required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
    res.status(200).json({ message: "Password updated" });
  } catch (error) {
    sendError(res, 500, "Failed to update password", error);
  }
}
