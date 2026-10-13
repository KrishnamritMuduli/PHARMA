import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-pharma-pulse-jwt-key-2026-secure";

export interface JwtPayload {
  sellerId: string;
  email: string;
  pharmacyName: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getAuthenticatedSeller(req: NextRequest) {
  // Check Authorization Bearer header
  const authHeader = req.headers.get("authorization");
  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else {
    // Check cookie
    token = req.cookies.get("pharma_token")?.value || null;
  }

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload || !payload.sellerId) {
    return null;
  }

  const seller = await prisma.seller.findUnique({
    where: { id: payload.sellerId },
    select: {
      id: true,
      pharmacy_name: true,
      email: true,
      license_number: true,
      gst_number: true,
      phone: true,
      address: true,
      created_at: true,
    },
  });

  return seller;
}
