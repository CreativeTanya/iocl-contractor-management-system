import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

export async function sendEmail({ to, subject, text, html }) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        throw new Error("Gmail configuration is missing in .env");
    }

    if (!to) {
        throw new Error("Recipient email address is required");
    }

    const mailOptions = {
        from: `"IOCL Contractor Management System" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        ...(html ? { html } : {})
    };

    const result = await transporter.sendMail(mailOptions);

    return result;
}