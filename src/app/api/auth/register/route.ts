import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { pharmacy_name, email, password, license_number, gst_number, phone, address } =
      await req.json();

    if (!pharmacy_name || !email || !password) {
      return NextResponse.json(
        { error: "Pharmacy name, email, and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.seller.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A pharmacy with this email already exists." },
        { status: 409 }
      );
    }

    const password_hash = await hashPassword(password);

    const seller = await prisma.seller.create({
      data: {
        pharmacy_name,
        email: normalizedEmail,
        password_hash,
        license_number: license_number || null,
        gst_number: gst_number || null,
        phone: phone || null,
        address: address || null,
      },
    });

    const token = signToken({
      sellerId: seller.id,
      email: seller.email,
      pharmacyName: seller.pharmacy_name,
    });

    const response = NextResponse.json(
      {
        message: "Registration successful",
        token,
        seller: {
          id: seller.id,
          pharmacy_name: seller.pharmacy_name,
          email: seller.email,
          license_number: seller.license_number,
          gst_number: seller.gst_number,
          phone: seller.phone,
          address: seller.address,
        },
      },
      { status: 201 }
    );

    response.cookies.set("pharma_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error during registration." },
      { status: 500 }
    );
  }
}
