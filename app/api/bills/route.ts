import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
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
          error:
            "Unauthorized. Please log in again.",
        },
        {
          status: 401,
        }
      );
    }

    const companyId = user.companyId;

    /*
     * =====================================================
     * GET ONLY THIS COMPANY'S BILLS
     * =====================================================
     */

    const bills =
      await prisma.sale.findMany({
        where: {
          companyId,
        },

        orderBy: {
          createdAt: "desc",
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

    /*
     * =====================================================
     * FORMAT RESPONSE
     * =====================================================
     */

    const response = bills.map(
      (bill) => {
        const profile =
          bill.company
            .businessProfile;

        return {
          id: bill.id,

          invoiceNo:
            bill.invoiceNo,

          /*
           * COMPANY INFORMATION
           */
          company: {
            name:
              bill.company.name,

            shopName:
              profile?.shopName ??
              bill.company.name,

            gstin:
              profile?.gstin ??
              null,

            pan:
              profile?.pan ??
              null,

            phone:
              profile?.phone ??
              null,

            email:
              profile?.email ??
              null,

            address:
              profile?.address ??
              null,

            city:
              profile?.city ??
              null,

            state:
              profile?.state ??
              null,

            pincode:
              profile?.pincode ??
              null,
          },

          /*
           * CUSTOMER
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
           * BILL DETAILS
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
           * ITEMS
           */
          items: bill.items.map(
            (item) => ({
              id: item.id,

              productId:
                item.productId,

              productName:
                item.product.name,

              itemErpId:
                item.product
                  .itemErpId,

              /*
               * Actual unit sold
               */
              unit:
                item.unit,

              quantity:
                Number(
                  item.quantity
                ),

              freeQuantity:
                Number(
                  item.freeQuantity
                ),

              mrp:
                item.mrp !== null
                  ? Number(
                      item.mrp
                    )
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
                Number(
                  item.total
                ),

              soNo:
                item.soNo,
            })
          ),
        };
      }
    );

    return NextResponse.json(
      response
    );
  } catch (error) {
    console.error(
      "GET /api/bills error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load bills.",
      },
      {
        status: 500,
      }
    );
  }
}