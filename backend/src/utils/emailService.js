const SibApiV3Sdk = require("sib-api-v3-sdk");

const client = SibApiV3Sdk.ApiClient.instance;

client.authentications["api-key"].apiKey =
  process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const sendEmail = async (to, subject, text, html) => {
  try {
    const result = await apiInstance.sendTransacEmail({
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

    console.log("Email sent");
    console.log(result);
  } catch (err) {
    console.error(err);
    throw err;
  }
};

module.exports = sendEmail;