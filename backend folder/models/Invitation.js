import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["Admin", "User"],
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

invitationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

const Invitation = mongoose.model("Invitation", invitationSchema);

export default Invitation;