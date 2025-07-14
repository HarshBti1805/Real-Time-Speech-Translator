// Create a file: test-db.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testConnection() {
  try {
    // Test basic connection
    await prisma.$connect();
    console.log("✅ Database connected successfully!");

    // Test if User table exists
    const userCount = await prisma.user.count();
    console.log(`✅ User table exists. Current user count: ${userCount}`);

    // List all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log("📋 Available tables:", tables);
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
