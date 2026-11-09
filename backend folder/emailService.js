import { randomUUID } from "node:crypto";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

let cachedAccessToken = null;
let accessTokenExpiresAt = 0;

function requiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is missing from the Render environment.`);
  }

  return value;
}

function encodeHeader(value) {
  const text = String(value ?? "").replace(/[\r\n]+/g, " ").trim();

  if (!text) return "";

  return /^[\x20-\x7E]*$/.test(text)
    ? text
    : `=?UTF-8?B?${Buffer.from(text, "utf8").toString("base64")}?=`;
}

function wrapBase64(value) {
  return Buffer.from(String(value ?? ""), "utf8")
    .toString("base64")
    .match(/.{1,76}/g)
    ?.join("\r\n") ?? "";
}

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < accessTokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  const body = new URLSearchParams({
    client_id: requiredEnv("GOOGLE_CLIENT_ID"),
    client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
    refresh_token: requiredEnv("GOOGLE_REFRESH_TOKEN"),
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15000),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.access_token) {
    const reason =
      result.error_description ||
      result.error ||
      `Google token endpoint returned HTTP ${response.status}`;

    cachedAccessToken = null;
    accessTokenExpiresAt = 0;
    throw new Error(`Unable to obtain Gmail access token: ${reason}`);
  }

  cachedAccessToken = result.access_token;
  accessTokenExpiresAt =
    Date.now() + Number(result.expires_in || 3600) * 1000;

  return cachedAccessToken;
}

function createRawMessage({ from, to, subject, text, html }) {
  const boundary = `contractcare_${randomUUID()}`;
  const parts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
  ];

  if (html) {
    parts.push(
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(text),
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(html),
      `--${boundary}--`
    );
  } else {
    parts.push(
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(text)
    );
  }

  return parts.join("\r\n");
}

export async function sendEmail({ to, subject, text, html }) {
  if (!to || typeof to !== "string") {
    throw new Error("Recipient email address is required.");
  }

  if (!subject || typeof subject !== "string") {
    throw new Error("Email subject is required.");
  }

  const recipient = to.replace(/[\r\n]+/g, "").trim();

  if (!recipient) {
    throw new Error("Recipient email address is required.");
  }

  const gmailUser = requiredEnv("GMAIL_USER");
  const configuredFrom = process.env.EMAIL_FROM?.trim() || "";
  const displayName =
    configuredFrom.match(/^"?([^"<]+)"?\s*</)?.[1]?.trim() ||
    (configuredFrom.includes("@") ? "ContractCare" : configuredFrom) ||
    "ContractCare";
  const from = `${encodeHeader(displayName)} <${gmailUser}>`;

  const rawMessage = createRawMessage({
    from,
    to: recipient,
    subject: subject.replace(/[\r\n]+/g, " ").trim(),
    text: text || "",
    html,
  });

  const raw = Buffer.from(rawMessage, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  const accessToken = await getAccessToken();
  const response = await fetch(GMAIL_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
    signal: AbortSignal.timeout(15000),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.id) {
    const providerMessage =
      result.error?.message ||
      `Gmail API returned HTTP ${response.status}`;

    console.error("Gmail API email error:", providerMessage);
    throw new Error(`Gmail could not send the email: ${providerMessage}`);
  }

  return {
    messageId: result.id,
    threadId: result.threadId,
  };
}
