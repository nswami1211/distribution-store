import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type BillItem = {
  productId: number;

  // Quantity in the unit selected by customer
  quantity: number;

  freeQuantity?: number;

  // Unit selected by customer
  unit?: string | null;

  soNo?: string | null;

  secondaryDiscount?: number;
  cashDiscount?: number;
};

type BillRequestItem = {
  productId?: unknown;
  quantity?: unknown;
  freeQuantity?: unknown;
  unit?: unknown;
  soNo?: unknown;
  secondaryDiscount?: unknown;
  cashDiscount?: unknown;
};

type BillRequestBody = {
  customerName?: unknown;
  customerPhone?: unknown;
  customerAddress?: unknown;
  customerGstNo?: unknown;
  customerPanNo?: unknown;
  buyerErpId?: unknown;
  salesmanName?: unknown;
  routeName?: unknown;
  paymentMethod?: unknown;
  items?: unknown;
};

function generateInvoiceNumber() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `INV-${year}${month}${day}-${random}`;
}

function numberOrZero(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function round2(value: number) {
  return (
    Math.round(
      (value + Number.EPSILON) * 100
    ) / 100
  );
}

export async function POST(
  request: Request
) {
  try {
    /*
     * =====================================================
     * AUTHENTICATE USER
     * =====================================================
     */

    const user =
      await getCurrentUser();

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

    /*
     * =====================================================
     * COMPANY
     *
     * Always use companyId from the authenticated user.
     * Never trust companyId from the browser.
     * =====================================================
     */

    const companyId =
      user.companyId;

    /*
     * =====================================================
     * READ REQUEST
     * =====================================================
     */

    const body =
      (await request.json()) as BillRequestBody;

    const {
      customerName,
      customerPhone,
      customerAddress,
      customerGstNo,
      customerPanNo,
      buyerErpId,
      salesmanName,
      routeName,
      paymentMethod,
      items,
    } = body;

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Bill must contain at least one product.",
        },
        {
          status: 400,
        }
      );
    }

    const finalPaymentMethod =
      typeof paymentMethod ===
        "string" &&
      paymentMethod.trim()
        ? paymentMethod.trim()
        : "Cash";

    /*
     * =====================================================
     * NORMALIZE ITEMS
     * =====================================================
     */

    const billItems: BillItem[] =
      (items as BillRequestItem[]).map(
        (item) => ({
          productId: Number(
            item.productId
          ),

        quantity:
          numberOrZero(
            item.quantity
          ),

        freeQuantity:
          numberOrZero(
            item.freeQuantity
          ),

        unit:
          typeof item.unit ===
          "string"
            ? item.unit.trim()
            : null,

        soNo:
          typeof item.soNo ===
          "string"
            ? item.soNo.trim() ||
              null
            : null,

          secondaryDiscount:
            numberOrZero(
              item.secondaryDiscount
            ),

          cashDiscount:
            numberOrZero(
              item.cashDiscount
            ),
        })
      );

    /*
     * =====================================================
     * VALIDATE ITEMS
     * =====================================================
     */

    for (const item of billItems) {
      if (
        !Number.isInteger(
          item.productId
        ) ||
        item.productId <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid product.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !Number.isFinite(
          item.quantity
        ) ||
        item.quantity <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid invoice quantity.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !Number.isFinite(
          item.freeQuantity
        ) ||
        (item.freeQuantity ?? 0) <
          0
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid free quantity.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !Number.isFinite(
          item.secondaryDiscount
        ) ||
        (item.secondaryDiscount ??
          0) < 0
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid secondary discount.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !Number.isFinite(
          item.cashDiscount
        ) ||
        (item.cashDiscount ?? 0) <
          0
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid cash discount.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * =====================================================
     * GET PRODUCTS
     *
     * Only products belonging to the logged-in company.
     * =====================================================
     */

    const productIds =
      billItems.map(
        (item) => item.productId
      );

    const uniqueProductIds = [
      ...new Set(productIds),
    ];

    const products =
      await prisma.product.findMany({
        where: {
          id: {
            in: uniqueProductIds,
          },

          companyId,
        },
      });

    if (
      products.length !==
      uniqueProductIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "One or more products were not found in your company inventory.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =====================================================
     * CALCULATE STOCK REQUIREMENT
     *
     * Database stock is stored in base units.
     *
     * Example:
     *
     * 1 Box = 30 Pieces
     *
     * Customer:
     * 2 Box + 1 free Box
     *
     * Stock required:
     * 3 × 30 = 90 Pieces
     * =====================================================
     */

    const requestedByProduct =
      new Map<number, number>();

    for (const item of billItems) {
      const product =
        products.find(
          (product) =>
            product.id ===
            item.productId
        );

      if (!product) {
        return NextResponse.json(
          {
            error:
              "Product not found.",
          },
          {
            status: 404,
          }
        );
      }

      if (!product.isActive) {
        return NextResponse.json(
          {
            error:
              `${product.name} is inactive and cannot be billed.`,
          },
          {
            status: 400,
          }
        );
      }

      const conversion =
        Number(
          product.piecesPerUnit || 1
        );

      const selectedUnit =
        item.unit ||
        product.unit;

      let conversionFactor = 1;

      /*
       * Selling unit
       */

      if (
        selectedUnit ===
        product.unit
      ) {
        conversionFactor =
          conversion;
      }

      /*
       * Base unit
       */

      else if (
        selectedUnit ===
        product.baseUnit
      ) {
        conversionFactor = 1;
      }

      else {
        return NextResponse.json(
          {
            error:
              `Invalid unit "${selectedUnit}" for ${product.name}.`,
          },
          {
            status: 400,
          }
        );
      }

      const requestedBaseQuantity =
        (
          item.quantity +
          (item.freeQuantity || 0)
        ) *
        conversionFactor;

      const current =
        requestedByProduct.get(
          product.id
        ) || 0;

      requestedByProduct.set(
        product.id,
        current +
          requestedBaseQuantity
      );
    }

    /*
     * =====================================================
     * CHECK STOCK
     * =====================================================
     */

    for (
      const entry of
      requestedByProduct.entries()
    ) {
      const productId =
        entry[0];

      const requestedQuantity =
        entry[1];

      const product =
        products.find(
          (product) =>
            product.id ===
            productId
        );

      if (!product) {
        return NextResponse.json(
          {
            error:
              "Product not found.",
          },
          {
            status: 404,
          }
        );
      }

      const available =
        Number(
          product.quantity || 0
        );

      if (
        available <
        requestedQuantity
      ) {
        return NextResponse.json(
          {
            error:
              `Insufficient stock for ${product.name}. Available: ${available} ${product.baseUnit}. Required: ${requestedQuantity} ${product.baseUnit}.`,
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * =====================================================
     * CALCULATE SALE ITEMS
     *
     * PRICE IS BASED ON SELECTED SELLING UNIT.
     *
     * Example:
     *
     * MRP = ₹150 / Box
     * Price Before GST = ₹148.80 / Box
     * GST = 5%
     *
     * 1 Box:
     *
     * Taxable = ₹148.80
     * GST = ₹7.44
     * Total = ₹156.24
     * =====================================================
     */

    let subtotal = 0;

    let gstAmount = 0;

    const saleItems =
      billItems.map((item) => {
        const product =
          products.find(
            (product) =>
              product.id ===
              item.productId
          );

        if (!product) {
          throw new Error(
            "Product not found."
          );
        }

        const quantity =
          item.quantity;

        const freeQuantity =
          item.freeQuantity || 0;

        const selectedUnit =
          item.unit ||
          product.unit;

        /*
         * Product price is stored
         * according to selling unit.
         *
         * Example:
         *
         * ₹148.80 / Box
         */

        let pricePerSelectedUnit =
          product.priceBeforeGst;

        /*
         * If customer sells by
         * base unit, convert price.
         *
         * Example:
         *
         * ₹148.80 / Box
         *
         * 1 Box = 30 Pieces
         *
         * Piece price:
         *
         * ₹148.80 / 30
         */

        if (
          selectedUnit ===
          product.baseUnit
        ) {
          const conversion =
            Number(
              product.piecesPerUnit ||
                1
            );

          pricePerSelectedUnit =
            product.priceBeforeGst /
            conversion;
        }

        /*
         * Free quantity has no value.
         */

        const grossValue =
          pricePerSelectedUnit *
          quantity;

        const secondaryDiscount =
          item.secondaryDiscount ||
          0;

        const cashDiscount =
          item.cashDiscount || 0;

        const totalDiscount =
          secondaryDiscount +
          cashDiscount;

        const taxableValue =
          round2(
            Math.max(
              0,
              grossValue -
                totalDiscount
            )
          );

        const itemGst =
          round2(
            (taxableValue *
              product.gstPercent) /
              100
          );

        const itemTotal =
          round2(
            taxableValue +
              itemGst
          );

        subtotal =
          round2(
            subtotal +
              taxableValue
          );

        gstAmount =
          round2(
            gstAmount +
              itemGst
          );

        return {
          productId:
            product.id,

          quantity,

          freeQuantity,

          unit:
            selectedUnit,

          soNo:
            item.soNo || null,

          /*
           * IMPORTANT:
           * MRP is the MRP for the
           * selected selling unit.
           *
           * Example:
           * ₹150 per Box.
           */

          mrp:
            product.mrp,

          priceBeforeGst:
            round2(
              pricePerSelectedUnit
            ),

          gstPercent:
            product.gstPercent,

          secondaryDiscount,

          cashDiscount,

          taxableValue,

          gstAmount:
            itemGst,

          total:
            itemTotal,
        };
      });

    const grandTotal =
      round2(
        subtotal +
          gstAmount
      );

    /*
     * =====================================================
     * GENERATE INVOICE NUMBER
     * =====================================================
     */

    const invoiceNo =
      generateInvoiceNumber();

    /*
     * =====================================================
     * CREATE SALE + STOCK UPDATE
     *
     * EVERYTHING IS ONE TRANSACTION.
     *
     * If anything fails, the whole
     * transaction rolls back.
     * =====================================================
     */

    const sale =
      await prisma.$transaction(
        async (tx) => {
          /*
           * =================================================
           * CREATE SALE
           * =================================================
           */

          const newSale =
            await tx.sale.create({
              data: {
                companyId,

                invoiceNo,

                customerName:
                  typeof customerName ===
                    "string" &&
                  customerName.trim()
                    ? customerName.trim()
                    : null,

                customerPhone:
                  typeof customerPhone ===
                    "string" &&
                  customerPhone.trim()
                    ? customerPhone.trim()
                    : null,

                customerAddress:
                  typeof customerAddress ===
                    "string" &&
                  customerAddress.trim()
                    ? customerAddress.trim()
                    : null,

                customerGstNo:
                  typeof customerGstNo ===
                    "string" &&
                  customerGstNo.trim()
                    ? customerGstNo.trim()
                    : null,

                customerPanNo:
                  typeof customerPanNo ===
                    "string" &&
                  customerPanNo.trim()
                    ? customerPanNo.trim()
                    : null,

                buyerErpId:
                  typeof buyerErpId ===
                    "string" &&
                  buyerErpId.trim()
                    ? buyerErpId.trim()
                    : null,

                salesmanName:
                  typeof salesmanName ===
                    "string" &&
                  salesmanName.trim()
                    ? salesmanName.trim()
                    : null,

                routeName:
                  typeof routeName ===
                    "string" &&
                  routeName.trim()
                    ? routeName.trim()
                    : null,

                paymentMethod:
                  finalPaymentMethod,

                subtotal,

                gstAmount,

                grandTotal,

                items: {
                  create:
                    saleItems,
                },
              },

              include: {
                company: {
                  include: {
                    businessProfile:
                      true,
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
           * =================================================
           * REDUCE STOCK
           * =================================================
           */

          for (
            const entry of
            requestedByProduct.entries()
          ) {
            const productId =
              entry[0];

            const requestedQuantity =
              entry[1];

            const result =
              await tx.product.updateMany(
                {
                  where: {
                    id: productId,
                    companyId,
                  },

                  data: {
                    quantity: {
                      decrement:
                        requestedQuantity,
                    },
                  },
                }
              );

            if (
              result.count !== 1
            ) {
              throw new Error(
                "Product does not belong to the current company."
              );
            }
          }

          /*
           * =================================================
           * STOCK MOVEMENTS
           * =================================================
           */

          for (
            const item of billItems
          ) {
            const product =
              products.find(
                (product) =>
                  product.id ===
                  item.productId
              );

            if (!product) {
              throw new Error(
                "Product not found."
              );
            }

            const conversion =
              Number(
                product.piecesPerUnit ||
                  1
              );

            const selectedUnit =
              item.unit ||
              product.unit;

            let conversionFactor =
              1;

            if (
              selectedUnit ===
              product.unit
            ) {
              conversionFactor =
                conversion;
            }

            else if (
              selectedUnit ===
              product.baseUnit
            ) {
              conversionFactor =
                1;
            }

            else {
              throw new Error(
                `Invalid unit "${selectedUnit}" for ${product.name}.`
              );
            }

            const stockQuantity =
              (
                item.quantity +
                (item.freeQuantity ||
                  0)
              ) *
              conversionFactor;

            await tx.stockMovement.create(
              {
                data: {
                  companyId,

                  productId:
                    item.productId,

                  quantity:
                    -stockQuantity,

                  type: "SALE",

                  priceBeforeGst:
                    product.priceBeforeGst,

                  gstPercent:
                    product.gstPercent,

                  priceAfterGst:
                    product.priceAfterGst,
                },
              }
            );
          }

          return newSale;
        }
      );
    /*
     * =====================================================
     * BUILD INVOICE ITEMS
     * =====================================================
     */

    const invoiceItems =
      sale.items.map((item) => ({
        id: item.id,

        productId:
          item.productId,

        productName:
          item.product.name,

        itemErpId:
          item.product.itemErpId,

        /*
         * Actual unit sold.
         */
        unit:
          item.unit,

        quantity:
          item.quantity,

        freeQuantity:
          item.freeQuantity,

        /*
         * MRP stored for the
         * selected selling unit.
         */
        mrp:
          item.mrp,

        priceBeforeGst:
          item.priceBeforeGst,

        gstPercent:
          item.gstPercent,

        secondaryDiscount:
          item.secondaryDiscount,

        cashDiscount:
          item.cashDiscount,

        taxableValue:
          item.taxableValue,

        gstAmount:
          item.gstAmount,

        total:
          item.total,

        soNo:
          item.soNo,
      }));

    /*
     * =====================================================
     * RETURN BILL
     * =====================================================
     */

    return NextResponse.json(
      {
        success: true,

        sale: {
          id:
            sale.id,

          invoiceNo:
            sale.invoiceNo,

          /*
           * =================================================
           * COMPANY / BUSINESS PROFILE
           * =================================================
           */

          company: {
            name:
              sale.company.name,

            shopName:
              sale.company
                .businessProfile
                ?.shopName ??
              sale.company.name,

            gstin:
              sale.company
                .businessProfile
                ?.gstin ??
              null,

            pan:
              sale.company
                .businessProfile
                ?.pan ??
              null,

            phone:
              sale.company
                .businessProfile
                ?.phone ??
              null,

            email:
              sale.company
                .businessProfile
                ?.email ??
              null,

            address:
              sale.company
                .businessProfile
                ?.address ??
              null,

            city:
              sale.company
                .businessProfile
                ?.city ??
              null,

            state:
              sale.company
                .businessProfile
                ?.state ??
              null,

            pincode:
              sale.company
                .businessProfile
                ?.pincode ??
              null,

            upiQrImage:
              sale.company
                .businessProfile
                ?.upiQrImage ??
              null,
          },

          /*
           * =================================================
           * CUSTOMER
           * =================================================
           */

          customerName:
            sale.customerName,

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

          /*
           * =================================================
           * BILL DETAILS
           * =================================================
           */

          salesmanName:
            sale.salesmanName,

          routeName:
            sale.routeName,

          paymentMethod:
            sale.paymentMethod,

          subtotal:
            sale.subtotal,

          gstAmount:
            sale.gstAmount,

          grandTotal:
            sale.grandTotal,

          createdAt:
            sale.createdAt,

          /*
           * =================================================
           * PRODUCTS
           * =================================================
           */

          items:
            invoiceItems,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/billing error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create bill.",
      },
      {
        status: 500,
      }
    );
  }
}