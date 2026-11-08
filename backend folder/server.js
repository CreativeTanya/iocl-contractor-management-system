import EmailLog from "./models/EmailLog.js";
import {
  startReminderScheduler,
  runReminderChecks
} from "./reminderScheduler.js";
import { authenticateToken, requireRole } from "./middleware/auth.js";
import authRouter from "./routes/auth.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import dns from "node:dns";
import Contractor from "./models/Contractor.js";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "https://iocl-contractor-management-system.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

app.use("/api/auth", authRouter);
// Root health check for Render and browser diagnostics
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "ContractCare API is running" });
});

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "IOCL Contractor Management API is running",
    database:
      mongoose.connection.readyState === 1
        ? "Connected"
        : "Disconnected",
  });
});
// Get all contractors
app.get("/api/contractors", authenticateToken, async (req, res) => {
  try {
    const contractors = await Contractor.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: contractors,
    });
  } catch (error) {
    console.error("Error fetching contractors:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch contractors",
    });
  }
});

// Add a contractor
app.post(
  "/api/contractors",
  authenticateToken,
  requireRole("Admin"),
  async (req, res) => {
  try {
    const { name, contactPerson, email, phone, purchaseOrders } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Contractor name is required",
      });
    }

    const orders = (purchaseOrders || []).map((po) => {
      const amount = Number(po.amount || 0);
      const amountPaid = Number(po.amountPaid || 0);
      const remainingAmount = Math.max(0, amount - amountPaid);

      const today = new Date().toISOString().slice(0, 10);

      let paymentStatus = "Pending";

      if (remainingAmount === 0) {
        paymentStatus = "Paid";
      } else if (po.dueDate && po.dueDate < today) {
        paymentStatus = "Overdue";
      }

      return {
        ...po,
        amount,
        amountPaid,
        remainingAmount,
        paymentStatus,
      };
    });

    const contractor = await Contractor.create({
      name: name.trim(),
      contactPerson,
      email,
      phone,
      purchaseOrders: orders,
    });

    res.status(201).json({
      success: true,
      message: "Contractor saved successfully",
      data: contractor,
    });
  } catch (error) {
    console.error("Error saving contractor:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to save contractor",
    });
  }
  }
);
// Update a contractor
app.put(
"/api/contractors/:id",
authenticateToken,
requireRole("Admin"),
async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contactPerson, email, phone, purchaseOrders } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contractor ID",
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Contractor name is required",
      });
    }

    if (!Array.isArray(purchaseOrders)) {
      return res.status(400).json({
        success: false,
        message: "Purchase orders must be provided as an array",
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    const orders = purchaseOrders.map((po) => {
      const amount = Number(po.amount);
      const amountPaid = Number(po.amountPaid || 0);

      if (
        !po.poNumber ||
        !Number.isFinite(amount) ||
        amount < 0 ||
        !Number.isFinite(amountPaid) ||
        amountPaid < 0 ||
        amountPaid > amount
      ) {
        throw new Error("Check the PO number, amount and amount paid.");
      }

      const remainingAmount = Math.max(0, amount - amountPaid);

      let paymentStatus = "Pending";

      if (remainingAmount === 0) {
        paymentStatus = "Paid";
      } else if (po.dueDate && po.dueDate < today) {
        paymentStatus = "Overdue";
      }

      return {
        ...po,
        amount,
        amountPaid,
        remainingAmount,
        paymentStatus,
      };
    });

    const updatedContractor = await Contractor.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        contactPerson: contactPerson || "",
        email: email || "",
        phone: phone || "",
        purchaseOrders: orders,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedContractor) {
      return res.status(404).json({
        success: false,
        message: "Contractor not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Contractor updated successfully",
      data: updatedContractor,
    });
 } catch (error) {
    console.error("Error updating contractor:", error.message);

    res.status(400).json({
      success: false,
      message: error.message || "Failed to update contractor",
    });
  }
});
// Delete a contractor
app.delete(
  "/api/contractors/:id",
  authenticateToken,
  requireRole("Admin"),
  async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contractor ID",
      });
    }

    const deletedContractor = await Contractor.findByIdAndDelete(id);

    if (!deletedContractor) {
      return res.status(404).json({
        success: false,
        message: "Contractor not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Contractor deleted successfully",
      data: deletedContractor,
    });
 } catch (error) {
    console.error("Error deleting contractor:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to delete contractor",
    });
  }
  }
);
// Update only one purchase order
app.put(
  "/api/contractors/:contractorId/purchase-orders/:poId",
  authenticateToken,
  requireRole("Admin"),
  async (req, res) => {
    try {
      const { contractorId, poId } = req.params;
      const updates = req.body;

      if (
        !mongoose.isValidObjectId(contractorId) ||
        !mongoose.isValidObjectId(poId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid contractor or purchase order ID",
        });
      }

      const contractor = await Contractor.findById(contractorId);

      if (!contractor) {
        return res.status(404).json({
          success: false,
          message: "Contractor not found",
        });
      }

      const po = contractor.purchaseOrders.id(poId);

      if (!po) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      const allowedFields = [
        "slNo",
        "nameOfWork",
        "poNumber",
        "poDate",
        "validity",
        "startDate",
        "expiryDate",
        "dueDate",
        "amount",
        "amountPaid",
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          po.set(field, updates[field]);
        }
      }

      const amount = Number(po.amount);
      const amountPaid = Number(po.amountPaid || 0);

      if (
        !po.poNumber ||
        !Number.isFinite(amount) ||
        amount < 0 ||
        !Number.isFinite(amountPaid) ||
        amountPaid < 0 ||
        amountPaid > amount
      ) {
        return res.status(400).json({
          success: false,
          message: "Check PO number, amount and amount paid",
        });
      }

      po.amount = amount;
      po.amountPaid = amountPaid;
      po.remainingAmount = Math.max(0, amount - amountPaid);

      const today = new Date().toISOString().slice(0, 10);

      if (po.remainingAmount === 0) {
        po.paymentStatus = "Paid";
      } else if (po.dueDate && po.dueDate < today) {
        po.paymentStatus = "Overdue";
      } else {
        po.paymentStatus = "Pending";
      }

      await contractor.save();

      res.status(200).json({
        success: true,
        message: "Purchase order updated successfully",
        data: contractor,
      });
    } catch (error) {
      console.error("PO update failed:", error.message);

      res.status(500).json({
        success: false,
        message: "Failed to update purchase order",
      });
    }
  }
);
// Delete only one purchase order, keeping the contractor and other POs
app.delete(
  '/api/contractors/:contractorId/purchase-orders/:poId',
  authenticateToken,
  requireRole("Admin"),
  async (req, res) => {
    try {
      const { contractorId, poId } = req.params;

      // Validate IDs
      if (
        !mongoose.Types.ObjectId.isValid(contractorId) ||
        !mongoose.Types.ObjectId.isValid(poId)
      ) {
        return res.status(400).json({
          message: 'Invalid contractor ID or purchase order ID.',
        });
      }

      // Find the contractor
      const contractor = await Contractor.findById(contractorId);

      if (!contractor) {
        return res.status(404).json({
          message: 'Contractor not found.',
        });
      }

      // Find the specific purchase order
      const poExists = contractor.purchaseOrders.some(
        (po) => po._id.toString() === poId
      );

      if (!poExists) {
        return res.status(404).json({
          message: 'Purchase order not found.',
        });
      }

      // Remove only the selected purchase order
      contractor.purchaseOrders.pull({ _id: poId });

      await contractor.save();

      return res.status(200).json({
  success: true,
  message: 'Purchase order deleted successfully.',
  data: contractor,
});
    } catch (error) {
      console.error('Delete purchase order error:', error);

      return res.status(500).json({
        message: 'Failed to delete purchase order.',
      });
    }
  }
);
// Import multiple contractors from Excel
app.post(
  "/api/contractors/bulk",
  authenticateToken,
  requireRole("Admin"),
  async (req, res) => {
  try {
    const { contractors } = req.body;

    if (!Array.isArray(contractors) || contractors.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No contractor records provided",
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    const records = contractors.map((contractor) => {
      const purchaseOrders = (contractor.purchaseOrders || []).map((po) => {
        const amount = Number(po.amount || 0);
        const amountPaid = Number(po.amountPaid || 0);
        const remainingAmount = Math.max(0, amount - amountPaid);

        let paymentStatus = "Pending";

        if (remainingAmount === 0) {
          paymentStatus = "Paid";
        } else if (po.dueDate && po.dueDate < today) {
          paymentStatus = "Overdue";
        }

        return {
          ...po,
          amount,
          amountPaid,
          remainingAmount,
          paymentStatus,
        };
      });

      return {
        name: String(contractor.name || "").trim(),
        contactPerson: contractor.contactPerson || "",
        email: contractor.email || "",
        phone: String(contractor.phone || ""),
        purchaseOrders,
      };
    });

    if (records.some((record) => !record.name)) {
      return res.status(400).json({
        success: false,
        message: "Every contractor must have a name",
      });
    }

    const savedContractors = await Contractor.insertMany(records);

    res.status(201).json({
      success: true,
      message: `${savedContractors.length} contractor(s) imported successfully`,
      data: savedContractors,
    });
 } catch (error) {
    console.error("Bulk import failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to import contractors",
    });
  }
  }
);

// Get email reminder history (Admin only)
app.get(
  "/api/email-history",
  authenticateToken,
 
  async (req, res) => {
    try {
      const emailLogs = await EmailLog.find()
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();

      res.status(200).json({
        success: true,
        count: emailLogs.length,
        data: emailLogs,
      });
    } catch (error) {
      console.error("Error fetching email history:", error.message);

      res.status(500).json({
        success: false,
        message: "Failed to fetch email history",
      });
    }
  }
);
// Connect to MongoDB before starting the server
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from the .env file");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB Atlas connected successfully!");

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`ContractCare API listening on 0.0.0.0:${PORT}`);
    });
    server.on("error", (error) => {
      console.error("HTTP server failed to start:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer().then(() => {
    startReminderScheduler();
});