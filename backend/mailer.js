// mailer.js - sends emails via Resend's REST API when RESEND_API_KEY is set.
// Without a key (local dev), it logs the email to the console so flows can be
// tested end-to-end without real email infrastructure.

const https = require("https");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.MAIL_FROM || "Yojana Saarthi <onboarding@resend.dev>";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

function buildArticle(title, html) {
  return {
    subject: title,
    text: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    html,
  };
}

function sendArticle(toEmail, title, html) {
  const article = buildArticle(title, html);
  if (!RESEND_API_KEY) {
    // Dev mode: print the link so the flow works without an email provider.
    const devHint = html.match(/href="([^"]+)"/);
    console.log(
      `[DEV] Email to ${toEmail} — subject: "${article.subject}"`
      + (devHint ? `\n[DEV] Open this link: ${devHint[1]}` : "")
    );
    return Promise.resolve({ ok: true, dev: true });
  }

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      from: FROM_EMAIL,
      to: [toEmail],
      subject: article.subject,
      html: article.html,
      text: article.text,
    });

    const req = https.request(
      {
        hostname: "api.resend.com",
        path: "/emails",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve({ ok: true });
          else reject(new Error(`Resend error ${res.statusCode}: ${body}`));
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function sendPasswordReset(toEmail, token) {
  const link = `${APP_URL}/#reset?token=${token}`;
  return sendArticle(
    toEmail,
    "Yojana Saarthi — Reset your password",
    `<h2>Password reset</h2><p>Click the link below to set a new password. This link is valid for 24 hours.</p>
     <p><a href="${link}">Reset your password</a></p>
     <p>If you didn't ask for this, you can safely ignore this email.</p>`
  );
}

function sendVerifyEmail(toEmail, token) {
  const link = `${APP_URL}/#verify?token=${token}`;
  return sendArticle(
    toEmail,
    "Yojana Saarthi — Verify your email",
    `<h2>Welcome to Yojana Saarthi</h2><p>Confirm your email address to finish signing up.</p>
     <p><a href="${link}">Verify my email</a></p>
     <p>This link is valid for 24 hours.</p>`
  );
}

module.exports = { sendPasswordReset, sendVerifyEmail };