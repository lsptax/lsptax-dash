import prisma from "../../prisma/prismaClient.js";
import { sendError } from "../services/exportService.js";
import { isOwnerDashboardRole } from "../utils/ownerRoles.js";
import {
  lastManagementUserError,
  parsePortalUserType,
} from "../utils/portalUserAdmin.js";

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    type: user.type || "client",
    createdAt: user.createdAt,
  };
}

function userIdFromParams(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

async function otherManagementCount(exceptId) {
  const users = await prisma.user.findMany({
    where: { id: { not: exceptId } },
    select: { type: true },
  });
  return users.filter((user) => isOwnerDashboardRole(user.type)).length;
}

export async function listUsers(_req, res) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
        createdAt: true,
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    res.status(200).json({
      users: users.map(safeUser),
    });
  } catch (error) {
    sendError(res, 500, "Failed to load users", error);
  }
}

export async function updateUser(req, res) {
  try {
    const id = userIdFromParams(req);
    if (!id) return res.status(400).json({ message: "Invalid user" });

    const name = String(req.body?.name ?? "").trim();
    const type = parsePortalUserType(req.body?.type);
    if (!name) return res.status(400).json({ message: "Name is required" });
    if (!type) {
      return res.status(400).json({ message: "Role must be owner, admin, staff, or client" });
    }
    if (name.length > 120) {
      return res.status(400).json({ message: "Name must be 120 characters or fewer" });
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, type: true },
    });
    if (!existing) return res.status(404).json({ message: "User not found" });

    const blocked = lastManagementUserError(
      existing.type,
      type,
      await otherManagementCount(existing.id)
    );
    if (blocked) return res.status(400).json({ message: blocked });

    const user = await prisma.user.update({
      where: { id },
      data: { name, type },
      select: { id: true, name: true, email: true, type: true, createdAt: true },
    });
    res.status(200).json(safeUser(user));
  } catch (error) {
    sendError(res, 500, "Failed to update user", error);
  }
}

export async function deleteUser(req, res) {
  try {
    const id = userIdFromParams(req);
    if (!id) return res.status(400).json({ message: "Invalid user" });

    const actorId = Number(req.user?.userId);
    if (actorId === id) {
      return res.status(400).json({ message: "You can't delete the account you're signed in with." });
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, type: true },
    });
    if (!existing) return res.status(404).json({ message: "User not found" });

    const blocked = lastManagementUserError(
      existing.type,
      "client",
      await otherManagementCount(existing.id)
    );
    if (blocked) return res.status(400).json({ message: blocked });

    await prisma.user.delete({ where: { id } });
    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    sendError(res, 500, "Failed to delete user", error);
  }
}
