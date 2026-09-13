import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    /*
     * =====================================================
     * CURRENT USER / COMPANY
     * =====================================================
     */

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const companyId = user.companyId;

    /*
     * =====================================================
     * TODAY
     * =====================================================
     */

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    /*
     * =====================================================
     * LOAD ONLY THIS COMPANY'S DATA
     * =====================================================
     */

    const [
      totalProducts,
      products,
      todayBills,
    ] = await Promise.all([
      /*
       * ACTIVE PRODUCTS FOR CURRENT COMPANY ONLY
       */
      prisma.product.count({
        where: {
          companyId,
          isActive: true,
        },
      }),

      /*
       * ACTIVE INVENTORY FOR CURRENT COMPANY ONLY
       */
      prisma.product.findMany({
        where: {
          companyId,
          isActive: true,
        },

        orderBy: {
          quantity: "asc",
        },

        select: {
          id: true,
          name: true,
          itemErpId: true,
          quantity: true,
          unit: true,
          mrp: true,
          priceBeforeGst: true,
          gstPercent: true,
          priceAfterGst: true,
        },
      }),

      /*
       * TODAY'S BILLS FOR CURRENT COMPANY ONLY
       */
      prisma.sale.findMany({
        where: {
          companyId,
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          invoiceNo: true,
          customerName: true,
          grandTotal: true,
          paymentMethod: true,
          createdAt: true,
        },
      }),
    ]);

    /*
     * =====================================================
     * TOTAL STOCK
     * =====================================================
     */

    const totalStock = products.reduce(
      (total, product) =>
        total + product.quantity,
      0
    );

    /*
     * =====================================================
     * LOW STOCK
     * =====================================================
     */

    const lowStockProducts =
      products.filter(
        (product) =>
          product.quantity <= 10
      );

    /*
     * =====================================================
     * TODAY'S SALES
     * =====================================================
     */

    const todaySales =
      todayBills.reduce(
        (total, bill) =>
          total + bill.grandTotal,
        0
      );

    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

    return NextResponse.json(
      {
        totalProducts,

        totalStock,

        todaySales,

        todayBills:
          todayBills.length,

        lowStockProducts,

        recentBills:
          todayBills.slice(0, 5),
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET /api/dashboard error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load dashboard.",
      },
      {
        status: 500,
      }
    );
  }
}