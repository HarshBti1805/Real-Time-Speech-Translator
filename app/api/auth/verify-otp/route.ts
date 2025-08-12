import { getOTPData, deleteOTPData, isOTPExpired } from "@/utils/otp";
import { hashPassword } from "@/utils/password";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tempToken, otp, password } = body;

    if (!tempToken || !otp || !password) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Missing required fields: tempToken, otp, and password are required" 
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

    const otpData = getOTPData(tempToken);
    if (!otpData) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Invalid or expired token" 
        }),
        { status: 400 }
      );
    }

    if (isOTPExpired(otpData.expiresAt)) {
      deleteOTPData(tempToken);
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "OTP has expired. Please request a new one." 
        }), 
        { status: 400 }
      );
    }

    if (otpData.otp !== otp) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Invalid OTP code. Please check and try again." 
        }), 
        { status: 400 }
      );
    }

    console.log(`🔐 Verifying OTP for ${otpData.email}: ${otp}`);

    // Hash the password from request body (not stored in OTP data)
    const hashedPassword = await hashPassword(password);

    // Create the user
    const user = await prisma.user.create({
      data: {
        name: otpData.name,
        email: otpData.email,
        hashedPassword,
      },
    });

    // Clean up OTP data after successful verification
    deleteOTPData(tempToken);

    console.log(`✅ User created successfully: ${otpData.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "User created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      }),
      { status: 201 }
    );

  } catch (error) {
    console.error("❌ Verify OTP error:", error);
    
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
