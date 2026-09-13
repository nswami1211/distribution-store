"use client";
import CompanyHeader from "@/app/components/CompanyHeader";

export default function SalesReportsPage() {
  return (
    <main className="min-h-screen bg-gray-100">

      {/* HEADER */}
     <CompanyHeader pageTitle="Sales Reports" />

      {/* CONTENT */}
      <div className="mx-auto max-w-7xl px-4 py-8">

        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          Sales Reports
        </h2>

        <p className="mb-6 text-gray-500">
          Select the type of sales report you want to view.
        </p>

        <div className="grid gap-6 md:grid-cols-3">

          {/* ==================================================
              ACTUAL SALES REPORT
              ================================================== */}

          <a
            href="/reports/sales"
            className="group rounded-xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >

            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green-100 text-3xl">
              🧾
            </div>

            <h3 className="text-xl font-bold text-gray-900">
              Sales Report
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              View every invoice and actual sale
              transaction with date, customer,
              payment, GST and total amount.
            </p>

            <p className="mt-5 font-semibold text-green-600">
              Open Sales Report →
            </p>

          </a>

          {/* ==================================================
              CUSTOMER SALES
              ================================================== */}

          <a
            href="/reports/customer"
            className="group rounded-xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >

            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-3xl">
              👥
            </div>

            <h3 className="text-xl font-bold text-gray-900">
              Customer Sales
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              View total sales customer-wise with
              1 month, 3 months, 6 months,
              1 year and custom dates.
            </p>

            <p className="mt-5 font-semibold text-blue-600">
              Open Customer Sales →
            </p>

          </a>

          {/* ==================================================
              PRODUCT SALES
              ================================================== */}

          <a
            href="/reports/product"
            className="group rounded-xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >

            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100 text-3xl">
              📦
            </div>

            <h3 className="text-xl font-bold text-gray-900">
              Product Sales
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              View product-wise quantity,
              free quantity, taxable amount,
              GST and total sales.
            </p>

            <p className="mt-5 font-semibold text-purple-600">
              Open Product Sales →
            </p>

          </a>

        </div>

      </div>

    </main>
  );
}