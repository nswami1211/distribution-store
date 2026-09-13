"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LogoutButton from "@/app/components/LogoutButton";
import CompanyHeader from "@/app/components/CompanyHeader";

type Product = {
  id: number;
  name: string;
  itemErpId: string | null;
  quantity: number;
  unit: string;
  mrp: number | null;
  priceBeforeGst: number;
  gstPercent: number;
  priceAfterGst: number;
};

type RecentBill = {
  id: number;
  invoiceNo: string;
  customerName: string | null;
  grandTotal: number;
  paymentMethod: string;
  createdAt: string;
};

type BusinessProfile = {
  shopName: string;
  gstin: string | null;
  pan: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
};

type DashboardData = {
  totalProducts: number;
  totalStock: number;
  todaySales: number;
  todayBills: number;
  lowStockProducts: Product[];
  recentBills: RecentBill[];
  businessProfile: BusinessProfile | null;
};

export default function Home() {
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  async function loadDashboard() {
    try {
      setLoading(true);

      let lastError =
        "Failed to load dashboard.";

      for (
        let attempt = 1;
        attempt <= 3;
        attempt++
      ) {
        try {
          /*
           * Load dashboard and business profile
           * together.
           */

          const [
            dashboardResponse,
            profileResponse,
          ] = await Promise.all([
            fetch("/api/dashboard", {
              method: "GET",
              cache: "no-store",
            }),

            fetch(
              "/api/business-profile",
              {
                method: "GET",
                cache: "no-store",
              }
            ),
          ]);

          const dashboardData =
            await dashboardResponse.json();

          const profileData =
            await profileResponse.json();

          if (!dashboardResponse.ok) {
            lastError =
              dashboardData.error ||
              `Failed to load dashboard (${dashboardResponse.status})`;

            throw new Error(lastError);
          }

          /*
           * Business profile may not exist yet
           * for older accounts.
           */

          const businessProfile =
            profileResponse.ok
              ? profileData.profile
              : null;

          setDashboard({
            ...dashboardData,
            businessProfile,
          });

          return;
        } catch (error) {
          console.error(
            `Dashboard attempt ${attempt} failed:`,
            error
          );

          lastError =
            error instanceof Error
              ? error.message
              : "Failed to load dashboard.";
        }

        if (attempt < 3) {
          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                1000
              )
          );
        }
      }

      throw new Error(lastError);
    } catch (error) {
      console.error(
        "Dashboard error:",
        error
      );

      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        void loadDashboard();
      }, 0);

    return () =>
      window.clearTimeout(
        timeoutId
      );
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

          <p className="mt-3 text-sm text-gray-500">
            Loading dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-red-600">
            Failed to load dashboard.
          </p>

          <button
            onClick={loadDashboard}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  /*
   * Shop / Company Name
   *
   * This comes from BusinessProfile.
   */

  const shopName =
    dashboard.businessProfile
      ?.shopName ||
    "Your Shop";

  return (
    <main className="min-h-screen bg-gray-100">

      {/* ==================================================
          HEADER
          ================================================== */}

      <CompanyHeader pageTitle="Dashboard" />
      {/* ==================================================
          CONTENT
          ================================================== */}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* STAT CARDS */}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

          {/* PRODUCTS */}

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Products
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {dashboard.totalProducts}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Different products
            </p>
          </div>

          {/* STOCK */}

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Total Stock
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {dashboard.totalStock}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Total quantity
            </p>
          </div>

          {/* SALES */}

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Today&apos;s Sales
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              ₹{dashboard.todaySales.toFixed(2)}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Today&apos;s revenue
            </p>
          </div>

          {/* BILLS */}

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Today&apos;s Bills
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {dashboard.todayBills}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Invoices generated
            </p>
          </div>

        </div>

        {/* QUICK ACTIONS */}

        {/* QUICK ACTIONS */}

