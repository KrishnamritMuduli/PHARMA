import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedSeller } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const seller = await getAuthenticatedSeller(req);
  if (!seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const borrowers = await prisma.borrower.findMany({
      where: { seller_id: seller.id },
      include: {
        transactions: {
          orderBy: { created_at: "desc" },
          take: 5,
        },
      },
      orderBy: { current_balance: "desc" },
    });

    const totalReceivables = borrowers.reduce((sum, b) => sum + b.current_balance, 0);
    const activeDebtorsCount = borrowers.filter((b) => b.current_balance > 0).length;

    return NextResponse.json({
      borrowers,
      totalReceivables: parseFloat(totalReceivables.toFixed(2)),
      activeDebtorsCount,
    });
  } catch (error: any) {
    console.error("Fetch borrowers error:", error);
    return NextResponse.json({ error: "Failed to fetch borrower ledger." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const seller = await getAuthenticatedSeller(req);
  if (!seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { full_name, phone, credit_limit = 5000, initial_balance = 0 } = await req.json();

    if (!full_name || !phone) {
      return NextResponse.json(
        { error: "Full name and phone number are required." },
        { status: 400 }
      );
    }

    const initBal = parseFloat(initial_balance) || 0;
    const credLim = parseFloat(credit_limit) || 5000;

    const borrower = await prisma.$transaction(async (tx) => {
      const b = await tx.borrower.create({
        data: {
          seller_id: seller.id,
          full_name: full_name.trim(),
          phone: phone.trim(),
          credit_limit: credLim,
          current_balance: initBal,
          status: initBal > 0 ? "PENDING" : "SETTLED",
        },
      });

      if (initBal > 0) {
        await tx.borrowerTransaction.create({
          data: {
            borrower_id: b.id,
            seller_id: seller.id,
            type: "CREDIT",
            payment_method: "CREDIT",
            amount: initBal,
            status: "PENDING",
            notes: "Opening credit balance",
          },
        });
      }

      return b;
    });

    return NextResponse.json(
      { message: "Customer credit account registered successfully.", borrower },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create borrower error:", error);
    return NextResponse.json({ error: "Failed to create borrower account." }, { status: 500 });
  }
}
