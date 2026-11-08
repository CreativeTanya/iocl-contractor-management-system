import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "node:crypto";
import Invitation from "../models/Invitation.js";
import { sendEmail } from "../emailService.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";
const router = express.Router();

// User login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from the environment.");
      return res.status(500).json({
        success: false,
        message: "Authentication is not configured.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to log in right now.",
    });
  }
});
router.post("/invite", authenticateToken, requireRole("Admin"), async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !["Admin", "User"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Valid email and role are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    await Invitation.deleteMany({
      email: normalizedEmail,
      usedAt: null,
    });

    const token = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    await Invitation.create({
      email: normalizedEmail,
      role,
      tokenHash,
      invitedBy: req.user._id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const invitationLink = `${frontendUrl}/?invite=${token}`;

    await sendEmail({
      to: normalizedEmail,
      subject: "Invitation - ContractCare",
      text: `You have been invited to ContractCare as ${role}. Accept your invitation within 24 hours: ${invitationLink}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#334155;">
          <h2 style="color:#0f172a;">ContractCare Invitation</h2>
          <p>You have been invited to join the Contractor Management System.</p>
          <p>Your assigned role is <strong>${role}</strong>.</p>
          <a href="${invitationLink}" style="display:inline-block;padding:12px 22px;background:#f97316;color:white;text-decoration:none;border-radius:6px;">
            Accept Invitation
          </a>
          <p style="margin-top:20px;font-size:13px;color:#64748b;">
            This invitation expires in 24 hours. If you did not expect this email, you can ignore it.
          </p>
        </div>
      `,
    });

    return res.status(201).json({
      success: true,
      message: "Invitation sent successfully.",
    });
  } catch (error) {
    console.error("Invitation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to send invitation.",
    });
  }
});
router.get("/invitation/:token", async (req, res) => {
  try {
    const tokenHash = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const invitation = await Invitation.findOne({
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: "This invitation is invalid, expired or already used.",
      });
    }

    return res.json({
      success: true,
      email: invitation.email,
      role: invitation.role,
    });
  } catch (error) {
    console.error("Invitation verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to verify invitation.",
    });
  }
});
router.post("/register", async (req, res) => {
  try {
    const { token, name, password } = req.body;

    if (
      typeof token !== "string" ||
      typeof name !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid invitation, name and password (at least 8 characters) are required.",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const invitation = await Invitation.findOneAndUpdate(
      {
        tokenHash,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: { usedAt: new Date() },
      },
      { new: true }
    );

    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: "This invitation is invalid, expired or already used.",
      });
    }

    const existingUser = await User.findOne({ email: invitation.email });

    if (existingUser) {
      invitation.usedAt = null;
      await invitation.save();

      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({
      name: name.trim(),
      email: invitation.email,
      passwordHash,
      role: invitation.role,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create account.",
    });
  }
});
export default router;