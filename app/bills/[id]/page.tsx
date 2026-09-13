"use client";

import { useEffect, useState } from "react";
import InvoiceDocument, {
InvoiceData,
} from "@/components/InvoiceDocument";

export default function BillDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [bill, setBill] =
    useState<InvoiceData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadBill() {
      try {
        const { id } = await params;

        const response = await fetch(
          `/api/bills/${id}`
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load bill."
          );
        }

        setBill(data);
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load bill."
        );
      } finally {
        setLoading(false);
      }
    }

    loadBill();
  }, [params]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        Loading bill...
      </main>
    );
  }

  if (error || !bill) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">
            {error || "Bill not found."}
          </p>

          <a
            href="/bills"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            ← Bill History
          </a>
        </div>
      </main>
    );
  }

  return (
  <main className="min-h-screen bg-gray-200 p-4 sm:p-8 print:bg-white print:p-0">
    <div className="mx-auto w-full max-w-[297mm]">

      <div className="mb-5 flex flex-wrap gap-3 print:hidden">

        <button
          onClick={() => window.print()}
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          🖨️ Print Invoice
        </button>

        <a
          href="/bills"
          className="rounded-lg border bg-white px-5 py-3 font-medium hover:bg-gray-50"
        >
          ← Bill History
        </a>

        <a
          href="/"
          className="rounded-lg border bg-white px-5 py-3 font-medium hover:bg-gray-50"
        >
          Dashboard
        </a>

      </div>

      <InvoiceDocument invoice={bill} />

    </div>
  </main>
);
}