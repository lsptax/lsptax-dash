/**
 * Create a portal login. The password is asked in the terminal and is never
 * accepted on the command line, so it stays out of shell history.
 *
 * From the repo root:
 *   npm run add-user -- --name="Lavanya" --email="lavanya@example.com" --type=staff
 *
 * Omit any of --name, --email, or --type and the script will ask for it.
 * Types: client (default), staff, owner, admin.
 */

import "dotenv/config";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import bcrypt from "bcrypt";
import prisma from "../prisma/prismaClient.js";

const USER_TYPES = ["client", "staff", "owner", "admin"];

function parseArgs(argv) {
  const out = { name: "", email: "", type: "" };
  for (const arg of argv.slice(2)) {
    if (arg === "--password" || arg.startsWith("--password=")) {
      throw new Error(
        "Do not pass --password. This script asks for it in the terminal so it stays out of shell history."
      );
    }
    if (arg.startsWith("--name=")) out.name = arg.slice("--name=".length).trim();
    else if (arg.startsWith("--email=")) out.email = arg.slice("--email=".length).trim();
    else if (arg.startsWith("--type=")) out.type = arg.slice("--type=".length).trim();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function normalizeType(raw) {
  const type = String(raw || "client").trim().toLowerCase();
  if (!USER_TYPES.includes(type)) {
    throw new Error(`Type must be one of: ${USER_TYPES.join(", ")}`);
  }
  return type;
}

function normalizeEmail(raw) {
  const email = String(raw || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid email is required");
  }
  return email;
}

async function ask(rl, label) {
  const answer = await rl.question(label);
  return answer.trim();
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set (or missing from .env).");
  }

  const args = parseArgs(process.argv);
  const rl = readline.createInterface({ input, output });

  try {
    const name = args.name || (await ask(rl, "Name: "));
    if (!name) throw new Error("Name is required");

    const email = normalizeEmail(args.email || (await ask(rl, "Email: ")));
    const type = normalizeType(
      args.type || (await ask(rl, `Type (${USER_TYPES.join(", ")}) [client]: `))
    );

    const password = await rl.question("Password: ");
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    const confirm = await rl.question("Confirm password: ");
    if (password !== confirm) {
      throw new Error("Passwords do not match");
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, type: true },
    });
    if (existing) {
      throw new Error(
        `Email already in use (id ${existing.id}, ${existing.name}, type ${existing.type})`
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, type },
      select: { id: true, name: true, email: true, type: true },
    });

    console.log(
      `Created user ${user.id}: ${user.name} <${user.email}> (${user.type})`
    );
  } finally {
    rl.close();
  }
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
