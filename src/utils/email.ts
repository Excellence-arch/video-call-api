import nodemailer from "nodemailer"
import crypto from "crypto"
import dotenv from "dotenv";
dotenv.config()

const transporter = nodemailer.createTransport({
  service: "gmail",
  // host: process.env.SMTP_HOST,
  port: Number.parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString("hex")
}

export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`

  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: email,
    subject: "Verify Your Email - Video Call App",
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">Verify Your Email Address</h2>
        <p>Thank you for registering with our Video Call App. Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #007bff;">${verificationUrl}</p>
        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
      </div>
    `,
  }

  await transporter.sendMail(mailOptions)
}
