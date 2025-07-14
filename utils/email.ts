import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  // Configure your email service here
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOTPEmail = async (
  email: string,
  otp: string,
  name: string
): Promise<void> => {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: email,
    subject: "Verify Your Account - OTP Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Verify Your Account</h2>
        <p>Hi ${name},</p>
        <p>Thank you for signing up! Please use the following OTP code to verify your account:</p>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #4f46e5; font-size: 32px; margin: 0; letter-spacing: 8px;">${otp}</h1>
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>Your App Team</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
