import nodemailer from "nodemailer";

// Multiple email service configurations for fallback
const emailConfigs = [
  {
    name: "Primary SMTP",
    config: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
  },
  {
    name: "Gmail SMTP",
    config: {
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    },
  },
  {
    name: "SendGrid",
    config: {
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: {
        user: "apikey",
        pass: process.env.SENDGRID_API_KEY,
      },
    },
  },
];

// Create transporters for each configuration
const transporters = emailConfigs
  .filter((config) => {
    // Filter out configs with missing credentials
    if (config.name === "Primary SMTP") {
      return (
        process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
      );
    } else if (config.name === "Gmail SMTP") {
      return process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD;
    } else if (config.name === "SendGrid") {
      return process.env.SENDGRID_API_KEY;
    }
    return false;
  })
  .map((config) => ({
    name: config.name,
    transporter: nodemailer.createTransport(config.config),
  }));

// Verify transporter configuration
const verifyTransporter = async (
  transporter: nodemailer.Transporter,
  name: string
): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log(`✅ ${name} transporter verified successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${name} transporter verification failed:`, error);
    return false;
  }
};

// Initialize and verify all transporters
export const initializeEmailService = async (): Promise<void> => {
  console.log("📧 Initializing email service...");

  for (const { transporter, name } of transporters) {
    await verifyTransporter(transporter, name);
  }

  if (transporters.length === 0) {
    console.error(
      "❌ No email transporters configured! Please check your environment variables."
    );
  } else {
    console.log(`✅ ${transporters.length} email transporter(s) initialized`);
  }
};

// Enhanced email sending with retry and fallback
export const sendOTPEmail = async (
  email: string,
  otp: string,
  name: string,
  retryCount: number = 0
): Promise<{ success: boolean; transporter: string; error?: string }> => {
  const maxRetries = 2;

  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Invalid email format: ${email}`);
    }

    // Prepare email content
    const mailOptions = {
      from:
        process.env.FROM_EMAIL ||
        process.env.SMTP_USER ||
        "noreply@yourapp.com",
      to: email,
      subject: "Verify Your Account - OTP Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; text-align: center;">Verify Your Account</h1>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin: 20px 0;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi <strong>${name}</strong>,</p>
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Thank you for signing up! Please use the following OTP code to verify your account:</p>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; text-align: center; margin: 25px 0; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
              <h1 style="color: white; font-size: 36px; margin: 0; letter-spacing: 10px; font-weight: bold;">${otp}</h1>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 15px;"><strong>⚠️ Important:</strong> This code will expire in 5 minutes.</p>
            <p style="font-size: 14px; color: #666; margin-bottom: 15px;">If you didn't request this verification, please ignore this email.</p>
          </div>
          
          <div style="text-align: center; padding: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">Best regards,<br>Your App Team</p>
          </div>
        </div>
      `,
      text: `
        Verify Your Account
        
        Hi ${name},
        
        Thank you for signing up! Please use the following OTP code to verify your account:
        
        ${otp}
        
        This code will expire in 5 minutes.
        
        If you didn't request this verification, please ignore this email.
        
        Best regards,
        Your App Team
      `,
    };

    // Try each transporter in order
    for (const { transporter, name: transporterName } of transporters) {
      try {
        console.log(
          `📧 Attempting to send OTP via ${transporterName} to ${email}`
        );

        await transporter.sendMail(mailOptions);

        console.log(
          `✅ OTP sent successfully via ${transporterName} to ${email}`
        );

        return {
          success: true,
          transporter: transporterName,
        };
      } catch (transporterError) {
        console.error(
          `❌ ${transporterName} failed for ${email}:`,
          transporterError
        );

        // If this is the last transporter, throw the error
        if (transporterName === transporters[transporters.length - 1].name) {
          throw transporterError;
        }

        // Continue to next transporter
        continue;
      }
    }

    throw new Error("All email transporters failed");
  } catch (error) {
    console.error(`❌ Email sending failed for ${email}:`, error);

    // Retry logic
    if (retryCount < maxRetries) {
      console.log(
        `🔄 Retrying email send for ${email} (attempt ${
          retryCount + 1
        }/${maxRetries})`
      );

      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      return sendOTPEmail(email, otp, name, retryCount + 1);
    }

    // Log detailed error information
    const errorDetails = {
      email,
      otp,
      name,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      retryCount,
    };

    console.error("📧 Email sending failed after all retries:", errorDetails);

    return {
      success: false,
      transporter: "none",
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// Test email service connectivity
export const testEmailService = async (): Promise<void> => {
  console.log("🧪 Testing email service connectivity...");

  for (const { transporter, name } of transporters) {
    try {
      await transporter.verify();
      console.log(`✅ ${name}: Connection successful`);
    } catch (error) {
      console.error(`❌ ${name}: Connection failed -`, error);
    }
  }
};

// Get email service status
export const getEmailServiceStatus = (): {
  available: boolean;
  transporters: string[];
} => {
  const availableTransporters = transporters.map((t) => t.name);
  return {
    available: transporters.length > 0,
    transporters: availableTransporters,
  };
};
