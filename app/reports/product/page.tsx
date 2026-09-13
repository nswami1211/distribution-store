"use client";

import { useEffect, useMemo, useState } from "react";
import CompanyHeader from "@/app/components/CompanyHeader";

type Period =
  | "1m"
  | "3m"
  | "6m"
  | "1y"
  | "custom";

type ProductUnitReport = {
  unit: string;
  quantity: number;
  freeQuantity: number;
};

type ProductReport = {
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

  units?: ProductUnitReport[];
};

type ReportTotals = {
  quantity: number;
  freeQuantity: number;
  taxableAmount: number;
  gstAmount: number;
  grandTotal: number;
  billCount: number;
};

type ReportData = {
  period: string;
  startDate: string;
  endDate: string;
  isCustom?: boolean;
  products: ProductReport[];
  totals: ReportTotals;
};

const periods: {
  value: Period;
  label: string;
}[] = [
  {
    value: "1m",
    label: "1 Month",
  },
  {
    value: "3m",
    label: "3 Months",
  },
  {
    value: "6m",
    label: "6 Months",
  },
  {
    value: "1y",
    label: "1 Year",
  },
  {
    value: "custom",
    label: "Custom",
  },
];

function money(value: number) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function numberValue(value: number) {
  return Number(value || 0);
}

function formatQuantity(value: number) {
  const number = numberValue(value);

  if (Number.isInteger(number)) {
    return String(number);
  }

  return number.toFixed(2);
}

function formatUnits(
  product: ProductReport
) {
  if (
    product.units &&
    product.units.length > 0
  ) {
    return product.units
      .map((unitData) => {
        const paid =
          `${formatQuantity(
            unitData.quantity
          )} ${unitData.unit}`;

        const free =
          unitData.freeQuantity > 0
            ? ` + Free ${formatQuantity(
                unitData.freeQuantity
              )} ${unitData.unit}`
            : "";

        return paid + free;
      })
      .join("; ");
  }

  return `${formatQuantity(
    product.quantity
  )} ${product.unit}`;
}

