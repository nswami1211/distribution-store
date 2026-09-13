import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_session")?.value;

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          companyId: true,
          isActive: true,
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  if (!session.user.isActive) return null;

  return session.user;
}

type ImportProductInput = {
  name: string;
  itemErpId?: string | null;
  mrp: number;
  gstPercent: number;
  unit?: string | null;
  baseUnit?: string | null;
  piecesPerUnit?: number | null;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function asNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();

    // ProductImportModal sends { products: [...] }.
    const products: ImportProductInput[] = Array.isArray(body?.products)
      ? body.products
      : [];

    if (products.length === 0) {
      return NextResponse.json(
        { error: "No products were supplied." },
        { status: 400 }
      );
    }

    if (products.length > 5000) {
      return NextResponse.json(
        { error: "You can import a maximum of 5000 products at a time." },
        { status: 400 }
      );
    }

    const errors: { row: number; error: string }[] = [];
    const validated: Array<{
      name: string;
      itemErpId: string | null;
      mrp: number;
      gstPercent: number;
      unit: string;
      baseUnit: string;
      piecesPerUnit: number;
      priceBeforeGst: number;
      priceAfterGst: number;
      quantity: number;
      isActive: boolean;
      companyId: typeof user.companyId;
    }> = [];

    const seenNames = new Set<string>();
    const seenErpIds = new Set<string>();

    for (let index = 0; index < products.length; index++) {
      const row = products[index];
      const rowNumber = index + 2;

      const name = cleanText(row?.name);
      const itemErpIdText = cleanText(row?.itemErpId);
      const itemErpId = itemErpIdText || null;

      const mrp = asNumber(row?.mrp);
      const gstPercent = asNumber(row?.gstPercent);

      const unit = cleanText(row?.unit) || "Pieces";
      const baseUnit = cleanText(row?.baseUnit) || "Piece";

      const piecesPerUnit =
        row?.piecesPerUnit === null ||
        row?.piecesPerUnit === undefined ||
        row?.piecesPerUnit === ""
          ? 1
          : asNumber(row?.piecesPerUnit);

      const rowErrors: string[] = [];

      if (!name) {
        rowErrors.push("Product Name is required");
      }

      if (!Number.isFinite(mrp) || mrp < 0) {
        rowErrors.push("MRP must be 0 or greater");
      }

      if (!Number.isFinite(gstPercent) || gstPercent < 0) {
        rowErrors.push("GST % must be 0 or greater");
      }

      if (
        !Number.isFinite(piecesPerUnit) ||
        piecesPerUnit <= 0 ||
        !Number.isInteger(piecesPerUnit)
      ) {
        rowErrors.push(
          "Pieces Per Unit must be a whole number greater than 0"
        );
      }

      const nameKey = name.toLowerCase();

      if (name && seenNames.has(nameKey)) {
        rowErrors.push("Duplicate Product Name in import file");
      }

      if (name) {
        seenNames.add(nameKey);
      }

      const erpKey = itemErpId?.toLowerCase();

      if (erpKey && seenErpIds.has(erpKey)) {
        rowErrors.push("Duplicate Item ERP ID in import file");
      }

      if (erpKey) {
        seenErpIds.add(erpKey);
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: rowNumber,
          error: rowErrors.join("; "),
        });
        continue;
      }

      const priceBeforeGst = Number(
        (mrp / (1 + gstPercent / 100)).toFixed(2)
      );

      validated.push({
        name,
        itemErpId,
        mrp,
        gstPercent,
        unit,
        baseUnit,
        piecesPerUnit,
        priceBeforeGst,
        priceAfterGst: mrp,

        // Imported products always start with zero stock.
        quantity: 0,

        isActive: true,
        companyId: user.companyId,
      });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Some rows are invalid.",
          errors: errors.slice(0, 100),
        },
        { status: 400 }
      );
    }

    if (validated.length === 0) {
      return NextResponse.json(
        { error: "No valid products were supplied." },
        { status: 400 }
      );
    }

    /*
     * Check existing products for THIS company before createMany().
     *
     * We intentionally do not use an interactive Prisma transaction with
     * one create() per row. Large Excel imports can exceed Prisma's
     * default 5-second interactive transaction timeout.
     */
    const existing = await prisma.product.findMany({
      where: {
        companyId: user.companyId,
        OR: [
          ...validated.map((product) => ({
            name: product.name,
          })),
          ...validated
            .filter((product) => product.itemErpId)
            .map((product) => ({
              itemErpId: product.itemErpId,
            })),
        ],
      },
      select: {
        name: true,
        itemErpId: true,
      },
    });

    const existingNames = new Set(
      existing.map((product) =>
        product.name.trim().toLowerCase()
      )
    );

    const existingErpIds = new Set(
      existing
        .map((product) =>
          product.itemErpId?.trim().toLowerCase()
        )
        .filter(
          (value): value is string =>
            Boolean(value)
        )
    );

    const duplicateErrors: { row: number; error: string }[] = [];

    validated.forEach((product, index) => {
      const rowNumber = index + 2;

      if (existingNames.has(product.name.toLowerCase())) {
        duplicateErrors.push({
          row: rowNumber,
          error: `Product already exists: ${product.name}`,
        });
      }

      if (
        product.itemErpId &&
        existingErpIds.has(product.itemErpId.toLowerCase())
      ) {
        duplicateErrors.push({
          row: rowNumber,
          error: `Item ERP ID already exists: ${product.itemErpId}`,
        });
      }
    });

    if (duplicateErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Some products already exist.",
          errors: duplicateErrors.slice(0, 100),
        },
        { status: 409 }
      );
    }

    // Single bulk INSERT — avoids the previous transaction timeout.
    await prisma.product.createMany({
      data: validated,
    });

    return NextResponse.json({
      success: true,
      createdCount: validated.length,
      message:
        `${validated.length} products imported successfully. ` +
        `All imported products start with 0 stock.`,
    });
  } catch (error) {
    console.error("POST /api/stock/import error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to import products.",
      },
      { status: 500 }
    );
  }
}
