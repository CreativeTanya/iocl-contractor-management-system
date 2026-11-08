import cron from "node-cron";
import mongoose from "mongoose";
import Contractor from "./models/Contractor.js";
import EmailLog from "./models/EmailLog.js";
import { sendEmail } from "./emailService.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

 function createEmailTemplate({
    title,
    recipientName = "Contractor",
    message,
    details,
    highlightLabel,
    highlightValue,
    highlightColor = "#b45309"
}) {
    const detailRows = details.map(({ label, value }) => `
        <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#64748b;font-size:13px;">
                ${escapeHtml(label)}
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">
                ${escapeHtml(value)}
            </td>
        </tr>
    `).join("");

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(title)}</title>
    </head>
    <body style="margin:0;padding:24px 10px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#334155;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">

            <div style="padding:22px 26px;background:#123b63;color:#ffffff;">
                <p style="margin:0 0 6px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#cbd5e1;">
                    Indian Oil Corporation Limited
                </p>
                <h1 style="margin:0;font-size:21px;line-height:1.4;">
                    Contractor Management System
                </h1>
            </div>

            <div style="padding:26px;">
                <h2 style="margin:0 0 16px;font-size:20px;color:#123b63;">
                    ${escapeHtml(title)}
                </h2>

                <p style="margin:0 0 18px;font-size:14px;line-height:1.8;">
                    Dear ${escapeHtml(recipientName)},
                </p>

                <p style="margin:0 0 20px;font-size:14px;line-height:1.8;">
                    ${escapeHtml(message)}
                </p>

                <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">
                    <tbody>
                        ${detailRows}
                    </tbody>
                </table>

                <div style="margin:20px 0;padding:16px;border-radius:6px;background:#fff7ed;border-left:4px solid ${highlightColor};">
                    <p style="margin:0 0 6px;font-size:12px;color:#64748b;">
                        ${escapeHtml(highlightLabel)}
                    </p>
                    <p style="margin:0;font-size:20px;font-weight:700;color:${highlightColor};">
                        ${escapeHtml(highlightValue)}
                    </p>
                </div>

                <p style="margin:0 0 18px;font-size:14px;line-height:1.8;">
                    Please review the details above and coordinate with the concerned IOCL representative for any required action.
                </p>

                <p style="margin:0;font-size:14px;line-height:1.8;">
                    Regards,<br>
                    <strong>Contractor Management System</strong><br>
                    Indian Oil Corporation Limited (IOCL)
                </p>
            </div>

            <div style="padding:16px 26px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:11px;line-height:1.7;color:#64748b;">
                    This is an automatically generated notification. Please do not reply directly to this email.
                </p>
            </div>

        </div>
    </body>
    </html>
    `;
}
function getDaysDifference(dateString) {
    if (!dateString) {
        return null;
    }

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Math.round((date.getTime() - today.getTime()) / DAY_IN_MS);
}

async function sendReminder({
    contractor,
    po,
    reminderType,
    reminderKey,
    subject,
    text,
    html
}) {
    if (!contractor.email) {
        console.log(
            `Skipping reminder for ${contractor.name}: no email address.`
        );
        return;
    }

   let log;

try {
    log = await EmailLog.findOne({ reminderKey });

    if (log && log.status === "Sent") {
        return;
    }

    if (log) {
        log.status = "Failed";
        log.message = "Email retry in progress.";
        await log.save();
    } else {
        log = await EmailLog.create({
            reminderKey,
            contractorId: contractor._id,
            contractorName: contractor.name,
            poNumber: po.poNumber,
            recipientEmail: contractor.email,
            reminderType,
            status: "Failed",
            message: "Email sending is in progress."
        });
    }
} catch (error) {
    console.error("Could not prepare email log:", error.message);
    return;
}

    try {
        const result = await sendEmail({
            to: contractor.email,
            subject,
            text,
            html
        });

        log.status = "Sent";
        log.message = `Accepted by mail server. Message ID: ${result.messageId}`;
        log.sentAt = new Date();

        await log.save();

        console.log(
            `Reminder sent: ${reminderType} for PO ${po.poNumber}`
        );
    } catch (error) {
        log.status = "Failed";
        log.message = error.message;
        await log.save();

        console.error(
            `Failed reminder for PO ${po.poNumber}:`,
            error.message
        );
    }
}

async function checkContractExpiry() {
    const contractors = await Contractor.find();

    for (const contractor of contractors) {
        for (const po of contractor.purchaseOrders) {
            const daysLeft = getDaysDifference(po.expiryDate);

            if (![30, 7, 1].includes(daysLeft)) {
                continue;
            }

            const reminderKey =
                `expiry:${po._id}:${po.expiryDate}:${daysLeft}`;

           await sendReminder({
                contractor,
                po,
                reminderType: "Contract Expiry",
                reminderKey,
                subject: `Contract Expiry Reminder - PO ${po.poNumber}`,
                text:
                    `Dear ${contractor.contactPerson || contractor.name},\n\n` +
                    `This is an automated reminder from the IOCL Contractor Management System regarding the upcoming expiry of your contract.\n\n` +
                    `Contractor Name: ${contractor.name}\n` +
                    `Purchase Order Number: ${po.poNumber}\n` +
                    `Contract Expiry Date: ${po.expiryDate}\n` +
                    `Time Remaining: ${daysLeft} day(s)\n\n` +
                    `Please review the contract validity and coordinate with the concerned IOCL representative regarding any required extension or renewal, if applicable.\n\n` +
                    `Regards,\nContractor Management System\nIndian Oil Corporation Limited (IOCL)`,
                html: createEmailTemplate({
                    title: "Contract Expiry Reminder",
                    recipientName: contractor.contactPerson || contractor.name,
                    message:
                        `This is an automated reminder regarding the upcoming expiry of your contract. Please review the details below and take any necessary action before the expiry date.`,
                    details: [
                        {
                            label: "Contractor Name",
                            value: contractor.name
                        },
                        {
                            label: "Purchase Order Number",
                            value: po.poNumber
                        },
                        {
                            label: "Contract Expiry Date",
                            value: po.expiryDate
                        }
                    ],
                    highlightLabel: "TIME REMAINING",
                    highlightValue: `${daysLeft} day(s)`,
                    highlightColor: "#b45309"
                })
            });
        }
    }
}

async function checkOverduePayments() {
    const contractors = await Contractor.find();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const contractor of contractors) {
        for (const po of contractor.purchaseOrders) {
            const remainingAmount = Number(po.remainingAmount || 0);

            if (
                !po.dueDate ||
                !Number.isFinite(remainingAmount) ||
                remainingAmount <= 0
            ) {
                continue;
            }

            const dueDate = new Date(`${po.dueDate}T00:00:00`);

            if (
                Number.isNaN(dueDate.getTime()) ||
                dueDate >= today
            ) {
                continue;
            }

            const daysOverdue = Math.floor(
                (today.getTime() - dueDate.getTime()) / DAY_IN_MS
            );

            if (daysOverdue !== 1 && daysOverdue % 7 !== 0) {
    continue;
}

            const reminderKey =
                `payment:${po._id}:${po.dueDate}:${daysOverdue}`;

           await sendReminder({
                contractor,
                po,
                reminderType: "Overdue Payment",
                reminderKey,
                subject: `Action Required: Overdue Payment Reminder - PO ${po.poNumber}`,
                text:
                    `Dear ${contractor.contactPerson || contractor.name},\n\n` +
                    `This is a payment reminder from the IOCL Contractor Management System.\n\n` +
                    `Contractor Name: ${contractor.name}\n` +
                    `Purchase Order Number: ${po.poNumber}\n` +
                    `Payment Due Date: ${po.dueDate}\n` +
                    `Days Overdue: ${daysOverdue}\n` +
                    `Outstanding Amount: ${remainingAmount}\n\n` +
                    `Please arrange payment of the outstanding amount and coordinate with the concerned IOCL representative.\n\n` +
                    `Regards,\n` +
                    `Contractor Management System\n` +
                    `Indian Oil Corporation Limited (IOCL)`,
                html: createEmailTemplate({
                    title: "Overdue Payment Reminder",
                    recipientName: contractor.contactPerson || contractor.name,
                    message:
                        "Our records indicate that payment for the Purchase Order below remains outstanding after its due date. Please review the details and arrange payment.",
                    details: [
                        {
                            label: "Contractor Name",
                            value: contractor.name
                        },
                        {
                            label: "Purchase Order Number",
                            value: po.poNumber
                        },
                        {
                            label: "Payment Due Date",
                            value: po.dueDate
                        },
                        {
                            label: "Outstanding Amount",
                            value: remainingAmount
                        }
                    ],
                    highlightLabel: "DAYS OVERDUE",
                    highlightValue: `${daysOverdue} day(s)`,
                    highlightColor: "#b91c1c"
                })
            });
        }
    }
}

export async function runReminderChecks() {
    if (mongoose.connection.readyState !== 1) {
        console.log("Reminder check skipped: database is disconnected.");
        return;
    }

    console.log("Checking automatic email reminders...");

    try {
        await checkContractExpiry();
        await checkOverduePayments();

        console.log("Automatic reminder check completed.");
    } catch (error) {
        console.error("Reminder check failed:", error.message);
    }
}

export function startReminderScheduler() {
    cron.schedule("* * * * *", runReminderChecks, {
        timezone: "Asia/Kolkata"
    });

    console.log("Reminder scheduler started: checks every 1 minute.");
}