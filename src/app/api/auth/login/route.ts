import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const seller = await prisma.seller.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!seller) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, seller.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = signToken({
      sellerId: seller.id,
      email: seller.email,
      pharmacyName: seller.pharmacy_name,
    });

    const response = NextResponse.json({
      message: "Login successful",
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
    });

    // Set secure cookie
    response.cookies.set("pharma_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error during authentication." },
      { status: 500 }
    );
  }
}
