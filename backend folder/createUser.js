import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

const rl = readline.createInterface({ input, output });

async function createUser() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const name = (await rl.question("User name: ")).trim();
    const email = (await rl.question("User email: "))
      .trim()
      .toLowerCase();
    const password = await rl.question("User password (input will be visible): ");

    if (!name || !email || !password) {
      throw new Error("Name, email and password are required.");
    }

    if (password.length < 12) {
      throw new Error("Use a password of at least 12 characters.");
    }

    const existingEmail = await User.findOne({ email });

    if (existingEmail) {
      throw new Error("This email is already registered.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
      passwordHash,
      role: "User",
    });

    console.log("User account created successfully.");
  } catch (error) {
    console.error("User setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.disconnect().catch(() => {});
  }
}

createUser();