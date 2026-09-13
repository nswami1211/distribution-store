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

  quantity: number;
  freeQuantity: number;

  taxableAmount: number;
  gstAmount: number;
  total: number;

  units?: ProductUnitReport[];
};

type CustomerReport = {
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

  products: ProductReport[];
};

type ReportTotals = {
  billCount: number;
  quantity: number;
  freeQuantity: number;
  taxableAmount: number;
  gstAmount: number;
  grandTotal: number;
};

type ReportData = {
  period: string;
  isCustom?: boolean;
  startDate: string;
  endDate: string;
  customers: CustomerReport[];
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

function formatQuantity(value: number) {
  const number = Number(value || 0);

  if (Number.isInteger(number)) {
    return String(number);
  }

  return number.toFixed(2);
}

function formatProductUnits(
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
  )}`;
}

export default function CustomerSalesReportPage() {
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

  const [
    selectedCustomer,
    setSelectedCustomer,
  ] =
    useState<CustomerReport | null>(
      null
    );

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
       * CUSTOM DATE REPORT
       */

      if (
        selectedPeriod === "custom"
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
          startDate > endDate
        ) {
          alert(
            "From Date cannot be after To Date."
          );

          setLoading(false);
          return;
        }

        url =
          `/api/reports/customer` +
          `?startDate=${encodeURIComponent(
            startDate
          )}` +
          `&endDate=${encodeURIComponent(
            endDate
          )}`;
      }

      /*
       * PRESET REPORT
       */

      else {
        url =
          `/api/reports/customer?period=${selectedPeriod}`;
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
            "Failed to load customer sales report."
        );
      }

      setReport(data);
      setSelectedCustomer(null);
    } catch (error) {
      console.error(
        "Customer report error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to load customer sales report."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ==================================================
   * LOAD DEFAULT REPORT
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
      newPeriod !== "custom"
    ) {
      loadReport(newPeriod);
    }
  }

  /*
   * ==================================================
   * CUSTOMER SEARCH
   * ==================================================
   */

  const filteredCustomers =
    useMemo(() => {
      if (!report) {
        return [];
      }

      const searchText =
        search
          .toLowerCase()
          .trim();

      if (!searchText) {
        return report.customers;
      }

      return report.customers.filter(
        (customer) =>
          customer.customerName
            .toLowerCase()
            .includes(searchText) ||
          (
            customer.customerPhone ||
            ""
          )
            .toLowerCase()
            .includes(searchText) ||
          (
            customer.customerGstNo ||
            ""
          )
            .toLowerCase()
            .includes(searchText) ||
          (
            customer.buyerErpId ||
            ""
          )
            .toLowerCase()
            .includes(searchText)
      );
    }, [report, search]);

  /*
   * ==================================================
   * PERIOD LABEL
   * ==================================================
   */

  const selectedPeriodLabel =
    periods.find(
      (item) =>
        item.value === period
    )?.label || "1 Month";

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
   * CSV EXPORT
   * ==================================================
   */

  function exportCsv() {
    if (!report) {
      return;
    }

    const headers = [
      "Customer",
      "Phone",
      "GST No",
      "Buyer ERP ID",
      "Bills",
      "Quantity",
      "Free Quantity",
      "Taxable Amount",
      "GST Amount",
      "Grand Total",
    ];

    const rows =
      report.customers.map(
        (customer) => [
          customer.customerName,

          customer.customerPhone ||
            "",

          customer.customerGstNo ||
            "",

          customer.buyerErpId ||
            "",

          customer.billCount,

          customer.quantity,

          customer.freeQuantity,

          customer.taxableAmount.toFixed(
            2
          ),

          customer.gstAmount.toFixed(
            2
          ),

          customer.grandTotal.toFixed(
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

    if (
      period === "custom"
    ) {
      link.download =
        `customer-sales-${startDate}-to-${endDate}.csv`;
    } else {
      link.download =
        `customer-sales-${period}.csv`;
    }

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

      <CompanyHeader pageTitle="Customer Sales Report" />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* REPORT HEADER */}

        <div className="rounded-xl bg-white p-5 shadow-sm print:shadow-none">

          <div className="flex flex-col gap-5">

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <h2 className="text-2xl font-bold text-gray-900">
                  Customer Sales Report
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

              {/* PERIOD BUTTONS */}

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
                          ? "bg-blue-600 text-white"
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

            {/* CUSTOM DATE */}

            {period ===
              "custom" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 print:hidden">

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
                  className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
            Loading sales report...
          </div>

        ) : !report ? (

          <div className="mt-6 rounded-xl bg-white px-5 py-20 text-center text-red-600">
            Failed to load report.
          </div>

        ) : (

          <>

            {/* SUMMARY CARDS */}

            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-6">

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  Customers
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {
                    report
                      .customers
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
                Search Customer
              </label>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search by customer name, phone, GST or ERP ID..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />

            </div>

            {/* CUSTOMER TABLE */}

            <div className="mt-6 rounded-xl bg-white shadow-sm">

              <div className="border-b px-5 py-4">

                <h2 className="text-lg font-semibold text-gray-900">
                  Customer-wise Sales
                </h2>

                <p className="text-sm text-gray-500">
                  {
                    selectedPeriodLabel
                  }
                </p>

              </div>

              {filteredCustomers.length ===
              0 ? (

                <div className="px-5 py-16 text-center text-gray-500">
                  No customer sales found.
                </div>

              ) : (

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[1000px] text-left text-sm">

                    <thead className="bg-gray-50">

                      <tr>

                        <th className="px-5 py-3">
                          Customer
                        </th>

                        <th className="px-5 py-3">
                          Bills
                        </th>

                        <th className="px-5 py-3">
                          Quantity
                        </th>

                        <th className="px-5 py-3">
                          Free
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

                        <th className="px-5 py-3 print:hidden">
                          Action
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y">

                      {filteredCustomers.map(
                        (customer) => (

                          <tr
                            key={`${customer.customerName}-${customer.customerPhone || "walkin"}`}
                            className="hover:bg-gray-50"
                          >

                            <td className="px-5 py-4">

                              <p className="font-semibold text-gray-900">
                                {
                                  customer.customerName
                                }
                              </p>

                              {customer.customerPhone && (
                                <p className="text-xs text-gray-500">
                                  {
                                    customer.customerPhone
                                  }
                                </p>
                              )}

                              {customer.customerGstNo && (
                                <p className="text-xs text-gray-500">
                                  GST:{" "}
                                  {
                                    customer.customerGstNo
                                  }
                                </p>
                              )}

                            </td>

                            <td className="px-5 py-4">
                              {
                                customer.billCount
                              }
                            </td>

                            <td className="px-5 py-4">
                              {
                                customer.quantity
                              }
                            </td>

                            <td className="px-5 py-4">
                              {
                                customer.freeQuantity
                              }
                            </td>

                            <td className="px-5 py-4">
                              {money(
                                customer.taxableAmount
                              )}
                            </td>

                            <td className="px-5 py-4">
                              {money(
                                customer.gstAmount
                              )}
                            </td>

                            <td className="px-5 py-4 font-bold text-green-600">
                              {money(
                                customer.grandTotal
                              )}
                            </td>

                            <td className="px-5 py-4 print:hidden">

                              <button
                                onClick={() =>
                                  setSelectedCustomer(
                                    customer
                                  )
                                }
                                className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-600 hover:bg-blue-100"
                              >
                                View
                              </button>

                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                    {/* TOTAL */}

                    <tfoot className="border-t-2 border-gray-900 bg-gray-50 font-bold">

                      <tr>

                        <td className="px-5 py-4">
                          TOTAL
                        </td>

                        <td className="px-5 py-4">
                          {
                            report
                              .totals
                              .billCount
                          }
                        </td>

                        <td className="px-5 py-4">
                          {
                            report
                              .totals
                              .quantity
                          }
                        </td>

                        <td className="px-5 py-4">
                          {
                            report
                              .totals
                              .freeQuantity
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

                        <td className="px-5 py-4 print:hidden" />

                      </tr>

                    </tfoot>

                  </table>

                </div>

              )}

            </div>

            {/* CUSTOMER DETAIL */}

            {selectedCustomer && (

              <div className="mt-6 rounded-xl bg-white shadow-sm">

                <div className="flex items-center justify-between border-b px-5 py-4">

                  <div>

                    <h2 className="text-lg font-bold text-gray-900">
                      {
                        selectedCustomer.customerName
                      }
                    </h2>

                    <p className="text-sm text-gray-500">
                      Product-wise sales
                    </p>

                  </div>

                  <button
                    onClick={() =>
                      setSelectedCustomer(
                        null
                      )
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 print:hidden"
                  >
                    Close
                  </button>

                </div>

                {/* CUSTOMER INFO */}

                <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">

                  <div>

                    <p className="text-xs text-gray-500">
                      Phone
                    </p>

                    <p className="font-semibold">
                      {
                        selectedCustomer.customerPhone ||
                        "-"
                      }
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-gray-500">
                      GST
                    </p>

                    <p className="font-semibold">
                      {
                        selectedCustomer.customerGstNo ||
                        "-"
                      }
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-gray-500">
                      Bills
                    </p>

                    <p className="font-semibold">
                      {
                        selectedCustomer.billCount
                      }
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-gray-500">
                      Quantity
                    </p>

                    <p className="font-semibold">
                      {
                        selectedCustomer.quantity
                      }
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-gray-500">
                      Free Quantity
                    </p>

                    <p className="font-semibold">
                      {
                        selectedCustomer.freeQuantity
                      }
                    </p>

                  </div>

                </div>

                {/* PRODUCT TABLE */}

                <div className="overflow-x-auto px-5 pb-5">

                  <table className="w-full min-w-[900px] text-left text-sm">

                    <thead className="bg-gray-50">

                      <tr>

                        <th className="px-4 py-3">
                          Product
                        </th>

                        <th className="px-4 py-3">
                          Units Sold
                        </th>

                        <th className="px-4 py-3">
                          Taxable
                        </th>

                        <th className="px-4 py-3">
                          GST
                        </th>

                        <th className="px-4 py-3">
                          Total
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y">

                      {selectedCustomer.products.map(
                        (product) => (

                          <tr
                            key={
                              product.productId
                            }
                          >

                            <td className="px-4 py-3 font-medium align-top">
                              {
                                product.productName
                              }
                            </td>

                            <td className="px-4 py-3 align-top">

                              {product.units &&
                              product.units.length >
                                0 ? (

                                <div className="space-y-2">

                                  {product.units.map(
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
                                  )}

                                </div>

                              ) : (

                                <div className="font-medium">
                                  {
                                    formatProductUnits(
                                      product
                                    )
                                  }
                                </div>

                              )}

                            </td>

                            <td className="px-4 py-3 align-top">
                              {money(
                                product.taxableAmount
                              )}
                            </td>

                            <td className="px-4 py-3 align-top">
                              {money(
                                product.gstAmount
                              )}
                            </td>

                            <td className="px-4 py-3 font-bold align-top">
                              {money(
                                product.total
                              )}
                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            )}

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

          body {
            color: black !important;
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