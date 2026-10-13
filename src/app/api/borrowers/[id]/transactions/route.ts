import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedSeller } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const seller = await getAuthenticatedSeller(req);
  if (!seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      type, // 'PAYMENT' or 'CREDIT'
      amount,
      payment_method = "CASH", // 'CASH', 'UPI', 'CARD', 'BANK_TRANSFER'
      notes,
    } = await req.json();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Transaction amount must be a positive number." },
        { status: 400 }
      );
    }

    if (type !== "PAYMENT" && type !== "CREDIT") {
      return NextResponse.json(
        { error: "Transaction type must be 'PAYMENT' or 'CREDIT'." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const borrower = await tx.borrower.findFirst({
        where: { id: params.id, seller_id: seller.id },
      });

      if (!borrower) {
        throw new Error("Borrower customer not found.");
      }

      let newBalance = borrower.current_balance;
      let newStatus: string = borrower.status;

      if (type === "PAYMENT") {
        newBalance = Math.max(0, borrower.current_balance - parsedAmount);
        newStatus = newBalance === 0 ? "SETTLED" : "PARTIAL";
      } else {
        // CREDIT
        newBalance = borrower.current_balance + parsedAmount;
        if (newBalance > borrower.credit_limit) {
          throw new Error(
            `Credit limit of ₹${borrower.credit_limit} would be exceeded. Current balance: ₹${borrower.current_balance}`
          );
        }
        newStatus = "PENDING";
      }

      const txRecord = await tx.borrowerTransaction.create({
        data: {
          borrower_id: borrower.id,
          seller_id: seller.id,
          type,
          payment_method: type === "PAYMENT" ? payment_method : "CREDIT",
          amount: parsedAmount,
          status: newStatus,
          notes: notes || (type === "PAYMENT" ? `Repayment via ${payment_method}` : "Store credit issue"),
        },
      });

      const updatedBorrower = await tx.borrower.update({
        where: { id: borrower.id },
        data: {
          current_balance: newBalance,
          status: newStatus,
        },
      });

      return { transaction: txRecord, borrower: updatedBorrower };
    });

    return NextResponse.json({
      message: `${type === "PAYMENT" ? "Payment" : "Credit"} logged successfully`,
      ...result,
    });
  } catch (error: any) {
    console.error("Borrower transaction error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log transaction." },
      { status: 400 }
    );
  }
}
