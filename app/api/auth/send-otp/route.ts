// api/auth/send-otp/route.ts
import { generateOTP, generateTempToken, storeOTPData } from "@/utils/otp";
import { sendOTPEmail } from "@/utils/email";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    // Validate input
    if (!name || !email || !password) {
      return new Response(
        JSON.stringify({ message: "Missing required fields" }),
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ message: "Password must be at least 6 characters" }),
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return new Response(
        JSON.stringify({ message: "User already exists with this email" }),
        { status: 400 }
      );
    }

    // Generate OTP and temp token
    const otp = generateOTP();
    const tempToken = generateTempToken();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP data
    storeOTPData(tempToken, {
      otp,
      email: email.toLowerCase(),
      name: name.trim(),
      password,
      expiresAt,
    });

    // Send OTP email
    await sendOTPEmail(email, otp, name);

    return new Response(
      JSON.stringify({
        message: "OTP sent successfully",
        tempToken,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Send OTP error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
