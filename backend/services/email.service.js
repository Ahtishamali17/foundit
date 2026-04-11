// services/email.service.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email templates
const templates = {
  welcome: ({ name }) => ({
    subject: 'Welcome to FoundIt! 🎉',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0c0c1e;color:#f0f0ff;padding:40px;border-radius:16px;">
        <h1 style="color:#818cf8;">Welcome, ${name}! 🎉</h1>
        <p>You've joined FoundIt — the smartest campus lost & found platform.</p>
        <p>You can now post lost/found items, get AI-powered matches, and chat securely with other students.</p>
        <a href="${process.env.FRONTEND_URL}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Go to FoundIt →</a>
        <p style="margin-top:30px;color:#6b7280;font-size:13px;">If you didn't sign up for FoundIt, you can safely ignore this email.</p>
      </div>`,
  }),

  aiMatch: ({ userName, itemTitle, matchTitle, matchLocation, matchScore, itemUrl }) => ({
    subject: `🤖 Potential match found for "${itemTitle}"`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0c0c1e;color:#f0f0ff;padding:40px;border-radius:16px;">
        <h2 style="color:#22d3ee;">AI Match Detected! 🤖</h2>
        <p>Hi ${userName},</p>
        <p>Our AI found a <strong>${matchScore}% match</strong> for your item <strong>"${itemTitle}"</strong>.</p>
        <div style="background:#1e1e42;border-left:4px solid #6366f1;padding:16px;border-radius:8px;margin:20px 0;">
          <strong style="color:#a5b4fc;">Matched Item:</strong> ${matchTitle}<br/>
          <strong style="color:#a5b4fc;">Location:</strong> ${matchLocation}
        </div>
        <a href="${itemUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">View Match →</a>
      </div>`,
  }),

  itemResolved: ({ name, itemTitle }) => ({
    subject: `✅ "${itemTitle}" has been resolved`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0c0c1e;color:#f0f0ff;padding:40px;border-radius:16px;">
        <h2 style="color:#10b981;">Item Resolved! ✅</h2>
        <p>Hi ${name}, your item <strong>"${itemTitle}"</strong> has been marked as resolved.</p>
        <p>Thank you for using FoundIt. You're helping build a more connected campus!</p>
      </div>`,
  }),

  resetPassword: ({ name, resetUrl }) => ({
    subject: 'FoundIt — Password Reset',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0c0c1e;color:#f0f0ff;padding:40px;border-radius:16px;">
        <h2 style="color:#f59e0b;">Reset Your Password</h2>
        <p>Hi ${name}, click the button below to reset your password. This link expires in 30 minutes.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password →</a>
        <p style="margin-top:20px;color:#6b7280;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>`,
  }),
};

/**
 * Send an email using a named template
 * @param {Object} options - { to, subject?, template, data }
 */
const sendEmail = async ({ to, subject, template, data }) => {
  const tmpl = templates[template]?.(data) || { html: '', subject: subject || 'FoundIt' };

  await transporter.sendMail({
    from: `"FoundIt" <${process.env.FROM_EMAIL}>`,
    to,
    subject: tmpl.subject || subject,
    html: tmpl.html,
  });

  console.log(`📧 Email sent: ${tmpl.subject} → ${to}`);
};

module.exports = { sendEmail };
