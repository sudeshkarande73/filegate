const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, text, html) => {
  try {
    console.log("Sending email using Resend...");

    const response = await resend.emails.send({
      from: "FileGate <onboarding@resend.dev>",
      to,
      subject,
      text,
      html,
    });

    console.log("Email sent successfully");
    console.log(response);

    return response;

  } catch (error) {
    console.error("Resend Error:", error);
    throw error;
  }
};

module.exports = sendEmail;