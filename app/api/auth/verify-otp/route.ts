import { getOTPData, deleteOTPData, isOTPExpired } from "@/utils/otp";
import { hashPassword } from "@/utils/password";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tempToken, otp } = body;

    if (!tempToken || !otp) {
      return new Response(
        JSON.stringify({ message: "Missing required fields" }),
        { status: 400 }
      );
    }

    const otpData = getOTPData(tempToken);
    if (!otpData) {
      return new Response(
        JSON.stringify({ message: "Invalid or expired token" }),
        { status: 400 }
      );
    }

    if (isOTPExpired(otpData.expiresAt)) {
      deleteOTPData(tempToken);
      return new Response(JSON.stringify({ message: "OTP has expired" }), {
        status: 400,
      });
    }

    if (otpData.otp !== otp) {
      return new Response(JSON.stringify({ message: "Invalid OTP code" }), {
        status: 400,
      });
    }

    const hashedPassword = await hashPassword(otpData.password);

    const user = await prisma.user.create({
      data: {
        name: otpData.name,
        email: otpData.email,
        hashedPassword,
      },
    });

    deleteOTPData(tempToken);

    return new Response(
      JSON.stringify({
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
    console.error("Verify OTP error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
