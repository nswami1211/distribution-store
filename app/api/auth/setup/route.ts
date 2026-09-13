import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : null;

    if (!username) {
      return NextResponse.json(
        {
          error: "Username is required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    /*
     * Don't allow duplicate users.
     */
    const existingUser =
      await prisma.user.findUnique({
        where: {
          username,
        },
      });

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "A user with this username already exists.",
        },
        { status: 409 }
      );
    }

    /*
     * Hash password before storing it.
     */
    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      );

    /*
     * Create the company and admin user
     * together.
     */
    const result =
      await prisma.$transaction(
        async (tx) => {
          const company =
            await tx.company.create({
              data: {
                name:
                  body.companyName
                    ?.trim() ||
                  "Distribution Store",
              },
            });

          const user =
            await tx.user.create({
              data: {
                username,
                password:
                  hashedPassword,
                name,
                isActive: true,

                company: {
                  connect: {
                    id: company.id,
                  },
                },
              },

              select: {
                id: true,
                username: true,
                name: true,
                isActive: true,
                createdAt: true,
                companyId: true,
              },
            });

          return {
            company,
            user,
          };
        }
      );

    return NextResponse.json(
      {
        success: true,

        message:
          "Admin user and company created successfully.",

        company: {
          id:
            result.company.id,

          name:
            result.company.name,
        },

        user:
          result.user,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/auth/setup error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create user.",
      },
      {
        status: 500,
      }
    );
  }
}