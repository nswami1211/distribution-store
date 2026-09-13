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
    await prisma.session.delete({
      where: { id: session.id },
    });
    return null;
  }

  if (!session.user.isActive) return null;

  return session.user;
}

function startOfDay(date: Date) {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);

  result.setHours(23, 59, 59, 999);

  return result;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const period =
      searchParams.get("period") || "1m";

    const customStart =
      searchParams.get("startDate");

    const customEnd =
      searchParams.get("endDate");

    let startDate: Date;
    let endDate: Date;

    /*
     * ==================================================
     * CUSTOM DATE RANGE
     * ==================================================
     */

    if (customStart || customEnd) {
      if (!customStart || !customEnd) {
        return NextResponse.json(
          {
            error:
              "Both startDate and endDate are required.",
          },
          {
            status: 400,
          }
        );
      }

      const parsedStart =
        new Date(
          `${customStart}T00:00:00`
        );

      const parsedEnd =
        new Date(
          `${customEnd}T23:59:59.999`
        );

      if (
        Number.isNaN(
          parsedStart.getTime()
        ) ||
        Number.isNaN(
          parsedEnd.getTime()
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid startDate or endDate.",
          },
          {
            status: 400,
          }
        );
      }

      if (parsedStart > parsedEnd) {
        return NextResponse.json(
          {
            error:
              "Start date cannot be after end date.",
          },
          {
            status: 400,
          }
        );
      }

      startDate =
        startOfDay(parsedStart);

      endDate =
        endOfDay(parsedEnd);
    }

    /*
     * ==================================================
     * PRESET PERIOD
     * ==================================================
     */

    else {
      endDate = new Date();

      startDate = new Date(
        endDate
      );

      if (period === "3m") {
        startDate.setMonth(
          startDate.getMonth() - 3
        );
      } else if (period === "6m") {
        startDate.setMonth(
          startDate.getMonth() - 6
        );
      } else if (period === "1y") {
        startDate.setFullYear(
          startDate.getFullYear() - 1
        );
      } else {
        startDate.setMonth(
          startDate.getMonth() - 1
        );
      }
    }

    /*
     * ==================================================
     * GET SALE ITEMS
     * ==================================================
     */

    const saleItems =
      await prisma.saleItem.findMany({
        where: {
          sale: {
            companyId: user.companyId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },

        include: {
          product: true,
          sale: true,
        },

        orderBy: {
          product: {
            name: "asc",
          },
        },
      });

    /*
     * ==================================================
     * PRODUCT MAP
     * ==================================================
     */

    const productMap = new Map<
      number,
      {
        productId: number;
        productName: string;
        itemErpId: string | null;

        unit: string;

        quantity: number;
        freeQuantity: number;

        taxableAmount: number;
        gstAmount: number;
        grandTotal: number;

        billCount: number;

        units: Map<
          string,
          {
            quantity: number;
            freeQuantity: number;
          }
        >;
      }
    >();

    /*
     * ==================================================
     * GROUP PRODUCTS
     * ==================================================
     */

    for (const item of saleItems) {
      const productId =
        item.productId;

      const quantity =
        Number(item.quantity || 0);

      const freeQuantity =
        Number(
          item.freeQuantity || 0
        );

      const taxableAmount =
        Number(
          item.taxableValue || 0
        );

      const gstAmount =
        Number(
          item.gstAmount || 0
        );

      const total =
        Number(item.total || 0);

      const soldUnit =
        item.unit ||
        item.product.unit ||
        item.product.baseUnit ||
        "Piece";

      const existing =
        productMap.get(productId);

      /*
       * ==================================================
       * EXISTING PRODUCT
       * ==================================================
       */

      if (existing) {
        existing.quantity +=
          quantity;

        existing.freeQuantity +=
          freeQuantity;

        existing.taxableAmount +=
          taxableAmount;

        existing.gstAmount +=
          gstAmount;

        existing.grandTotal +=
          total;

        existing.billCount += 1;

        /*
         * UNIT-WISE TOTAL
         */

        const unitEntry =
          existing.units.get(
            soldUnit
          );

        if (unitEntry) {
          unitEntry.quantity +=
            quantity;

          unitEntry.freeQuantity +=
            freeQuantity;
        } else {
          existing.units.set(
            soldUnit,
            {
              quantity,
              freeQuantity,
            }
          );
        }
      }

      /*
       * ==================================================
       * NEW PRODUCT
       * ==================================================
       */

      else {
        productMap.set(
          productId,
          {
            productId,

            productName:
              item.product.name,

            itemErpId:
              item.product.itemErpId,

            unit:
              item.product.unit,

            quantity,

            freeQuantity,

            taxableAmount,

            gstAmount,

            grandTotal:
              total,

            billCount: 1,

            units:
              new Map([
                [
                  soldUnit,
                  {
                    quantity,
                    freeQuantity,
                  },
                ],
              ]),
          }
        );
      }
    }

    /*
     * ==================================================
     * CONVERT MAP TO JSON-SAFE ARRAY
     * ==================================================
     */

    const products =
      Array.from(
        productMap.values()
      )
        .map((product) => ({
          productId:
            product.productId,

          productName:
            product.productName,

          itemErpId:
            product.itemErpId,

          unit:
            product.unit,

          quantity:
            product.quantity,

          freeQuantity:
            product.freeQuantity,

          taxableAmount:
            product.taxableAmount,

          gstAmount:
            product.gstAmount,

          grandTotal:
            product.grandTotal,

          billCount:
            product.billCount,

          /*
           * Example:
           *
           * [
           *   {
           *     unit: "Box",
           *     quantity: 5,
           *     freeQuantity: 1
           *   },
           *   {
           *     unit: "Piece",
           *     quantity: 11,
           *     freeQuantity: 2
           *   }
           * ]
           */

          units: Array.from(
            product.units.entries()
          ).map(
            ([unit, values]) => ({
              unit,

              quantity:
                values.quantity,

              freeQuantity:
                values.freeQuantity,
            })
          ),
        }))
        .sort((a, b) =>
          a.productName.localeCompare(
            b.productName
          )
        );

    /*
     * ==================================================
     * TOTALS
     * ==================================================
     */

    const totals =
      products.reduce(
        (total, product) => ({
          quantity:
            total.quantity +
            product.quantity,

          freeQuantity:
            total.freeQuantity +
            product.freeQuantity,

          taxableAmount:
            total.taxableAmount +
            product.taxableAmount,

          gstAmount:
            total.gstAmount +
            product.gstAmount,

          grandTotal:
            total.grandTotal +
            product.grandTotal,

          billCount:
            total.billCount +
            product.billCount,
        }),
        {
          quantity: 0,
          freeQuantity: 0,
          taxableAmount: 0,
          gstAmount: 0,
          grandTotal: 0,
          billCount: 0,
        }
      );

    /*
     * ==================================================
     * RESPONSE
     * ==================================================
     */

    return NextResponse.json({
      period,

      startDate:
        startDate.toISOString(),

      endDate:
        endDate.toISOString(),

      isCustom:
        Boolean(
          customStart &&
          customEnd
        ),

      products,

      totals,
    });
  } catch (error) {
    console.error(
      "GET /api/reports/product error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load product sales report.",
      },
      {
        status: 500,
      }
    );
  }
}