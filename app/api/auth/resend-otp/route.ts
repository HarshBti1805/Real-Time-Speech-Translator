import { getOTPData, storeOTPData, generateOTP } from "@/utils/otp";
import { sendOTPEmail } from "@/utils/email";

export async function POST(req: Request) {
  try {
    const { tempToken } = await req.json();

    if (!tempToken) {
      return new Response(JSON.stringify({ message: "Missing temp token" }), {
        status: 400,
      });
    }

    const otpData = getOTPData(tempToken);
    if (!otpData) {
      return new Response(JSON.stringify({ message: "Invalid token" }), {
        status: 400,
      });
    }

    const newOTP = generateOTP();
    const newExpiresAt = Date.now() + 5 * 60 * 1000;

    storeOTPData(tempToken, {
      ...otpData,
      otp: newOTP,
      expiresAt: newExpiresAt,
    });

    await sendOTPEmail(otpData.email, newOTP, otpData.name);

    return new Response(
      JSON.stringify({ message: "OTP resent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Resend OTP error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
