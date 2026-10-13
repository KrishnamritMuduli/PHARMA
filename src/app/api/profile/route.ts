import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedSeller } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const seller = await getAuthenticatedSeller(req);
  if (!seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ seller });
}

export async function PUT(req: NextRequest) {
  const seller = await getAuthenticatedSeller(req);
  if (!seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { pharmacy_name, license_number, gst_number, phone, address } = await req.json();

    const updated = await prisma.seller.update({
      where: { id: seller.id },
      data: {
        pharmacy_name: pharmacy_name ?? seller.pharmacy_name,
        license_number: license_number !== undefined ? license_number : seller.license_number,
        gst_number: gst_number !== undefined ? gst_number : seller.gst_number,
        phone: phone !== undefined ? phone : seller.phone,
        address: address !== undefined ? address : seller.address,
      },
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      seller: {
        id: updated.id,
        pharmacy_name: updated.pharmacy_name,
        email: updated.email,
        license_number: updated.license_number,
        gst_number: updated.gst_number,
        phone: updated.phone,
        address: updated.address,
      },
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}
