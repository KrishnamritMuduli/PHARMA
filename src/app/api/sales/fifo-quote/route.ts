import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSeller } from "@/lib/auth";
import { planFifoAllocation } from "@/lib/fifo";

export async function POST(req: NextRequest) {
  const seller = await getAuthenticatedSeller(req);
  if (!seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items array is required for FIFO quote." },
        { status: 400 }
      );
    }

    const quote = await planFifoAllocation(seller.id, items);

    if (quote.error) {
      return NextResponse.json({ error: quote.error }, { status: 400 });
    }

    return NextResponse.json(quote);
  } catch (error: any) {
    console.error("FIFO Quote error:", error);
    return NextResponse.json({ error: "Failed to generate FIFO quote." }, { status: 500 });
  }
}
