import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/*
 * PUT
 * Update customer
 */
export async function PUT(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const customerId = Number(id);

    if (
      !Number.isInteger(customerId) ||
      customerId <= 0
    ) {
      return NextResponse.json(
        {
          error: "Invalid customer ID.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const {
      name,
      phone,
      address,
      gstNo,
      panNo,
      buyerErpId,
    } = body;

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Customer name is required.",
        },
        { status: 400 }
      );
    }

    const customer =
      await prisma.customer.update({
        where: {
          id: customerId,
        },

        data: {
          name: name.trim(),

          phone:
            typeof phone === "string" &&
            phone.trim()
              ? phone.trim()
              : null,

          address:
            typeof address === "string" &&
            address.trim()
              ? address.trim()
              : null,

          gstNo:
            typeof gstNo === "string" &&
            gstNo.trim()
              ? gstNo.trim()
              : null,

          panNo:
            typeof panNo === "string" &&
            panNo.trim()
              ? panNo.trim()
              : null,

          buyerErpId:
            typeof buyerErpId === "string" &&
            buyerErpId.trim()
              ? buyerErpId.trim()
              : null,
        },
      });

    return NextResponse.json(
      {
        success: true,
        customer,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "PUT /api/customers/[id] error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update customer.",
      },
      { status: 500 }
    );
  }
}

/*
 * DELETE
 * Permanently delete customer
 */
export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const customerId = Number(id);

    if (
      !Number.isInteger(customerId) ||
      customerId <= 0
    ) {
      return NextResponse.json(
        {
          error: "Invalid customer ID.",
        },
        { status: 400 }
      );
    }

    await prisma.customer.delete({
      where: {
        id: customerId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Customer deleted successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "DELETE /api/customers/[id] error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete customer.",
      },
      { status: 500 }
    );
  }
}