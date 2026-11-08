import mongoose from "mongoose";

const purchaseOrderSchema = new mongoose.Schema(
  {
    slNo: {
      type: Number,
      default: null,
    },
    nameOfWork: {
      type: String,
      default: "",
      trim: true,
    },
    poNumber: {
      type: String,
      required: true,
      trim: true,
    },
    poDate: {
      type: String,
      default: "",
    },
    validity: {
      type: String,
      default: "",
    },
    startDate: {
      type: String,
      default: "",
    },
    expiryDate: {
      type: String,
      default: "",
    },
    dueDate: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending", "Overdue"],
      default: "Pending",
    },
  },
  { _id: true }
);

const contractorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactPerson: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    purchaseOrders: {
      type: [purchaseOrderSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const Contractor = mongoose.model("Contractor", contractorSchema);

export default Contractor;