export default function ProductSalesReportPage() {
  const [period, setPeriod] =
    useState<Period>("1m");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [report, setReport] =
    useState<ReportData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  /*
   * ==================================================
   * LOAD REPORT
   * ==================================================
   */

  async function loadReport(
    selectedPeriod: Period
  ) {
    try {
      setLoading(true);

      let url = "";

      /*
       * CUSTOM DATE
       */

      if (
        selectedPeriod ===
        "custom"
      ) {
        if (
          !startDate ||
          !endDate
        ) {
          alert(
            "Please select both From Date and To Date."
          );

          setLoading(false);
          return;
        }

        if (
          startDate >
          endDate
        ) {
          alert(
            "From Date cannot be after To Date."
          );

          setLoading(false);
          return;
        }

        url =
          `/api/reports/product` +
          `?startDate=${encodeURIComponent(
            startDate
          )}` +
          `&endDate=${encodeURIComponent(
            endDate
          )}`;
      }

      /*
       * PRESET PERIOD
       */

      else {
        url =
          `/api/reports/product?period=${selectedPeriod}`;
      }

      const response =
        await fetch(url, {
          cache: "no-store",
        });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load product sales report."
        );
      }

      setReport(data);
    } catch (error) {
      console.error(
        "Product report error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to load product sales report."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ==================================================
   * DEFAULT REPORT
   * ==================================================
   */

  useEffect(() => {
    loadReport("1m");
  }, []);

  /*
   * ==================================================
   * PERIOD CHANGE
   * ==================================================
   */

  function changePeriod(
    newPeriod: Period
  ) {
    setPeriod(newPeriod);

    if (
      newPeriod !==
      "custom"
    ) {
      loadReport(newPeriod);
    }
  }

  /*
   * ==================================================
   * SEARCH PRODUCTS
   * ==================================================
   */

  const filteredProducts =
    useMemo(() => {
      if (!report) {
        return [];
      }

      const searchText =
        search
          .toLowerCase()
          .trim();

      if (!searchText) {
        return report.products;
      }

      return report.products.filter(
        (product) =>
          product.productName
            .toLowerCase()
            .includes(searchText) ||
          (
            product.itemErpId ||
            ""
          )
            .toLowerCase()
            .includes(searchText)
      );
    }, [report, search]);

  /*
   * ==================================================
   * PRINT
   * ==================================================
   */

  function printReport() {
    window.print();
  }

  /*
   * ==================================================
   * EXPORT CSV
   * ==================================================
   */

  function exportCsv() {
    if (!report) {
      return;
    }

    const headers = [
      "Product",
      "ERP ID",
      "Units Sold",
      "Bills",
      "Taxable Amount",
      "GST Amount",
      "Grand Total",
    ];

    const rows =
      report.products.map(
        (product) => [
          product.productName,

          product.itemErpId ||
            "",

          formatUnits(
            product
          ),

          product.billCount,

          product.taxableAmount.toFixed(
            2
          ),

          product.gstAmount.toFixed(
            2
          ),

          product.grandTotal.toFixed(
            2
          ),
        ]
      );

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => {
            const text =
              String(value);

            return `"${text.replace(
              /"/g,
              '""'
            )}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob =
      new Blob([csv], {
        type:
          "text/csv;charset=utf-8;",
      });

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      period === "custom"
        ? `product-sales-${startDate}-to-${endDate}.csv`
        : `product-sales-${period}.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      url
    );
  }

  /*
   * ==================================================
   * PAGE
   * ==================================================
   */

  return (
    <main className="min-h-screen bg-gray-100">

      {/* HEADER */}

        <CompanyHeader pageTitle="Product Sales Report" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* TITLE */}

        <div className="rounded-xl bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-5">

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <h2 className="text-2xl font-bold text-gray-900">
                  Product Sales Report
                </h2>

                {report && (
                  <p className="mt-1 text-sm text-gray-500">
                    {new Date(
                      report.startDate
                    ).toLocaleDateString(
                      "en-IN"
                    )}

                    {" - "}

                    {new Date(
                      report.endDate
                    ).toLocaleDateString(
                      "en-IN"
                    )}
                  </p>
                )}

              </div>

              {/* BUTTONS */}

              <div className="flex flex-wrap gap-2 print:hidden">

                {periods.map(
                  (item) => (
                    <button
                      key={
                        item.value
                      }
                      onClick={() =>
                        changePeriod(
                          item.value
                        )
                      }
                      className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                        period ===
                        item.value
                          ? "bg-purple-600 text-white"
                          : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {
                        item.label
                      }
                    </button>
                  )
                )}

                <button
                  onClick={
                    exportCsv
                  }
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  ↓ Export CSV
                </button>

                <button
                  onClick={
                    printReport
                  }
                  className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900"
                >
                  🖨️ Print
                </button>

              </div>

            </div>

            {/* CUSTOM DATES */}

            {period ===
              "custom" && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 print:hidden">

                <div className="grid gap-4 sm:grid-cols-2">

                  <div>

                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      From Date
                    </label>

                    <input
                      type="date"
                      value={
                        startDate
                      }
                      onChange={(
                        e
                      ) =>
                        setStartDate(
                          e.target
                            .value
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5"
                    />

                  </div>

                  <div>

                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      To Date
                    </label>

                    <input
                      type="date"
                      value={
                        endDate
                      }
                      onChange={(
                        e
                      ) =>
                        setEndDate(
                          e.target
                            .value
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5"
                    />

                  </div>

                </div>

                <button
                  onClick={() =>
                    loadReport(
                      "custom"
                    )
                  }
                  disabled={
                    !startDate ||
                    !endDate ||
                    loading
                  }
                  className="mt-4 rounded-lg bg-purple-600 px-5 py-2.5 font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading
                    ? "Generating..."
                    : "Generate Report"}
                </button>

              </div>
            )}

          </div>

        </div>

        {/* LOADING */}

        {loading ? (

          <div className="mt-6 rounded-xl bg-white px-5 py-20 text-center text-gray-500">
            Loading product sales report...
          </div>

        ) : !report ? (

          <div className="mt-6 rounded-xl bg-white px-5 py-20 text-center text-red-600">
            Failed to load report.
          </div>

        ) : (

          <>

            {/* SUMMARY */}

            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-6">

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  Products
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {
                    report
                      .products
                      .length
                  }
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  Bills
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {
                    report
                      .totals
                      .billCount
                  }
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  Quantity
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {
                    report
                      .totals
                      .quantity
                  }
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  Free Quantity
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {
                    report
                      .totals
                      .freeQuantity
                  }
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  GST
                </p>

                <p className="mt-2 text-2xl font-bold text-orange-600">
                  {money(
                    report
                      .totals
                      .gstAmount
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  Total Sales
                </p>

                <p className="mt-2 text-2xl font-bold text-green-600">
                  {money(
                    report
                      .totals
                      .grandTotal
                  )}
                </p>
              </div>

            </div>

            {/* SEARCH */}

            <div className="mt-6 rounded-xl bg-white p-5 shadow-sm print:hidden">

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Search Product
              </label>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search product name or ERP ID..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-purple-500"
              />

            </div>

            {/* TABLE */}

            <div className="mt-6 rounded-xl bg-white shadow-sm">

              <div className="border-b px-5 py-4">

                <h2 className="text-lg font-semibold text-gray-900">
                  Product-wise Sales
                </h2>

              </div>

              {filteredProducts.length ===
              0 ? (

                <div className="px-5 py-16 text-center text-gray-500">
                  No product sales found.
                </div>

              ) : (

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[1050px] text-left text-sm">

                    <thead className="bg-gray-50">

                      <tr>

                        <th className="px-5 py-3">
                          #
                        </th>

                        <th className="px-5 py-3">
                          Product
                        </th>

                        <th className="px-5 py-3">
                          ERP ID
                        </th>

                        <th className="px-5 py-3">
                          Units Sold
                        </th>

                        <th className="px-5 py-3">
                          Bills
                        </th>

                        <th className="px-5 py-3">
                          Taxable
                        </th>

                        <th className="px-5 py-3">
                          GST
                        </th>

                        <th className="px-5 py-3">
                          Grand Total
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y">

                      {filteredProducts.map(
                        (
                          product,
                          index
                        ) => (

                          <tr
                            key={
                              product.productId
                            }
                            className="hover:bg-gray-50"
                          >

                            <td className="px-5 py-4 align-top">
                              {index + 1}
                            </td>

                            <td className="px-5 py-4 align-top">

                              <p className="font-semibold text-gray-900">
                                {
                                  product.productName
                                }
                              </p>

                            </td>

                            <td className="px-5 py-4 align-top text-gray-600">
                              {
                                product.itemErpId ||
                                "-"
                              }
                            </td>

                            <td className="px-5 py-4 align-top">

                              <div className="space-y-2">

                                {product.units &&
                                product.units.length >
                                  0 ? (

                                  product.units.map(
                                    (
                                      unitData
                                    ) => (

                                      <div
                                        key={
                                          unitData.unit
                                        }
                                        className="rounded-lg bg-gray-50 px-3 py-2"
                                      >

                                        <div className="font-semibold text-gray-900">
                                          {
                                            formatQuantity(
                                              unitData.quantity
                                            )
                                          }{" "}
                                          {
                                            unitData.unit
                                          }
                                        </div>

                                        {unitData.freeQuantity >
                                          0 && (
                                          <div className="text-xs text-orange-600">
                                            Free:{" "}
                                            {
                                              formatQuantity(
                                                unitData.freeQuantity
                                              )
                                            }{" "}
                                            {
                                              unitData.unit
                                            }
                                          </div>
                                        )}

                                      </div>

                                    )
                                  )

                                ) : (

                                  <div className="font-medium">
                                    {
                                      formatQuantity(
                                        product.quantity
                                      )
                                    }{" "}
                                    {
                                      product.unit
                                    }
                                  </div>

                                )}

                              </div>

                            </td>

                            <td className="px-5 py-4 align-top">
                              {
                                product.billCount
                              }
                            </td>

                            <td className="px-5 py-4 align-top">
                              {money(
                                product.taxableAmount
                              )}
                            </td>

                            <td className="px-5 py-4 align-top">
                              {money(
                                product.gstAmount
                              )}
                            </td>

                            <td className="px-5 py-4 align-top font-bold text-green-600">
                              {money(
                                product.grandTotal
                              )}
                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                    {/* TOTAL */}

                    <tfoot className="border-t-2 border-gray-900 bg-gray-50 font-bold">

                      <tr>

                        <td
                          colSpan={3}
                          className="px-5 py-4"
                        >
                          TOTAL
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-1">

                            <div>
                              Total Qty:{" "}
                              {
                                report
                                  .totals
                                  .quantity
                              }
                            </div>

                            <div>
                              Total Free:{" "}
                              {
                                report
                                  .totals
                                  .freeQuantity
                              }
                            </div>

                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {
                            report
                              .totals
                              .billCount
                          }
                        </td>

                        <td className="px-5 py-4">
                          {money(
                            report
                              .totals
                              .taxableAmount
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {money(
                            report
                              .totals
                              .gstAmount
                          )}
                        </td>

                        <td className="px-5 py-4 text-green-600">
                          {money(
                            report
                              .totals
                              .grandTotal
                          )}
                        </td>

                      </tr>

                    </tfoot>

                  </table>

                </div>

              )}

            </div>

          </>

        )}

      </div>

      {/* PRINT CSS */}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          html,
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>

    </main>
  );
}