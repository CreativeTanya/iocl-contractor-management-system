const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing from the Render environment.");
  }

  if (!from) {
    throw new Error("EMAIL_FROM is missing from the Render environment.");
  }

  if (!to) {
    throw new Error("Recipient email address is required.");
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      ...(html ? { html } : {}),
    }),
    signal: AbortSignal.timeout(15000),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const providerMessage =
      result.message || result.error || `Resend returned HTTP ${response.status}`;
    console.error("Resend email API error:", providerMessage);
    throw new Error(`Email provider rejected the request: ${providerMessage}`);
  }

  return result;
}