<div className="mt-6">

  <h2 className="mb-3 text-lg font-semibold text-gray-900">
    Quick Actions
  </h2>

  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

    {/* NEW BILL */}

    <a
      href="/billing"
      className="rounded-xl bg-green-600 p-5 text-white shadow-sm transition hover:bg-green-700"
    >
      <p className="text-lg font-bold">
        🧾 New Bill
      </p>

      <p className="mt-1 text-sm text-green-100">
        Create a customer invoice
      </p>
    </a>

    {/* INVENTORY */}

    <a
      href="/inventory"
      className="rounded-xl bg-blue-600 p-5 text-white shadow-sm transition hover:bg-blue-700"
    >
      <p className="text-lg font-bold">
        📦 Inventory
      </p>

      <p className="mt-1 text-sm text-blue-100">
        Manage products and stock
      </p>
    </a>

    {/* BILL HISTORY */}

    <a
      href="/bills"
      className="rounded-xl bg-gray-800 p-5 text-white shadow-sm transition hover:bg-gray-900"
    >
      <p className="text-lg font-bold">
        📋 Bill History
      </p>

      <p className="mt-1 text-sm text-gray-300">
        View and print previous bills
      </p>
    </a>

    {/* REPORTS */}

    <a
      href="/reports"
      className="rounded-xl bg-orange-600 p-5 text-white shadow-sm transition hover:bg-orange-700"
    >
      <p className="text-lg font-bold">
        📊 Reports
      </p>

      <p className="mt-1 text-sm text-orange-100">
        View sales and business reports
      </p>
    </a>

  </div>

</div>

        {/* LOWER SECTION */}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">

          {/* LOW STOCK */}

          <div className="rounded-xl bg-white shadow-sm">

            <div className="flex items-center justify-between border-b px-5 py-4">

              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Low Stock
                </h2>

                <p className="text-sm text-gray-500">
                  Products with 10 or fewer units
                </p>
              </div>

              <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-600">
                {dashboard.lowStockProducts.length}
              </span>

            </div>

            {dashboard.lowStockProducts.length === 0 ? (

              <div className="px-5 py-10 text-center">
                <p className="text-green-600">
                  ✓ All products have sufficient stock
                </p>
              </div>

            ) : (

              <div className="divide-y">

                {dashboard.lowStockProducts
                  .slice(0, 8)
                  .map((product) => (

                    <div
                      key={product.id}
                      className="flex items-center justify-between px-5 py-4"
                    >

                      <div>

                        <p className="font-medium text-gray-900">
                          {product.name}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">

                          <span>
                            {product.unit}
                          </span>

                          <span>
                            ERP:{" "}
                            {product.itemErpId || "-"}
                          </span>

                          {product.mrp !== null && (
                            <span>
                              MRP: ₹
                              {product.mrp.toFixed(
                                2
                              )}
                            </span>
                          )}

                        </div>

                      </div>

                      <span className="font-bold text-red-600">
                        {product.quantity}
                      </span>

                    </div>

                  ))}

              </div>

            )}

            {dashboard.lowStockProducts.length > 8 && (

              <div className="border-t px-5 py-3 text-center">

                <a
                  href="/inventory"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  View all low-stock products →
                </a>

              </div>

            )}

          </div>

          {/* RECENT BILLS */}

          <div className="rounded-xl bg-white shadow-sm">

            <div className="flex items-center justify-between border-b px-5 py-4">

              <div>

                <h2 className="text-lg font-semibold text-gray-900">
                  Recent Bills
                </h2>

                <p className="text-sm text-gray-500">
                  Today&apos;s invoices
                </p>

              </div>

              <Link
                href="/bills"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                View All
              </Link>

            </div>

            {dashboard.recentBills.length === 0 ? (

              <div className="px-5 py-10 text-center text-gray-500">
                No bills created today.
              </div>

            ) : (

              <div className="divide-y">

                {dashboard.recentBills.map(
                  (bill) => {

                    const date =
                      new Date(
                        bill.createdAt
                      );

                    return (
                      <a
                        key={bill.id}
                        href={`/bills/${bill.id}`}
                        className="flex items-center justify-between px-5 py-4 transition hover:bg-gray-50"
                      >

                        <div>

                          <p className="font-semibold text-blue-600">
                            {bill.invoiceNo}
                          </p>

                          <p className="text-sm text-gray-600">
                            {bill.customerName ||
                              "Walk-in Customer"}
                          </p>

                          <p className="text-xs text-gray-400">
                            {date.toLocaleTimeString(
                              "en-IN"
                            )}
                          </p>

                        </div>

                        <div className="text-right">

                          <p className="font-bold text-gray-900">
                            ₹
                            {bill.grandTotal.toFixed(
                              2
                            )}
                          </p>

                          <p className="text-xs text-gray-500">
                            {bill.paymentMethod}
                          </p>

                        </div>

                      </a>
                    );
                  }
                )}

              </div>

            )}

          </div>

        </div>

        {/* REFRESH */}

        <div className="mt-6 flex justify-end">

          <button
            onClick={loadDashboard}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ↻ Refresh Dashboard
          </button>

        </div>

      </div>

    </main>
  );
}