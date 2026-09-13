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

function getPresetDates(period: string) {
  const endDate = new Date();
  const startDate = new Date(endDate);

  switch (period) {
    case "3m":
      startDate.setMonth(
        startDate.getMonth() - 3
      );
      break;

    case "6m":
      startDate.setMonth(
        startDate.getMonth() - 6
      );
      break;

    case "1y":
      startDate.setFullYear(
        startDate.getFullYear() - 1
      );
      break;

    case "1m":
    default:
      startDate.setMonth(
        startDate.getMonth() - 1
      );
      break;
  }

  return {
    startDate,
    endDate,
  };
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
      const dates =
        getPresetDates(period);

      startDate =
        dates.startDate;

      endDate =
        dates.endDate;
    }

    /*
     * ==================================================
     * GET SALES
     * ==================================================
     */

    const sales =
      await prisma.sale.findMany({
        where: {
          companyId: user.companyId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

    /*
     * ==================================================
     * GROUP SALES BY CUSTOMER
     * ==================================================
     */

    const customerMap = new Map<
      string,
      {
        customerName: string;
        customerPhone: string | null;
        customerAddress: string | null;
        customerGstNo: string | null;
        customerPanNo: string | null;
        buyerErpId: string | null;

        billCount: number;

        quantity: number;
        freeQuantity: number;

        taxableAmount: number;
        gstAmount: number;
        grandTotal: number;

        products: Map<
          number,
          {
            productId: number;
            productName: string;

            quantity: number;
            freeQuantity: number;

            taxableAmount: number;
            gstAmount: number;
            total: number;

            units: Map<
              string,
              {
                quantity: number;
                freeQuantity: number;
              }
            >;
          }
        >;
      }
    >();

    /*
     * ==================================================
     * PROCESS SALES
     * ==================================================
     */

    for (const sale of sales) {
      const customerName =
        sale.customerName?.trim() ||
        "Walk-in Customer";

      /*
       * Prefer phone as customer identifier.
       */

      const customerKey =
        sale.customerPhone?.trim()
          ? `phone:${sale.customerPhone.trim()}`
          : `name:${customerName.toLowerCase()}`;

      let customer =
        customerMap.get(
          customerKey
        );

      /*
       * ==================================================
       * CREATE CUSTOMER
       * ==================================================
       */

      if (!customer) {
        customer = {
          customerName,

          customerPhone:
            sale.customerPhone,

          customerAddress:
            sale.customerAddress,

          customerGstNo:
            sale.customerGstNo,

          customerPanNo:
            sale.customerPanNo,

          buyerErpId:
            sale.buyerErpId,

          billCount: 0,

          quantity: 0,

          freeQuantity: 0,

          taxableAmount: 0,

          gstAmount: 0,

          grandTotal: 0,

          products: new Map(),
        };

        customerMap.set(
          customerKey,
          customer
        );
      }

      /*
       * ==================================================
       * CUSTOMER TOTALS
       * ==================================================
       */

      customer.billCount += 1;

      customer.taxableAmount +=
        Number(
          sale.subtotal || 0
        );

      customer.gstAmount +=
        Number(
          sale.gstAmount || 0
        );

      customer.grandTotal +=
        Number(
          sale.grandTotal || 0
        );

      /*
       * ==================================================
       * PRODUCT TOTALS
       * ==================================================
       */

      for (const item of sale.items) {
        const quantity =
          Number(
            item.quantity || 0
          );

        const freeQuantity =
          Number(
            item.freeQuantity || 0
          );

        const taxableValue =
          Number(
            item.taxableValue || 0
          );

        const gstAmount =
          Number(
            item.gstAmount || 0
          );

        const total =
          Number(
            item.total || 0
          );

        /*
         * IMPORTANT:
         *
         * SaleItem.unit is the actual
         * unit selected during billing.
         *
         * Example:
         *
         * Box
         * Piece
         */

        const soldUnit =
          item.unit ||
          item.product.unit ||
          item.product.baseUnit ||
          "Piece";

        customer.quantity +=
          quantity;

        customer.freeQuantity +=
          freeQuantity;

        let product =
          customer.products.get(
            item.productId
          );

        /*
         * ==================================================
         * CREATE PRODUCT
         * ==================================================
         */

        if (!product) {
          product = {
            productId:
              item.productId,

            productName:
              item.product.name,

            quantity: 0,

            freeQuantity: 0,

            taxableAmount: 0,

            gstAmount: 0,

            total: 0,

            units: new Map(),
          };

          customer.products.set(
            item.productId,
            product
          );
        }

        /*
         * ==================================================
         * PRODUCT TOTALS
         * ==================================================
         */

        product.quantity +=
          quantity;

        product.freeQuantity +=
          freeQuantity;

        product.taxableAmount +=
          taxableValue;

        product.gstAmount +=
          gstAmount;

        product.total +=
          total;

        /*
         * ==================================================
         * UNIT-WISE TOTALS
         * ==================================================
         */

        const unitEntry =
          product.units.get(
            soldUnit
          );

        if (unitEntry) {
          unitEntry.quantity +=
            quantity;

          unitEntry.freeQuantity +=
            freeQuantity;
        } else {
          product.units.set(
            soldUnit,
            {
              quantity,
              freeQuantity,
            }
          );
        }
      }
    }

    /*
     * ==================================================
     * FORMAT CUSTOMERS
     * ==================================================
     */

    const customers =
      Array.from(
        customerMap.values()
      )
        .map((customer) => ({
          customerName:
            customer.customerName,

          customerPhone:
            customer.customerPhone,

          customerAddress:
            customer.customerAddress,

          customerGstNo:
            customer.customerGstNo,

          customerPanNo:
            customer.customerPanNo,

          buyerErpId:
            customer.buyerErpId,

          billCount:
            customer.billCount,

          quantity:
            customer.quantity,

          freeQuantity:
            customer.freeQuantity,

          taxableAmount:
            customer.taxableAmount,

          gstAmount:
            customer.gstAmount,

          grandTotal:
            customer.grandTotal,

          products:
            Array.from(
              customer.products.values()
            )
              .map((product) => ({
                productId:
                  product.productId,

                productName:
                  product.productName,

                quantity:
                  product.quantity,

                freeQuantity:
                  product.freeQuantity,

                taxableAmount:
                  product.taxableAmount,

                gstAmount:
                  product.gstAmount,

                total:
                  product.total,

                /*
                 * Convert Map to
                 * JSON-safe array.
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
              ),
        }))
        .sort(
          (a, b) =>
            b.grandTotal -
            a.grandTotal
        );

    /*
     * ==================================================
     * OVERALL TOTALS
     * ==================================================
     */

    const totals =
      customers.reduce(
        (result, customer) => ({
          billCount:
            result.billCount +
            customer.billCount,

          quantity:
            result.quantity +
            customer.quantity,

          freeQuantity:
            result.freeQuantity +
            customer.freeQuantity,

          taxableAmount:
            result.taxableAmount +
            customer.taxableAmount,

          gstAmount:
            result.gstAmount +
            customer.gstAmount,

          grandTotal:
            result.grandTotal +
            customer.grandTotal,
        }),
        {
          billCount: 0,

          quantity: 0,

          freeQuantity: 0,

          taxableAmount: 0,

          gstAmount: 0,

          grandTotal: 0,
        }
      );

    /*
     * ==================================================
     * RESPONSE
     * ==================================================
     */

    return NextResponse.json({
      period,

      isCustom:
        Boolean(
          customStart &&
          customEnd
        ),

      startDate:
        startDate.toISOString(),

      endDate:
        endDate.toISOString(),

      customers,

      totals,
    });
  } catch (error) {
    console.error(
      "GET /api/reports/customer error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate customer sales report.",
      },
      {
        status: 500,
      }
    );
  }
}