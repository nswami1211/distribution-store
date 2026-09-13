"use client";

import { useEffect, useMemo, useState } from "react";
import CompanyHeader from "@/app/components/CompanyHeader";

type Period =
  | "1m"
  | "3m"
  | "6m"
  | "1y"
  | "custom";

type SaleProduct = {
  productId: number;
  productName: string;
  itemErpId: string | null;

  unit: string;

  quantity: number;
  freeQuantity: number;

  mrp: number;
  priceBeforeGst: number;
  gstPercent: number;

  taxableValue: number;
  gstAmount: number;
  total: number;
};

type SaleReport = {
  id: number;
  invoiceNo: string | null;

  customerName: string | null;
  customerPhone: string | null;

  salesmanName: string | null;
  routeName: string | null;

  paymentMethod: string | null;

  subtotal: number;
  gstAmount: number;
  grandTotal: number;

  createdAt: string;

  totalQuantity: number;
  totalFreeQuantity: number;

  productCount: number;

  products: SaleProduct[];
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
  startDate: string;
  endDate: string;
  isCustom?: boolean;

  sales: SaleReport[];

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

function quantity(value: number) {
  const number = Number(value || 0);

  if (Number.isInteger(number)) {
    return String(number);
  }

  return number.toFixed(2);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

export default function ActualSalesReportPage() {
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
    selectedSale,
    setSelectedSale,
  ] = useState<SaleReport | null>(
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
       * CUSTOM DATE
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
          `/api/reports/sales` +
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
          `/api/reports/sales?period=${selectedPeriod}`;
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
            "Failed to load sales report."
        );
      }

      setReport(data);

      setSelectedSale(null);
    } catch (error) {
      console.error(
        "Sales report error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to load sales report."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ==================================================
   * INITIAL LOAD
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
   * SEARCH
   * ==================================================
   */

  const filteredSales =
    useMemo(() => {
      if (!report) {
        return [];
      }

      const searchText =
        search
          .toLowerCase()
          .trim();

      if (!searchText) {
        return report.sales;
      }

      return report.sales.filter(
        (sale) => {
          const customer =
            (
              sale.customerName ||
              ""
            ).toLowerCase();

          const phone =
            (
              sale.customerPhone ||
              ""
            ).toLowerCase();

          const invoice =
            (
              sale.invoiceNo ||
              ""
            ).toLowerCase();

          const salesman =
            (
              sale.salesmanName ||
              ""
            ).toLowerCase();

          const route =
            (
              sale.routeName ||
              ""
            ).toLowerCase();

          const products =
            sale.products
              .map(
                (product) =>
                  product.productName
              )
              .join(" ")
              .toLowerCase();

          return (
            customer.includes(
              searchText
            ) ||
            phone.includes(
              searchText
            ) ||
            invoice.includes(
              searchText
            ) ||
            salesman.includes(
              searchText
            ) ||
            route.includes(
              searchText
            ) ||
            products.includes(
              searchText
            )
          );
        }
      );
    }, [report, search]);

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
      "Invoice No",
      "Date",
      "Customer",
      "Phone",
      "Salesman",
      "Route",
      "Payment",
      "Products",
      "Quantity",
      "Free Quantity",
      "Taxable Amount",
      "GST Amount",
      "Grand Total",
    ];

    const rows =
      report.sales.map(
        (sale) => {
          const products =
            sale.products
              .map((product) => {
                const free =
                  product.freeQuantity >
                  0
                    ? `, Free ${quantity(
                        product.freeQuantity
                      )} ${product.unit}`
                    : "";

                return `${product.productName}: ${quantity(
                  product.quantity
                )} ${product.unit}${free}`;
              })
              .join(" | ");

          return [
            sale.invoiceNo ||
              sale.id,

            formatDateTime(
              sale.createdAt
            ),

            sale.customerName ||
              "Walk-in Customer",

            sale.customerPhone ||
              "",

            sale.salesmanName ||
              "",

            sale.routeName ||
              "",

            sale.paymentMethod ||
              "",

            products,

            sale.totalQuantity,

            sale.totalFreeQuantity,

            sale.subtotal.toFixed(
              2
            ),

            sale.gstAmount.toFixed(
              2
            ),

            sale.grandTotal.toFixed(
              2
            ),
          ];
        }
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
        ? `sales-${startDate}-to-${endDate}.csv`
        : `sales-${period}.csv`;

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
   * PRINT
   * ==================================================
   */

  function printReport() {
    window.print();
  }

  /*
   * ==================================================
   * PAGE
   * ==================================================
   */

  return (
    <main className="min-h-screen bg-gray-100">

      {/* HEADER */}

      <CompanyHeader pageTitle="Actual Sales Report" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* REPORT CONTROLS */}

        <div className="rounded-xl bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-5">

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <h2 className="text-2xl font-bold text-gray-900">
                  Actual Sales Report
                </h2>

                {report && (
                  <p className="mt-1 text-sm text-gray-500">
                    {formatDate(
                      report.startDate
                    )}
                    {" - "}
                    {formatDate(
                      report.endDate
                    )}
                  </p>
                )}

              </div>

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
                          ? "bg-green-600 text-white"
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
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
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
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 print:hidden">

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
                  className="mt-4 rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
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
            Failed to load sales report.
          </div>

        ) : (

          <>

            {/* SUMMARY */}

            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-6">

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
                  Taxable
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {money(
                    report
                      .totals
                      .taxableAmount
                  )}
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
                  Grand Total
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
                Search Sales
              </label>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search invoice, customer, phone, salesman, route or product..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500"
              />

            </div>

            {/* SALES TABLE */}

            <div className="mt-6 rounded-xl bg-white shadow-sm">

              <div className="border-b px-5 py-4">

                <h2 className="text-lg font-semibold text-gray-900">
                  Actual Sales
                </h2>

              </div>

              {filteredSales.length ===
              0 ? (

                <div className="px-5 py-16 text-center text-gray-500">
                  No sales found.
                </div>

              ) : (

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[1200px] text-left text-sm">

                    <thead className="bg-gray-50">

                      <tr>

                        <th className="px-5 py-3">
                          Invoice
                        </th>

                        <th className="px-5 py-3">
                          Date
                        </th>

                        <th className="px-5 py-3">
                          Customer
                        </th>

                        <th className="px-5 py-3">
                          Products
                        </th>

                        <th className="px-5 py-3">
                          Payment
                        </th>

                        <th className="px-5 py-3">
                          Taxable
                        </th>

                        <th className="px-5 py-3">
                          GST
                        </th>

                        <th className="px-5 py-3">
                          Total
                        </th>

                        <th className="px-5 py-3 print:hidden">
                          Action
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y">

                      {filteredSales.map(
                        (sale) => (

                          <tr
                            key={
                              sale.id
                            }
                            className="align-top hover:bg-gray-50"
                          >

                            {/* INVOICE */}

                            <td className="px-5 py-4">

                              <p className="font-semibold text-gray-900">
                                {
                                  sale.invoiceNo ||
                                  `#${sale.id}`
                                }
                              </p>

                            </td>

                            {/* DATE */}

                            <td className="px-5 py-4 whitespace-nowrap">

                              <p className="font-medium text-gray-900">
                                {formatDate(
                                  sale.createdAt
                                )}
                              </p>

                              <p className="text-xs text-gray-500">
                                {new Date(
                                  sale.createdAt
                                ).toLocaleTimeString(
                                  "en-IN",
                                  {
                                    hour: "2-digit",
                                    minute:
                                      "2-digit",
                                  }
                                )}
                              </p>

                            </td>

                            {/* CUSTOMER */}

                            <td className="px-5 py-4">

                              <p className="font-semibold text-gray-900">
                                {
                                  sale.customerName ||
                                  "Walk-in Customer"
                                }
                              </p>

                              {sale.customerPhone && (
                                <p className="text-xs text-gray-500">
                                  {
                                    sale.customerPhone
                                  }
                                </p>
                              )}

                              {sale.salesmanName && (
                                <p className="mt-1 text-xs text-gray-500">
                                  Salesman:{" "}
                                  {
                                    sale.salesmanName
                                  }
                                </p>
                              )}

                            </td>

                            {/* PRODUCTS */}

                            <td className="px-5 py-4">

                              <div className="space-y-2">

                                {sale.products.map(
                                  (
                                    product,
                                    index
                                  ) => (

                                    <div
                                      key={`${product.productId}-${index}`}
                                      className="rounded-lg bg-gray-50 px-3 py-2"
                                    >

                                      <p className="font-semibold text-gray-900">
                                        {
                                          product.productName
                                        }
                                      </p>

                                      <p className="text-sm text-gray-700">
                                        {
                                          quantity(
                                            product.quantity
                                          )
                                        }{" "}
                                        {
                                          product.unit
                                        }
                                      </p>

                                      {product.freeQuantity >
                                        0 && (
                                        <p className="text-xs font-medium text-orange-600">
                                          Free:{" "}
                                          {
                                            quantity(
                                              product.freeQuantity
                                            )
                                          }{" "}
                                          {
                                            product.unit
                                          }
                                        </p>
                                      )}

                                    </div>

                                  )
                                )}

                              </div>

                            </td>

                            {/* PAYMENT */}

                            <td className="px-5 py-4">

                              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                                {
                                  sale.paymentMethod ||
                                  "-"
                                }
                              </span>

                            </td>

                            {/* TAXABLE */}

                            <td className="px-5 py-4 whitespace-nowrap">
                              {money(
                                sale.subtotal
                              )}
                            </td>

                            {/* GST */}

                            <td className="px-5 py-4 whitespace-nowrap">
                              {money(
                                sale.gstAmount
                              )}
                            </td>

                            {/* TOTAL */}

                            <td className="px-5 py-4 whitespace-nowrap font-bold text-green-600">
                              {money(
                                sale.grandTotal
                              )}
                            </td>

                            {/* ACTION */}

                            <td className="px-5 py-4 print:hidden">

                              <button
                                onClick={() =>
                                  setSelectedSale(
                                    sale
                                  )
                                }
                                className="rounded-lg bg-green-50 px-3 py-2 font-semibold text-green-700 hover:bg-green-100"
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

                        <td
                          colSpan={4}
                          className="px-5 py-4"
                        >
                          TOTAL
                        </td>

                        <td className="px-5 py-4">
                          -
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

            {/* SALE DETAILS */}

            {selectedSale && (

              <div className="mt-6 rounded-xl bg-white shadow-sm">

                <div className="flex items-center justify-between border-b px-5 py-4">

                  <div>

                    <h2 className="text-lg font-bold text-gray-900">
                      Invoice{" "}
                      {
                        selectedSale.invoiceNo ||
                        `#${selectedSale.id}`
                      }
                    </h2>

                    <p className="text-sm text-gray-500">
                      {
                        formatDateTime(
                          selectedSale.createdAt
                        )
                      }
                    </p>

                  </div>

                  <button
                    onClick={() =>
                      setSelectedSale(
                        null
                      )
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 print:hidden"
                  >
                    Close
                  </button>

                </div>

                {/* CUSTOMER INFO */}

                <div className="grid gap-4 border-b p-5 sm:grid-cols-2 lg:grid-cols-4">

                  <div>

                    <p className="text-xs text-gray-500">
                      Customer
                    </p>

                    <p className="font-semibold">
                      {
                        selectedSale.customerName ||
                        "Walk-in Customer"
                      }
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-gray-500">
                      Phone
                    </p>

                    <p className="font-semibold">
                      {
                        selectedSale.customerPhone ||
                        "-"
                      }
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-gray-500">
                      Salesman
                    </p>

                    <p className="font-semibold">
                      {
                        selectedSale.salesmanName ||
                        "-"
                      }
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-gray-500">
                      Payment
                    </p>

                    <p className="font-semibold">
                      {
                        selectedSale.paymentMethod ||
                        "-"
                      }
                    </p>

                  </div>

                </div>

                {/* PRODUCTS */}

                <div className="overflow-x-auto p-5">

                  <table className="w-full min-w-[900px] text-left text-sm">

                    <thead className="bg-gray-50">

                      <tr>

                        <th className="px-4 py-3">
                          Product
                        </th>

                        <th className="px-4 py-3">
                          Qty
                        </th>

                        <th className="px-4 py-3">
                          Free
                        </th>

                        <th className="px-4 py-3">
                          Price
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

                      {selectedSale.products.map(
                        (
                          product,
                          index
                        ) => (

                          <tr
                            key={`${product.productId}-${index}`}
                          >

                            <td className="px-4 py-3">

                              <p className="font-semibold">
                                {
                                  product.productName
                                }
                              </p>

                              {product.itemErpId && (
                                <p className="text-xs text-gray-500">
                                  ERP:{" "}
                                  {
                                    product.itemErpId
                                  }
                                </p>
                              )}

                            </td>

                            <td className="px-4 py-3 font-medium">
                              {
                                quantity(
                                  product.quantity
                                )
                              }{" "}
                              {
                                product.unit
                              }
                            </td>

                            <td className="px-4 py-3 text-orange-600">
                              {product.freeQuantity >
                              0
                                ? `${quantity(
                                    product.freeQuantity
                                  )} ${
                                    product.unit
                                  }`
                                : "-"}
                            </td>

                            <td className="px-4 py-3">
                              {money(
                                product.priceBeforeGst
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {money(
                                product.gstAmount
                              )}
                            </td>

                            <td className="px-4 py-3 font-bold">
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

                {/* TOTALS */}

                <div className="border-t bg-gray-50 p-5">

                  <div className="ml-auto max-w-sm space-y-2">

                    <div className="flex justify-between">
                      <span>
                        Taxable
                      </span>

                      <span>
                        {money(
                          selectedSale.subtotal
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>
                        GST
                      </span>

                      <span>
                        {money(
                          selectedSale.gstAmount
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between border-t pt-2 text-lg font-bold">
                      <span>
                        Grand Total
                      </span>

                      <span className="text-green-600">
                        {money(
                          selectedSale.grandTotal
                        )}
                      </span>
                    </div>

                  </div>

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