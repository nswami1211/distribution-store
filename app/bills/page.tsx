"use client";

import { useEffect, useState } from "react";
import CompanyHeader from "@/app/components/CompanyHeader";

type BillItem = {
  id: number;
  quantity: number;
  priceBeforeGst: number;
  gstPercent: number;
  gstAmount: number;
  total: number;
  product: {
    name: string;
    unit: string;
  };
};

type Bill = {
  id: number;
  invoiceNo: string;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  paymentMethod: string;
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  createdAt: string;
  items: BillItem[];
};

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadBills() {
    try {
      setLoading(true);

      const response = await fetch("/api/bills", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load bills.");
      }

      const data = await response.json();

      setBills(data);
    } catch (error) {
      console.error(error);
      alert("Failed to load bill history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBills();
  }, []);

  const filteredBills = bills.filter((bill) => {
    const text = search.toLowerCase().trim();

    return (
      bill.invoiceNo
        .toLowerCase()
        .includes(text) ||
      (bill.customerName || "")
        .toLowerCase()
        .includes(text) ||
      (bill.customerPhone || "").includes(text)
    );
  });

  return (
    <main className="min-h-screen bg-gray-100">

      {/* COMPANY HEADER */}
      <CompanyHeader pageTitle="Bill History" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* TOP ACTIONS */}
        <div className="mb-6 flex flex-wrap justify-end gap-2">
          <a
            href="/billing"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + New Bill
          </a>

          <a
            href="/"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Dashboard
          </a>
        </div>

        {/* SEARCH */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Search Bills
          </label>

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search invoice number, customer name or phone..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        {/* BILLS */}
        <div className="mt-6 rounded-xl bg-white shadow-sm">

          <div className="border-b px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Previous Bills
            </h2>

            <p className="text-sm text-gray-500">
              {filteredBills.length} bill
              {filteredBills.length !== 1
                ? "s"
                : ""}{" "}
              found
            </p>
          </div>

          {loading ? (
            <div className="px-5 py-16 text-center text-gray-500">
              Loading bills...
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="px-5 py-16 text-center text-gray-500">
              No bills found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">

                <thead className="bg-gray-50 text-gray-600">
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
                      Items
                    </th>

                    <th className="px-5 py-3">
                      Payment
                    </th>

                    <th className="px-5 py-3">
                      Total
                    </th>

                    <th className="px-5 py-3">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredBills.map((bill) => {
                    const date = new Date(
                      bill.createdAt
                    );

                    return (
                      <tr
                        key={bill.id}
                        className="hover:bg-gray-50"
                      >
                        {/* INVOICE */}
                        <td className="px-5 py-4 font-semibold text-blue-700">
                          {bill.invoiceNo}
                        </td>

                        {/* DATE */}
                        <td className="px-5 py-4">
                          <p>
                            {date.toLocaleDateString(
                              "en-IN"
                            )}
                          </p>

                          <p className="text-xs text-gray-500">
                            {date.toLocaleTimeString(
                              "en-IN"
                            )}
                          </p>
                        </td>

                        {/* CUSTOMER */}
                        <td className="px-5 py-4">
                          <p className="font-medium">
                            {bill.customerName ||
                              "Walk-in Customer"}
                          </p>

                          {bill.customerPhone && (
                            <p className="text-xs text-gray-500">
                              {bill.customerPhone}
                            </p>
                          )}
                        </td>

                        {/* ITEMS */}
                        <td className="px-5 py-4">
                          {bill.items.length}
                        </td>

                        {/* PAYMENT */}
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                            {bill.paymentMethod}
                          </span>
                        </td>

                        {/* TOTAL */}
                        <td className="px-5 py-4 font-bold">
                          ₹
                          {bill.grandTotal.toFixed(
                            2
                          )}
                        </td>

                        {/* ACTION */}
                        <td className="px-5 py-4">
                          <a
                            href={`/bills/${bill.id}`}
                            className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                          >
                            View
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}