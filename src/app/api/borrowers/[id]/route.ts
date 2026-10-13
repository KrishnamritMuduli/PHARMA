import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedSeller } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const seller = await getAuthenticatedSeller(req);
  if (!seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const borrower = await prisma.borrower.findFirst({
      where: {
        id: params.id,
        seller_id: seller.id,
      },
      include: {
        transactions: {
          include: {
            sale: {
              include: {
                sale_items: {
                  include: {
                    batch: {
                      include: {
                        medicine: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!borrower) {
      return NextResponse.json({ error: "Borrower not found." }, { status: 404 });
    }

    return NextResponse.json({ borrower });
  } catch (error: any) {
    console.error("Fetch borrower ledger error:", error);
    return NextResponse.json({ error: "Failed to fetch customer ledger." }, { status: 500 });
  }
}
