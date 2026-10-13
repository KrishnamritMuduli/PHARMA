import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSeller } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const seller = await getAuthenticatedSeller(req);
    if (!seller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ seller });
  } catch (error: any) {
    return NextResponse.json({ error: "Authentication check failed" }, { status: 500 });
  }
}
