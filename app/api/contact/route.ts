import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { name, phone, email, message } = await request.json();

    console.log("Contact form submission received:", { name, phone, email, message });

    // Configure SMTP transport using environment variables or a default setup.
    // If SMTP credentials are not configured, we'll log the email and return success.
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: `"${name}" <${smtpUser}>`,
        replyTo: email,
        to: ["admin@techtomorrow.in", "mohitraj8503@gmail.com"],
        subject: `New Contact Submission from Developer Contact Page - ${name}`,
        text: `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\n\nMessage:\n${message}`,
        html: `
          <h3>New Contact Submission</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log("Email sent successfully.");
    } else {
      console.log("SMTP not configured. Email logged to console instead of sending.");
    }

    return NextResponse.json({ success: true, message: "Submission processed successfully" });
  } catch (error) {
    console.error("Error in contact route:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
