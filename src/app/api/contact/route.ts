// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

// HTML escape to prevent injection attacks
function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request.headers as Record<string, string | string[]>);
    if (!rateLimit(clientIp, 5, 3600000)) {
      return NextResponse.json(
        { error: "Too many contact form submissions. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();
    let { name, email, phone, message } = body;

    // Input validation
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    if (!name || typeof name !== "string" || name.length > 100) {
      return NextResponse.json(
        { error: "Valid name is required (max 100 characters)" },
        { status: 400 },
      );
    }

    if (!email || !isValidEmail(email) || email.length > 254) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 },
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: "Message must be less than 5000 characters" },
        { status: 400 },
      );
    }

    if (phone && (typeof phone !== "string" || phone.length > 20)) {
      return NextResponse.json(
        { error: "Phone number is invalid" },
        { status: 400 },
      );
    }

    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 },
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Escape all user inputs to prevent HTML injection
    const escapedName = escapeHtml(name);
    const escapedEmail = escapeHtml(email);
    const escapedPhone = phone ? escapeHtml(phone) : "Not provided";
    const escapedMessage = escapeHtml(message).replace(/\n/g, "<br>");

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: "jacob@jthomanalytics.com",
      subject: `New Contact Form Submission from ${escapedName}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${escapedName}</p>
        <p><strong>Email:</strong> ${escapedEmail}</p>
        <p><strong>Phone:</strong> ${escapedPhone}</p>
        <p><strong>Message:</strong></p>
        <p>${escapedMessage}</p>
      `,
      replyTo: email,
    });

    return NextResponse.json(
      { success: true, message: "Thank you! Your message has been sent successfully." },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send email. Please try again or email jacob@jthomanalytics.com directly." },
      { status: 500 },
    );
  }
}
