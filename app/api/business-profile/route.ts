import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function getCurrentUser() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("auth_session")?.value;

  if (!token) {
    return null;
  }

  const session =
    await prisma.session.findUnique({
      where: {
        token,
      },
      include: {
        user: true,
      },
    });

  if (!session) {
    return null;
  }

  if (
    session.expiresAt <= new Date()
  ) {
    return null;
  }

  if (!session.user.isActive) {
    return null;
  }

  return session.user;
}

/*
 * GET PROFILE
 */

export async function GET() {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const profile =
      await prisma.businessProfile.findUnique({
        where: {
          companyId:
            user.companyId,
        },
      });

    return NextResponse.json({
      profile,
    });
  } catch (error) {
    console.error(
      "GET /api/business-profile:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load business profile.",
      },
      { status: 500 }
    );
  }
}

/*
 * UPDATE PROFILE
 */

export async function PUT(
  request: Request
) {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body =
      await request.json();

    const shopName =
      typeof body.shopName === "string"
        ? body.shopName.trim()
        : "";

    if (!shopName) {
      return NextResponse.json(
        {
          error:
            "Shop / Company Name is required.",
        },
        { status: 400 }
      );
    }

    const profile =
      await prisma.businessProfile.upsert({
        where: {
          companyId:
            user.companyId,
        },

        update: {
          shopName,

          gstin:
            body.gstin?.trim()
              ? body.gstin
                  .trim()
                  .toUpperCase()
              : null,

          pan:
            body.pan?.trim()
              ? body.pan
                  .trim()
                  .toUpperCase()
              : null,

          phone:
            body.phone?.trim() ||
            null,

          email:
            body.email?.trim() ||
            null,

          address:
            body.address?.trim() ||
            null,

          city:
            body.city?.trim() ||
            null,

          state:
            body.state?.trim() ||
            null,

          pincode:
            body.pincode?.trim() ||
            null,
        },

        create: {
          companyId:
            user.companyId,

          shopName,

          gstin:
            body.gstin?.trim()
              ? body.gstin
                  .trim()
                  .toUpperCase()
              : null,

          pan:
            body.pan?.trim()
              ? body.pan
                  .trim()
                  .toUpperCase()
              : null,

          phone:
            body.phone?.trim() ||
            null,

          email:
            body.email?.trim() ||
            null,

          address:
            body.address?.trim() ||
            null,

          city:
            body.city?.trim() ||
            null,

          state:
            body.state?.trim() ||
            null,

          pincode:
            body.pincode?.trim() ||
            null,
        },
      });

    /*
     * Also keep Company.name
     * synchronized with shopName.
     */

    await prisma.company.update({
      where: {
        id: user.companyId,
      },

      data: {
        name: shopName,
      },
    });

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error(
      "PUT /api/business-profile:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update business profile.",
      },
      { status: 500 }
    );
  }
}