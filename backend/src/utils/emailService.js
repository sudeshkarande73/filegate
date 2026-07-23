const { BrevoClient } = require("@getbrevo/brevo");

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

const sendEmail = async (to, subject, text, html) => {
  try {
    const result = await brevo.transactionalEmails.sendTransacEmail({
      sender: {
        name: "FileGate Security",
        email: "vaulteshare.noreply@gmail.com",
      },

      to: [
        {
          email: to,
        },
      ],

      subject,
      textContent: text,
      htmlContent: html,
    });

    console.log("Email sent successfully");
    console.log(result);

    return result;
  } catch (err) {
    console.error("Brevo Error:");
    console.error(err);
    throw err;
  }
};

module.exports = sendEmail;