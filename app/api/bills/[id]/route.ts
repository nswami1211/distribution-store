import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    /*
     * =====================================================
     * AUTHENTICATE USER
     * =====================================================
     */

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized. Please log in again.",
        },
        {
          status: 401,
        }
      );
    }

    const companyId = user.companyId;

    /*
     * =====================================================
     * GET BILL ID
     * =====================================================
     */

    const { id } = await params;

    const saleId = Number(id);

    if (
      !Number.isInteger(saleId) ||
      saleId <= 0
    ) {
      return NextResponse.json(
        {
          error: "Invalid bill ID.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * GET BILL
     *
     * IMPORTANT:
     *
     * The bill must belong to the
     * logged-in user's company.
     * =====================================================
     */

    const bill =
      await prisma.sale.findFirst({
        where: {
          id: saleId,

          companyId,
        },

        include: {
          company: {
            include: {
              businessProfile: true,
            },
          },

          items: {
            include: {
              product: true,
            },
          },
        },
      });

    if (!bill) {
      return NextResponse.json(
        {
          error: "Bill not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =====================================================
     * COMPANY INFORMATION
     * =====================================================
     */

    const businessProfile =
      bill.company.businessProfile;

    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

    const response = {
      id: bill.id,

      invoiceNo:
        bill.invoiceNo,

      /*
       * =================================================
       * COMPANY / BUSINESS PROFILE
       * =================================================
       */

      company: {
        name:
          bill.company.name,

        shopName:
          businessProfile?.shopName ??
          bill.company.name,

        gstin:
          businessProfile?.gstin ??
          null,

        pan:
          businessProfile?.pan ??
          null,

        phone:
          businessProfile?.phone ??
          null,

        email:
          businessProfile?.email ??
          null,

        address:
          businessProfile?.address ??
          null,

        city:
          businessProfile?.city ??
          null,

        state:
          businessProfile?.state ??
          null,

        pincode:
          businessProfile?.pincode ??
          null,
      },

      /*
       * =================================================
       * CUSTOMER
       * =================================================
       */

      customerName:
        bill.customerName,

      customerPhone:
        bill.customerPhone,

      customerAddress:
        bill.customerAddress,

      customerGstNo:
        bill.customerGstNo,

      customerPanNo:
        bill.customerPanNo,

      buyerErpId:
        bill.buyerErpId,

      /*
       * =================================================
       * SALES DETAILS
       * =================================================
       */

      salesmanName:
        bill.salesmanName,

      routeName:
        bill.routeName,

      paymentMethod:
        bill.paymentMethod,

      subtotal:
        Number(bill.subtotal),

      gstAmount:
        Number(bill.gstAmount),

      grandTotal:
        Number(bill.grandTotal),

      createdAt:
        bill.createdAt,

      /*
       * =================================================
       * ITEMS
       * =================================================
       */

      items: bill.items.map(
        (item) => ({
          id: item.id,

          productId:
            item.productId,

          productName:
            item.product.name,

          itemErpId:
            item.product.itemErpId,

          /*
           * IMPORTANT:
           *
           * Use the actual unit sold
           * on the invoice.
           *
           * Do not use product.unit here.
           */
          unit:
            item.unit,

          quantity:
            Number(item.quantity),

          freeQuantity:
            Number(
              item.freeQuantity
            ),

          mrp:
            item.mrp !== null
              ? Number(item.mrp)
              : null,

          priceBeforeGst:
            Number(
              item.priceBeforeGst
            ),

          gstPercent:
            Number(
              item.gstPercent
            ),

          secondaryDiscount:
            Number(
              item.secondaryDiscount
            ),

          cashDiscount:
            Number(
              item.cashDiscount
            ),

          taxableValue:
            Number(
              item.taxableValue
            ),

          gstAmount:
            Number(
              item.gstAmount
            ),

          total:
            Number(item.total),

          soNo:
            item.soNo,
        })
      ),
    };

    return NextResponse.json(
      response
    );
  } catch (error) {
    console.error(
      "GET /api/bills/[id] error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load bill.",
      },
      {
        status: 500,
      }
    );
  }
}