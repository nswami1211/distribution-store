import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/*
 * =========================================================
 * AUTHENTICATED COMPANY
 * =========================================================
 */

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
        user: {
          select: {
            id: true,
            companyId: true,
            isActive: true,
          },
        },
      },
    });

  if (!session) {
    return null;
  }

  /*
   * Session expired
   */

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  /*
   * User disabled
   */

  if (!session.user.isActive) {
    return null;
  }

  return session.user;
}

/*
 * =========================================================
 * GET INVENTORY
 * =========================================================
 */

export async function GET() {
  try {
    const user =
      await getCurrentUser();

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

    /*
     * IMPORTANT:
     *
     * Only products belonging to the
     * logged-in user's company.
     */

    const products =
      await prisma.product.findMany({
        where: {
          companyId:
            user.companyId,

          isActive: true,
        },

        orderBy: {
          name: "asc",
        },
      });

    return NextResponse.json(
      products
    );
  } catch (error) {
    console.error(
      "GET /api/stock error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load inventory.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * =========================================================
 * POST
 *
 * Create new product OR add stock to existing product
 *
 * IMPORTANT:
 *
 * quantity is entered in the product's BASE UNIT.
 *
 * Example:
 *
 * Unit = Box
 * Base Unit = Piece
 * Pieces Per Unit = 12
 * Quantity = 14 Pieces
 *
 * Database quantity:
 *
 * 14 Pieces
 * =========================================================
 */

export async function POST(
  request: Request
) {
  try {
    const user =
      await getCurrentUser();

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

    const body =
      await request.json();

    const productId =
      body.productId == null ||
      body.productId === ""
        ? null
        : Number(body.productId);

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const itemErpId =
      typeof body.itemErpId === "string"
        ? body.itemErpId.trim() || null
        : null;

    const quantity =
      Number(body.quantity);

    const unit =
      typeof body.unit === "string" &&
      body.unit.trim()
        ? body.unit.trim()
        : "Pieces";

    const baseUnit =
      typeof body.baseUnit === "string" &&
      body.baseUnit.trim()
        ? body.baseUnit.trim()
        : "Piece";

    const piecesPerUnit =
      Number(
        body.piecesPerUnit ?? 1
      );

    const mrp =
      body.mrp === null ||
      body.mrp === undefined ||
      body.mrp === ""
        ? null
        : Number(body.mrp);

    const gstPercent =
      Number(body.gstPercent);

    /*
     * MRP is GST-inclusive.
     *
     * Calculate Price Before GST automatically:
     *
     * Price Before GST =
     * MRP / (1 + GST / 100)
     *
     * Example:
     * MRP = 118
     * GST = 18%
     * Price Before GST = 100
     */
    const priceBeforeGst =
      mrp !== null &&
      Number.isFinite(mrp) &&
      Number.isFinite(gstPercent) &&
      gstPercent >= 0
        ? Number(
            (
              mrp /
              (1 + gstPercent / 100)
            ).toFixed(2)
          )
        : NaN;

    /*
     * =====================================================
     * VALIDATION
     * =====================================================
     */

    if (
      productId !== null &&
      (!Number.isInteger(productId) ||
        productId <= 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid product ID.",
        },
        {
          status: 400,
        }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Product name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      productId !== null &&
      (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isInteger(quantity)
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Quantity must be a whole number greater than 0.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(
        piecesPerUnit
      ) ||
      piecesPerUnit <= 0 ||
      !Number.isInteger(
        piecesPerUnit
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Pieces per unit must be a whole number greater than 0.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(
        priceBeforeGst
      ) ||
      priceBeforeGst < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid price.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(
        gstPercent
      ) ||
      gstPercent < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid GST percentage.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      mrp !== null &&
      (!Number.isFinite(mrp) ||
        mrp < 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid MRP.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * PRICE AFTER GST
     * =====================================================
     */

    const priceAfterGst =
      priceBeforeGst +
      (priceBeforeGst *
        gstPercent) /
        100;

    /*
     * =====================================================
     * EXISTING PRODUCT
     * =====================================================
     */

    if (productId !== null) {
      /*
       * IMPORTANT:
       *
       * Search by BOTH product ID and
       * company ID.
       *
       * This prevents Company A from
       * modifying Company B's product.
       */

      const existingProduct =
        await prisma.product.findFirst({
          where: {
            id: productId,

            companyId:
              user.companyId,
          },
        });

      if (!existingProduct) {
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

      /*
       * Existing product already has
       * its conversion.
       *
       * Do NOT allow conversion to
       * change while adding stock.
       */

      const existingConversion =
        Number(
          existingProduct
            .piecesPerUnit || 1
        );

      /*
       * Quantity entered by the user is ALWAYS
       * in the base unit.
       *
       * Example:
       * Base Unit = Piece
       * Selling Unit = Box
       * 1 Box = 12 Pieces
       *
       * User enters:
       * Quantity = 14 Pieces
       *
       * Database:
       * 14 Pieces
       *
       * Do NOT multiply by piecesPerUnit.
       */
      const addedBaseQuantity =
        quantity;

      /*
       * Previous database quantity
       * is already stored in base units.
       */

      const previousQuantity =
        Number(
          existingProduct.quantity ||
            0
        );

      const newQuantity =
        previousQuantity +
        addedBaseQuantity;

      const product =
        await prisma.$transaction(
          async (tx) => {
            const updatedProduct =
              await tx.product.update({
                where: {
                  id: existingProduct.id,
                },

                data: {
                  quantity:
                    newQuantity,

                  /*
                   * Keep existing unit
                   * conversion.
                   */

                  unit:
                    existingProduct.unit,

                  baseUnit:
                    existingProduct.baseUnit,

                  piecesPerUnit:
                    existingConversion,

                  /*
                   * Allow price details
                   * to be updated when
                   * new stock arrives.
                   */

                  itemErpId:
                    itemErpId ??
                    existingProduct.itemErpId,

                  mrp,

                  priceBeforeGst,

                  gstPercent,

                  priceAfterGst,
                },
              });

            await tx.stockMovement.create({
              data: {
                companyId:
                  user.companyId,

                productId:
                  updatedProduct.id,

                /*
                 * Stock movement is stored
                 * in BASE UNITS.
                 */

                quantity:
                  addedBaseQuantity,

                type: "PURCHASE",

                priceBeforeGst,

                gstPercent,

                priceAfterGst,
              },
            });

            return updatedProduct;
          }
        );

      return NextResponse.json({
        success: true,

        action:
          "STOCK_ADDED",

        product,

        previousQuantity,

        addedQuantity:
          quantity,

        addedBaseQuantity,

        newQuantity,

        unit:
          existingProduct.unit,

        baseUnit:
          existingProduct.baseUnit,

        piecesPerUnit:
          existingConversion,
      });
    }

    /*
     * =====================================================
     * CREATE NEW PRODUCT
     * =====================================================
     *
     * Creating a product is NOT a stock purchase.
     *
     * A new product always starts with ZERO stock.
     * Actual inventory is added later through
     * "Add Stock" using the existing-product path above.
     */

    const initialBaseQuantity = 0;

    /*
     * Prevent duplicate product names
     * INSIDE THIS COMPANY ONLY.
     *
     * Another company can have the
     * exact same product name.
     */

    const existingByName =
      await prisma.product.findFirst({
        where: {
          companyId:
            user.companyId,

          name,
        },
      });

    if (existingByName) {
      return NextResponse.json(
        {
          error:
            "A product with this name already exists. Use Add Stock instead.",
        },
        {
          status: 409,
        }
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const product =
            await tx.product.create({
              data: {
                companyId:
                  user.companyId,

                name,

                itemErpId,

                /*
                 * IMPORTANT:
                 *
                 * Store stock in BASE UNIT.
                 */

                quantity:
                  initialBaseQuantity,

                unit,

                baseUnit,

                piecesPerUnit,

                mrp,

                priceBeforeGst,

                gstPercent,

                priceAfterGst,

                isActive: true,
              },
            });

          return product;
        }
      );

    return NextResponse.json(
      {
        success: true,

        action:
          "PRODUCT_CREATED",

        product: result,

        addedQuantity:
          0,

        addedBaseQuantity:
          0,

        unit,

        baseUnit,

        piecesPerUnit,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/stock error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save stock.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * =========================================================
 * PATCH
 * Activate / deactivate product
 * =========================================================
 */

export async function PATCH(
  request: Request
) {
  try {
    const user =
      await getCurrentUser();

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

    const body =
      await request.json();

    const id =
      Number(body.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid product ID.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof body.isActive !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid product status.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * IMPORTANT:
     *
     * update only if the product belongs
     * to the logged-in company.
     */

    const product =
      await prisma.product.findFirst({
        where: {
          id,

          companyId:
            user.companyId,
        },
      });

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

    const updatedProduct =
      await prisma.product.update({
        where: {
          id: product.id,
        },

        data: {
          isActive:
            body.isActive,
        },
      });

    return NextResponse.json({
      success: true,

      product:
        updatedProduct,
    });
  } catch (error) {
    console.error(
      "PATCH /api/stock error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update product status.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * =========================================================
 * DELETE
 * =========================================================
 */

export async function DELETE(
  request: Request
) {
  try {
    const user =
      await getCurrentUser();

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

    const body =
      await request.json();

    const id =
      Number(body.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid product ID.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * IMPORTANT:
     *
     * Find product using companyId.
     */

    const product =
      await prisma.product.findFirst({
        where: {
          id,

          companyId:
            user.companyId,
        },

        include: {
          stockMovements: true,

          saleItems: true,
        },
      });

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

    /*
     * Products with history should
     * never be physically deleted.
     */

    if (
      product.stockMovements
        .length > 0 ||
      product.saleItems.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "This product cannot be deleted because it has stock or billing history. Mark it inactive instead.",
        },
        {
          status: 409,
        }
      );
    }

    await prisma.product.delete({
      where: {
        id: product.id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/stock error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete product.",
      },
      {
        status: 500,
      }
    );
  }
}