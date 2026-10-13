import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedSeller } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const seller = await getAuthenticatedSeller(req);
  if (!seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const expenses = await prisma.expense.findMany({
      where: { seller_id: seller.id },
      orderBy: { expense_date: "desc" },
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({ expenses, total });
  } catch (error: any) {
    console.error("Fetch expenses error:", error);
    return NextResponse.json({ error: "Failed to fetch expenses." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const seller = await getAuthenticatedSeller(req);
  if (!seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { category, title, amount, expense_date } = await req.json();

    if (!title || !amount || !category) {
      return NextResponse.json(
        { error: "Title, amount, and category are required." },
        { status: 400 }
      );
    }

    const exp = await prisma.expense.create({
      data: {
        seller_id: seller.id,
        category,
        title: title.trim(),
        amount: parseFloat(amount),
        expense_date: expense_date ? new Date(expense_date) : new Date(),
      },
    });

    return NextResponse.json(
      { message: "Expense logged successfully", expense: exp },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: "Failed to create expense." }, { status: 500 });
  }
}
