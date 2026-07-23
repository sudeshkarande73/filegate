 const dns = require("dns");
const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, text, html) => {
  try {
    console.log("====================================");
    console.log("Starting email service");

    console.log("EMAIL_USER:", process.env.EMAIL_USER);
    console.log("EMAIL_PASS exists:", !!process.env.EMAIL_PASS);

    console.log("Creating transporter...");

 
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    family: 4,   // Force IPv4
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

    console.log("Transporter created");

    console.log("Starting SMTP verify...");
    await transporter.verify();
    console.log("SMTP verify successful");

    const mailOptions = {
      from: `"FileGate Security" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    };

    console.log("Starting sendMail...");
    const info = await transporter.sendMail(mailOptions);

    console.log("Mail sent successfully");
    console.log(info);

    console.log("====================================");
  } catch (error) {
    console.error("========= EMAIL ERROR =========");
    console.error(error);
    console.error("Code:", error.code);
    console.error("Command:", error.command);
    console.error("Response:", error.response);
    console.error("===============================");

    throw error;
  }
};

module.exports = sendEmail;
