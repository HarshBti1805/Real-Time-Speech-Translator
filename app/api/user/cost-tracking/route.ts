import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET: Fetch cost tracking data
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "30"; // days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  try {
    // Get cost tracking data for the specified period
    const costData = await prisma.costTracking.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
        },
      },
      orderBy: { date: "desc" },
    });

    // Calculate summary statistics
    const totalCost = costData.reduce((sum, item) => sum + item.totalCost, 0);
    const totalUsage = costData.reduce(
      (sum, item) => sum + item.usageAmount,
      0
    );

    // Group by API provider
    const providerStats = costData.reduce((acc, item) => {
      if (!acc[item.apiProvider]) {
        acc[item.apiProvider] = {
          totalCost: 0,
          totalUsage: 0,
          serviceTypes: new Set(),
        };
      }
      acc[item.apiProvider].totalCost += item.totalCost;
      acc[item.apiProvider].totalUsage += item.usageAmount;
      acc[item.apiProvider].serviceTypes.add(item.serviceType);
      return acc;
    }, {} as Record<string, { totalCost: number; totalUsage: number; serviceTypes: Set<string> }>);

    // Convert serviceTypes from Set to Array
    Object.keys(providerStats).forEach((provider) => {
      providerStats[provider].serviceTypes = Array.from(
        providerStats[provider].serviceTypes
      );
    });

    // Group by service type
    const serviceStats = costData.reduce((acc, item) => {
      if (!acc[item.serviceType]) {
        acc[item.serviceType] = {
          totalCost: 0,
          totalUsage: 0,
          count: 0,
        };
      }
      acc[item.serviceType].totalCost += item.totalCost;
      acc[item.serviceType].totalUsage += item.usageAmount;
      acc[item.serviceType].count += 1;
      return acc;
    }, {} as Record<string, { totalCost: number; totalUsage: number; count: number }>);

    const summary = {
      totalCost,
      totalUsage,
      period,
      costData,
      providerStats,
      serviceStats,
      averageCostPerDay: period ? totalCost / parseInt(period) : 0,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching cost tracking:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost tracking" },
      { status: 500 }
    );
  }
}

// POST: Create cost tracking entry
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json();
  const {
    apiProvider,
    serviceType,
    usageAmount,
    costPerUnit,
    totalCost,
    currency = "USD",
  } = body;

  if (
    !apiProvider ||
    !serviceType ||
    usageAmount === undefined ||
    totalCost === undefined
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const costEntry = await prisma.costTracking.create({
      data: {
        userId: user.id,
        date: new Date(),
        apiProvider,
        serviceType,
        usageAmount,
        costPerUnit: costPerUnit || 0,
        totalCost,
        currency,
      },
    });

    return NextResponse.json(costEntry, { status: 201 });
  } catch (error) {
    console.error("Error creating cost tracking entry:", error);
    return NextResponse.json(
      { error: "Failed to create cost tracking entry" },
      { status: 500 }
    );
  }
}
