const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  if (process.env.GMAIL_USER) return;
  const envPath = path.resolve(__dirname, "../../../.env");
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
      if (!match) return;
      const [, key, rawValue] = match;
      process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, "");
    });
}

loadEnv();

function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("GMAIL_USER or GMAIL_APP_PASSWORD is not set in .env");

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

async function sendResetEmail(toEmail, resetToken) {
  const appUrl = process.env.APP_BASE_URL || "http://localhost:5173";
  const fromUser = process.env.GMAIL_USER;
  const resetUrl = `${appUrl}/#/reset-password?token=${resetToken}`;

  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"Traffic Sign AI" <${fromUser}>`,
    to: toEmail,
    subject: "Reset your password — Traffic Sign AI",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;">
        <h2 style="color:#1e40af;margin:0 0 8px">Traffic Sign AI</h2>
        <h3 style="color:#0f172a;margin:0 0 16px">Password Reset Request</h3>
        <p style="color:#475569;line-height:1.6;margin:0 0 24px">
          We received a request to reset the password for your account. Click the button below to choose a new password.
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:15px;">
          Reset Password
        </a>
        <p style="color:#94a3b8;font-size:13px;margin:24px 0 0;line-height:1.5;">
          This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px"/>
        <p style="color:#cbd5e1;font-size:12px;margin:0;">Traffic Sign AI &mdash; Automated traffic sign detection platform</p>
      </div>
    `,
  });
}

module.exports = { sendResetEmail };
