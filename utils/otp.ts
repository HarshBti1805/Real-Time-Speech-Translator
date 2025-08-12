import crypto from "crypto";

interface OTPData {
  otp: string;
  email: string;
  name: string;
  expiresAt: number;
}

// In-memory store for OTP data (use Redis in production)
const otpStore = new Map<string, OTPData>();

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateTempToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const storeOTPData = (tempToken: string, data: OTPData): void => {
  otpStore.set(tempToken, data);
};

export const getOTPData = (tempToken: string): OTPData | undefined => {
  return otpStore.get(tempToken);
};

export const deleteOTPData = (tempToken: string): void => {
  otpStore.delete(tempToken);
};

export const isOTPExpired = (expiresAt: number): boolean => {
  return Date.now() > expiresAt;
};
