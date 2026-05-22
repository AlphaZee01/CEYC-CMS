import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "noreply@celcm.org";
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const APP_URL = process.env.APP_URL || "http://localhost:8080";

export function isEmailConfigured() {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

function createTransport() {
  if (!isEmailConfigured()) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendEmail({ to, subject, html, text }) {
  const transport = createTransport();
  if (!transport) {
    return { sent: false, reason: "SMTP not configured" };
  }
  try {
    await transport.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text: text || html?.replace(/<[^>]+>/g, ""),
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error("Email send failed:", err.message);
    return { sent: false, reason: err.message };
  }
}

export async function sendPasswordResetEmail(to, token) {
  const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const churchName = process.env.CHURCH_NAME || "Christ Embassy LCM";
  return sendEmail({
    to,
    subject: `${churchName} — Password reset`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#5B21B6;">Password reset</h2>
        <p>You requested a password reset for your church management account.</p>
        <p><a href="${resetUrl}" style="display:inline-block;background:#5B21B6;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;">Reset password</a></p>
        <p style="font-size:12px;color:#666;">Or copy this link:<br>${resetUrl}</p>
        <p style="font-size:12px;color:#666;">This link expires in 1 hour. If you did not request this, ignore this email.</p>
      </div>
    `,
    text: `Reset your password: ${resetUrl}\n\nExpires in 1 hour.`,
  });
}

export async function sendNotificationEmail(to, title, body) {
  if (process.env.SMTP_NOTIFY !== "true") return { sent: false, reason: "SMTP_NOTIFY disabled" };
  return sendEmail({
    to,
    subject: title,
    html: `<p>${body}</p><p style="font-size:12px;color:#666;">Christ Embassy Church Management</p>`,
    text: body,
  });
}
