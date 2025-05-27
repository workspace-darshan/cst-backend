require('dotenv').config();
const nodemailer = require("nodemailer");
const { getEmailTemplate } = require('./EmailTemplates');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  throw new Error("Missing EMAIL_USER or EMAIL_PASSWORD in environment variables");
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "mevadadarshan2002@gmail.com",
    pass: "wblbgdpfpjmqxssr",
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.log("SMTP connection error:", error);
  } else {
    console.log("Server is ready to take our messages");
  }
});

const mailService = async (templateName, data) => {
  try {
    const htmlContent = getEmailTemplate(templateName, data);

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"CTS Contact 🏠" <noreply@ctc-automation.com>',
      to: "mevadadarshan2002@gmail.com",
      subject: `✨ New Contact
Inquiry from ${data?.firstName ? data.firstName + ' ' + (data?.lastName || '') :
          'Unknown'} ${data?.organizationName ? `at ${data.organizationName}` : ''}`,
      priority: "high",
      html: htmlContent,
    });
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error("Error sending email:", err);
    throw err;
  }
};
module.exports = { mailService };