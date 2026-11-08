import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema(
    {
        reminderKey: {
            type: String,
            required: true,
            unique: true
        },

        contractorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Contractor",
            default: null
        },

        contractorName: {
            type: String,
            required: true,
            trim: true
        },

        poNumber: {
            type: String,
            required: true,
            trim: true
        },

        recipientEmail: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },

        reminderType: {
            type: String,
            enum: ["Contract Expiry", "Overdue Payment"],
            required: true
        },

        status: {
            type: String,
            enum: ["Sent", "Failed"],
            required: true
        },

        message: {
            type: String,
            default: ""
        },

        sentAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

const EmailLog = mongoose.model("EmailLog", emailLogSchema);

export default EmailLog;