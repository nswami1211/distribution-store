
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_QR_SIZE = 1.5 * 1024 * 1024;

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_session")?.value;

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt <= new Date()) return null;
  if (!session.user.isActive) return null;

  return session.user;
}

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

/*
 * GET BUSINESS PROFILE
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const profile = await prisma.businessProfile.findUnique({
      where: {
        companyId: user.companyId,
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("GET /api/business-profile:", error);

    return NextResponse.json(
      { error: "Failed to load business profile." },
      { status: 500 }
    );
  }
}

/*
 * UPDATE BUSINESS PROFILE
 */
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const shopName =
      typeof body.shopName === "string"
        ? body.shopName.trim()
        : "";

    if (!shopName) {
      return NextResponse.json(
        { error: "Shop / Company Name is required." },
        { status: 400 }
      );
    }

    // Validate uploaded QR image.
    const upiQrImage = body.upiQrImage;

    if (
      upiQrImage !== null &&
      typeof upiQrImage !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid QR image data." },
        { status: 400 }
      );
    }

    if (typeof upiQrImage === "string") {
      const match = upiQrImage.match(
        /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/
      );

      if (!match) {
        return NextResponse.json(
          { error: "QR image must be a PNG or JPG." },
          { status: 400 }
        );
      }

      const imageBuffer = Buffer.from(match[2], "base64");

      // Reject malformed or oversized image data.
      if (
        imageBuffer.length === 0 ||
        imageBuffer.length > MAX_QR_SIZE ||
        imageBuffer.toString("base64").replace(/=+$/, "") !==
          match[2].replace(/=+$/, "")
      ) {
        return NextResponse.json(
          {
            error: "QR image must be no larger than 1.5 MB.",
          },
          { status: 400 }
        );
      }

      // Verify the actual file signature.
      const isPng =
        match[1] === "png" &&
        imageBuffer.subarray(0, 8).equals(
          Buffer.from([
            0x89, 0x50, 0x4e, 0x47,
            0x0d, 0x0a, 0x1a, 0x0a,
          ])
        );

      const isJpeg =
        match[1] === "jpeg" &&
        imageBuffer[0] === 0xff &&
        imageBuffer[1] === 0xd8 &&
        imageBuffer[2] === 0xff;

      if (!isPng && !isJpeg) {
        return NextResponse.json(
          { error: "Invalid PNG or JPG image file." },
          { status: 400 }
        );
      }
    }

    const profileData = {
      shopName,
      gstin: optionalString(body.gstin)?.toUpperCase() ?? null,
      pan: optionalString(body.pan)?.toUpperCase() ?? null,
      phone: optionalString(body.phone),
      email: optionalString(body.email),
      address: optionalString(body.address),
      city: optionalString(body.city),
      state: optionalString(body.state),
      pincode: optionalString(body.pincode),
      upiQrImage,
    };

    const profile = await prisma.$transaction(async (tx) => {
      const savedProfile = await tx.businessProfile.upsert({
        where: {
          companyId: user.companyId,
        },
        update: profileData,
        create: {
          companyId: user.companyId,
          ...profileData,
        },
      });

      await tx.company.update({
        where: {
          id: user.companyId,
        },
        data: {
          name: shopName,
        },
      });

      return savedProfile;
    });

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("PUT /api/business-profile:", error);

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
