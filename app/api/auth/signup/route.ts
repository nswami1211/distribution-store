import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const shopName =
      typeof body.shopName === "string"
        ? body.shopName.trim()
        : "";

    const gstin =
      typeof body.gstin === "string"
        ? body.gstin.trim().toUpperCase()
        : "";

    const pan =
      typeof body.pan === "string"
        ? body.pan.trim().toUpperCase()
        : "";

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim()
        : "";

    const address =
      typeof body.address === "string"
        ? body.address.trim()
        : "";

    const city =
      typeof body.city === "string"
        ? body.city.trim()
        : "";

    const state =
      typeof body.state === "string"
        ? body.state.trim()
        : "";

    const pincode =
      typeof body.pincode === "string"
        ? body.pincode.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    /*
     * ==================================================
     * VALIDATION
     * ==================================================
     */

    if (!shopName) {
      return NextResponse.json(
        {
          error:
            "Shop / Company name is required.",
        },
        { status: 400 }
      );
    }

    if (!username) {
      return NextResponse.json(
        {
          error: "Username is required.",
        },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        {
          error:
            "Username must be at least 3 characters.",
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
     * GSTIN validation
     */

    if (
      gstin &&
      !/^[0-9A-Z]{15}$/.test(gstin)
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid 15-character GSTIN.",
        },
        { status: 400 }
      );
    }

    /*
     * PAN validation
     */

    if (
      pan &&
      !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid PAN.",
        },
        { status: 400 }
      );
    }

    /*
     * ==================================================
     * CHECK USERNAME
     * ==================================================
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
            "Username is already registered.",
        },
        { status: 409 }
      );
    }

    /*
     * ==================================================
     * PASSWORD HASH
     * ==================================================
     */

    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      );

    /*
     * ==================================================
     * CREATE COMPANY + PROFILE + USER
     *
     * Everything is created together.
     * ==================================================
     */

    const result =
      await prisma.$transaction(
        async (tx) => {
          /*
           * Create company.
           *
           * The company name comes from
           * the shop/company name entered
           * during signup.
           */

          const company =
            await tx.company.create({
              data: {
                name: shopName,
              },
            });

          /*
           * Create business profile.
           */

          const businessProfile =
            await tx.businessProfile.create({
              data: {
                shopName,

                gstin:
                  gstin || null,

                pan:
                  pan || null,

                phone:
                  phone || null,

                email:
                  email || null,

                address:
                  address || null,

                city:
                  city || null,

                state:
                  state || null,

                pincode:
                  pincode || null,

                companyId:
                  company.id,
              },
            });

          /*
           * Create login user.
           */

          const user =
            await tx.user.create({
              data: {
                username,
                password:
                  hashedPassword,

                name:
                  name || null,

                isActive: true,

                companyId:
                  company.id,
              },

              select: {
                id: true,
                username: true,
                name: true,
                isActive: true,
                companyId: true,
              },
            });

          return {
            company,
            businessProfile,
            user,
          };
        }
      );

    /*
     * ==================================================
     * RESPONSE
     * ==================================================
     */

    return NextResponse.json(
      {
        success: true,

        message:
          "Company and account created successfully.",

        user: result.user,

        company: {
          id: result.company.id,
          name: result.company.name,
        },

        businessProfile:
          result.businessProfile,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/auth/signup error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create account.",
      },
      {
        status: 500,
      }
    );
  }
}