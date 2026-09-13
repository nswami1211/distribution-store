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
        select: { id: true, companyId: true, isActive: true },
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

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!rows.length) {
      return NextResponse.json(
        { error: "No stock rows were supplied." },
        { status: 400 }
      );
    }

    if (rows.length > 5000) {
      return NextResponse.json(
        { error: "A maximum of 5000 stock rows can be imported at once." },
        { status: 400 }
      );
    }

    // Load products once, scoped to the current business.
    const allProducts = await prisma.product.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        name: true,
        itemErpId: true,
        quantity: true,
        unit: true,
        baseUnit: true,
        piecesPerUnit: true,
        priceBeforeGst: true,
        gstPercent: true,
        priceAfterGst: true,
        isActive: true,
      },
    });

    const productMap = new Map(
      allProducts.map((product) => [product.id, product])
    );

    const erpMap = new Map(
      allProducts
        .filter((p) => p.itemErpId)
        .map((p) => [
          String(p.itemErpId).trim().toLowerCase(),
          p,
        ])
    );

    const nameMap = new Map(
      allProducts.map((p) => [p.name.trim().toLowerCase(), p])
    );

    const seen = new Set<number>();

    const validated: {
      row: number;
      productId: number;
      quantity: number;
    }[] = [];

    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      const erp = String(r.itemErpId ?? "").trim();
      const name = String(r.name ?? "").trim();
      const quantity = Number(r.quantity);

      const product = erp
        ? erpMap.get(erp.toLowerCase())
        : name
          ? nameMap.get(name.toLowerCase())
          : undefined;

      if (!erp && !name) {
        errors.push({
          row: i + 2,
          error: "Item ERP ID or Product Name is required.",
        });
      } else if (!product) {
        errors.push({
          row: i + 2,
          error: erp
            ? `Product not found for ERP ID "${erp}".`
            : `Product not found for name "${name}".`,
        });
      } else if (
        !Number.isFinite(quantity) ||
        quantity < 0 ||
        !Number.isInteger(quantity)
      ) {
        errors.push({
          row: i + 2,
          error:
            "Quantity must be a whole number greater than or equal to 0.",
        });
      } else if (seen.has(product.id)) {
        errors.push({
          row: i + 2,
          error: "Duplicate product in file.",
        });
      } else {
        seen.add(product.id);
        validated.push({
          row: i + 2,
          productId: product.id,
          quantity,
        });
      }
    }

    if (errors.length) {
      return NextResponse.json(
        {
          error: "The import file contains invalid rows.",
          errors,
        },
        { status: 400 }
      );
    }

    /*
     * Products were already loaded and validated above.
     * Do NOT call tx.product.findFirst() here.
     * That per-row lookup was causing Prisma's 5-second
     * interactive transaction timeout.
     */
    const result = await prisma.$transaction(async (tx) => {
      const imported: {
        row: number;
        productId: number;
        previousQuantity: number;
        addedQuantity: number;
        newQuantity: number;
      }[] = [];

      for (const item of validated) {
        const product = productMap.get(item.productId);

        if (!product) {
          throw new Error(
            `Product ${item.productId} was not found for this business.`
          );
        }

        const previousQuantity = Number(product.quantity || 0);
        const newQuantity = previousQuantity + item.quantity;

        if (item.quantity > 0) {
          const updateResult = await tx.product.updateMany({
            where: {
              id: product.id,
              companyId: user.companyId,
            },
            data: {
              quantity: {
                increment: item.quantity,
              },
            },
          });

          if (updateResult.count !== 1) {
            throw new Error(
              `Product ${product.id} was not found for this business.`
            );
          }

          await tx.stockMovement.create({
            data: {
              companyId: user.companyId,
              productId: product.id,
              quantity: item.quantity,
              type: "PURCHASE",
              priceBeforeGst: product.priceBeforeGst,
              gstPercent: product.gstPercent,
              priceAfterGst: product.priceAfterGst,
            },
          });
        }

        imported.push({
          row: item.row,
          productId: product.id,
          previousQuantity,
          addedQuantity: item.quantity,
          newQuantity,
        });
      }

      return imported;
    });

    return NextResponse.json({
      success: true,
      imported: result,
    });
  } catch (error) {
    console.error("POST /api/stock/import-stock error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stock import failed.",
      },
      { status: 500 }
    );
  }
}
