import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const cookieStore = await cookies();

    const token =
      cookieStore.get(
        "auth_session"
      )?.value;

    if (token) {
      await prisma.session.deleteMany({
        where: {
          token,
        },
      });
    }

    cookieStore.delete(
      "auth_session"
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "POST /api/auth/logout error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to logout.",
      },
      { status: 500 }
    );
  }
}