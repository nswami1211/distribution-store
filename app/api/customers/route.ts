import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

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
        user: true,
      },
    });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  if (!session.user.isActive) {
    return null;
  }

  return session.user;
}

/*
 * =========================================================
 * GET CUSTOMERS
 * =========================================================
 */

export async function GET(
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

    const { searchParams } =
      new URL(request.url);

    const search =
      searchParams
        .get("search")
        ?.trim() || "";

    const customers =
      await prisma.customer.findMany({
        where: {
          companyId:
            user.companyId,

          ...(search
            ? {
                OR: [
                  {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    phone: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    gstNo: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    buyerErpId: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                ],
              }
            : {}),
        },

        orderBy: {
          name: "asc",
        },
      });

    return NextResponse.json(
      customers
    );
  } catch (error) {
    console.error(
      "GET /api/customers error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load customers.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * =========================================================
 * POST CUSTOMER
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

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : "";

    const address =
      typeof body.address === "string"
        ? body.address.trim()
        : "";

    const gstNo =
      typeof body.gstNo === "string"
        ? body.gstNo.trim().toUpperCase()
        : "";

    const panNo =
      typeof body.panNo === "string"
        ? body.panNo.trim().toUpperCase()
        : "";

    const buyerErpId =
      typeof body.buyerErpId === "string"
        ? body.buyerErpId.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Customer name is required.",
        },
        {
          status: 400,
        }
      );
    }

    const customer =
      await prisma.customer.create({
        data: {
          companyId:
            user.companyId,

          name,

          phone:
            phone || null,

          address:
            address || null,

          gstNo:
            gstNo || null,

          panNo:
            panNo || null,

          buyerErpId:
            buyerErpId || null,
        },
      });

    return NextResponse.json(
      {
        success: true,
        customer,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/customers error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create customer.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * =========================================================
 * PUT CUSTOMER
 * =========================================================
 */

export async function PUT(
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
            "Invalid customer ID.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * IMPORTANT:
     * Find customer using BOTH
     * id and companyId.
     */

    const existingCustomer =
      await prisma.customer.findFirst({
        where: {
          id,

          companyId:
            user.companyId,
        },
      });

    if (!existingCustomer) {
      return NextResponse.json(
        {
          error:
            "Customer not found.",
        },
        {
          status: 404,
        }
      );
    }

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Customer name is required.",
        },
        {
          status: 400,
        }
      );
    }

    const customer =
      await prisma.customer.update({
        where: {
          id:
            existingCustomer.id,
        },

        data: {
          name,

          phone:
            typeof body.phone ===
            "string"
              ? body.phone.trim() ||
                null
              : null,

          address:
            typeof body.address ===
            "string"
              ? body.address.trim() ||
                null
              : null,

          gstNo:
            typeof body.gstNo ===
            "string"
              ? body.gstNo
                  .trim()
                  .toUpperCase() ||
                null
              : null,

          panNo:
            typeof body.panNo ===
            "string"
              ? body.panNo
                  .trim()
                  .toUpperCase() ||
                null
              : null,

          buyerErpId:
            typeof body.buyerErpId ===
            "string"
              ? body.buyerErpId.trim() ||
                null
              : null,
        },
      });

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error(
      "PUT /api/customers error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update customer.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * =========================================================
 * DELETE CUSTOMER
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
            "Invalid customer ID.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Only this company's customer
     * can be deleted.
     */

    const customer =
      await prisma.customer.findFirst({
        where: {
          id,

          companyId:
            user.companyId,
        },
      });

    if (!customer) {
      return NextResponse.json(
        {
          error:
            "Customer not found.",
        },
        {
          status: 404,
        }
      );
    }

    await prisma.customer.delete({
      where: {
        id: customer.id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/customers error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete customer.",
      },
      {
        status: 500,
      }
    );
  }
}