import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!username || !password) {
      return NextResponse.json(
        {
          error:
            "Username and password are required.",
        },
        { status: 400 }
      );
    }

    /*
     * Find user and company
     */

    const user =
      await prisma.user.findUnique({
        where: {
          username,
        },
        include: {
          company: {
            include: {
              businessProfile: true,
            },
          },
        },
      });

    if (!user || !user.isActive) {
      return NextResponse.json(
        {
          error:
            "Invalid username or password.",
        },
        { status: 401 }
      );
    }

    /*
     * Verify password
     */

    const passwordValid =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordValid) {
      return NextResponse.json(
        {
          error:
            "Invalid username or password.",
        },
        { status: 401 }
      );
    }

    /*
     * Create secure session token
     */

    const token =
      randomBytes(32).toString("hex");

    const expiresAt =
      new Date(
        Date.now() +
          7 * 24 * 60 * 60 * 1000
      );

    /*
     * Save session
     */

    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    /*
     * Create response
     */

    const response =
      NextResponse.json({
        success: true,

        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          companyId: user.companyId,
        },

        company: {
          id: user.company.id,
          name: user.company.name,

          businessProfile:
            user.company
              .businessProfile,
        },
      });

    /*
     * HTTP-only session cookie
     */

    response.cookies.set(
      "auth_session",
      token,
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite: "lax",

        path: "/",

        maxAge:
          7 * 24 * 60 * 60,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "POST /api/auth/login error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Login failed.",
      },
      {
        status: 500,
      }
    );
  }
}