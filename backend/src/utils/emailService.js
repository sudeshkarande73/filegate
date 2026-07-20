const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text, html) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Your vaultshare gmail address
        pass: process.env.EMAIL_PASS, // The 16-character App Password
      },
    });

    const mailOptions = {
      from: `"FileGate Security" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html, // 🚀 NEW: Added HTML support
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}`);
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw new Error("Could not send email");
  }
};

module.exports = sendEmail;