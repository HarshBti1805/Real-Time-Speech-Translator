// api/auth/send-otp/route.ts
import { generateOTP, generateTempToken, storeOTPData } from "@/utils/otp";
import { sendOTPEmail, initializeEmailService } from "@/utils/email";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    // Validate input
    if (!name || !email || !password) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Missing required fields: name, email, and password are required" 
        }),
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Password must be at least 6 characters" 
        }),
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Invalid email format" 
        }),
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = name.trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "User already exists with this email" 
        }),
        { status: 400 }
      );
    }

    // Initialize email service
    await initializeEmailService();

    // Generate OTP and temp token
    const otp = generateOTP();
    const tempToken = generateTempToken();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    console.log(`🔐 Generating OTP for ${normalizedEmail}: ${otp}`);

    // Store OTP data (without password for security)
    storeOTPData(tempToken, {
      otp,
      email: normalizedEmail,
      name: normalizedName,
      expiresAt,
    });

    console.log(`💾 OTP stored with temp token: ${tempToken}`);

    // Send OTP email with enhanced error handling
    const emailResult = await sendOTPEmail(normalizedEmail, otp, normalizedName);

    if (!emailResult.success) {
      console.error(`❌ Failed to send OTP to ${normalizedEmail}:`, emailResult.error);
      
      // Clean up stored OTP data since email failed
      // Note: We need to import deleteOTPData function
      // For now, we'll handle this in the error response
      
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Failed to send OTP email. Please try again or contact support.",
          error: emailResult.error,
          transporter: emailResult.transporter
        }),
        { status: 500 }
      );
    }

    console.log(`✅ OTP sent successfully to ${normalizedEmail} via ${emailResult.transporter}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully",
        tempToken,
        email: normalizedEmail,
        transporter: emailResult.transporter,
        expiresAt: new Date(expiresAt).toISOString(),
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Send OTP error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    
    return new Response(
      JSON.stringify({ 
        success: false,
        message: "Internal server error",
        error: errorMessage
      }), 
      { status: 500 }
    );
  }
}
