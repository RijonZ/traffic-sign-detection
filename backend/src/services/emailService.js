const https = require("https");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  if (process.env.RESEND_API_KEY) return;
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

function post(body) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set in .env");

  const payload = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.resend.com",
        path: "/emails",
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`Resend ${res.statusCode}: ${data}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function sendResetEmail(toEmail, resetToken) {
  const appUrl = process.env.APP_BASE_URL || "http://localhost:5173";
  const fromAddress = process.env.RESEND_FROM || "onboarding@resend.dev";
  const resetUrl = `${appUrl}/#/reset-password?token=${resetToken}`;

  await post({
    from: fromAddress,
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
