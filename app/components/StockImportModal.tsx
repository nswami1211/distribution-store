"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

type Product = {
  id: number;
  name: string;
  itemErpId?: string | null;
  quantity: number;
  unit: string;
  baseUnit: string;
  piecesPerUnit: number;
};

type Row = {
  row: number;
  itemErpId: string;
  name: string;
  currentStock: number;
  quantity: number;
  unit: string;
  product?: Product;
  error?: string;
};

export default function StockImportModal({
  products,
  onClose,
  onImported,
}: {
  products: Product[];
  onClose: () => void;
  onImported: () => void | Promise<void>;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const preview = useMemo(
    () => rows.filter((r) => !r.error && r.product),
    [rows]
  );

  function text(v: unknown) {
    return v == null ? "" : String(v).trim();
  }

  function numberValue(v: unknown) {
    if (v === null || v === undefined || v === "") return NaN;
    if (typeof v === "number") return v;

    return Number(
      String(v)
        .replace(/,/g, "")
        .trim()
    );
  }

  async function handleFile(file: File) {
    setError("");
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error("The file has no worksheet.");
      }

      const sheet = workbook.Sheets[firstSheetName];

      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        sheet,
        { defval: "" }
      );

      if (!data.length) {
        throw new Error("The file has no data rows.");
      }

      const erpMap = new Map(
        products
          .filter((p) => p.itemErpId)
          .map((p) => [
            String(p.itemErpId).trim().toLowerCase(),
            p,
          ])
      );

      const nameMap = new Map(
        products.map((p) => [
          p.name.trim().toLowerCase(),
          p,
        ])
      );

      const seen = new Set<number>();

      const parsed: Row[] = data.map((r, i) => {
        const itemErpId = text(
          r["Item ERP ID"] ??
            r["ERP ID"] ??
            r["itemErpId"]
        );

        const name = text(
          r["Product Name"] ??
            r["Name"] ??
            r["name"]
        );

        // Quantity to Add is the value the user edits.
        // Quantity is retained as a fallback for older templates.
        const rawQty =
          r["Quantity to Add"] ??
          r["Quantity"] ??
          r["Qty"] ??
          r["quantity"];

        const quantity = numberValue(rawQty);

        let product: Product | undefined;

        if (itemErpId) {
          product = erpMap.get(
            itemErpId.toLowerCase()
          );
        } else if (name) {
          product = nameMap.get(
            name.toLowerCase()
          );
        }

        let rowError = "";

        if (!itemErpId && !name) {
          rowError =
            "Item ERP ID or Product Name is required.";
        } else if (!product) {
          rowError = itemErpId
            ? "Product not found for this ERP ID."
            : "Product not found for this name.";
        } else if (
          !Number.isFinite(quantity) ||
          quantity < 0 ||
          !Number.isInteger(quantity)
        ) {
          rowError =
            "Quantity to Add must be a whole number greater than or equal to 0.";
        } else if (seen.has(product.id)) {
          rowError =
            "Duplicate product in file.";
        }

        if (product) {
          seen.add(product.id);
        }

        return {
          row: i + 2,
          itemErpId,
          name,
          currentStock: Number(
            product?.quantity || 0
          ),
          quantity,
          unit: product?.baseUnit || product?.unit || "",
          product,
          error: rowError || undefined,
        };
      });

      setRows(parsed);
    } catch (e) {
      setRows([]);
      setError(
        e instanceof Error
          ? e.message
          : "Could not read the file."
      );
    }
  }

  async function importStock() {
    if (
      !preview.length ||
      rows.some((r) => r.error)
    ) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        "/api/stock/import-stock",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            rows: preview.map((r) => ({
              itemErpId:
                r.itemErpId || undefined,
              name: r.name || undefined,
              quantity: r.quantity,
            })),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const details = Array.isArray(
          data.errors
        )
          ? data.errors
              .slice(0, 10)
              .map(
                (x: {
                  row?: number;
                  error?: string;
                }) =>
                  `Row ${x.row ?? "?"}: ${
                    x.error ??
                    "Invalid row"
                  }`
              )
              .join("\n")
          : "";

        throw new Error(
          details ||
            data.error ||
            "Stock import failed."
        );
      }

      await onImported();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Stock import failed."
      );
    } finally {
      setSaving(false);
    }
  }

  function downloadTemplate() {
    /*
     * IMPORTANT:
     * The template is generated from the products already loaded
     * for the current company/user.
     *
     * Quantity to Add starts at 0 so the user only needs to enter
     * additional stock.
     */
    const templateRows = products.map(
      (product) => ({
        "Item ERP ID":
          product.itemErpId || "",
        "Product Name": product.name,
        "Current Stock": Number(
          product.quantity || 0
        ),
        "Quantity to Add": 0,
        Unit:
          product.baseUnit ||
          product.unit ||
          "Piece",
      })
    );

    if (!templateRows.length) {
      setError(
        "There are no existing products to create a stock template from."
      );
      return;
    }

    const ws =
      XLSX.utils.json_to_sheet(
        templateRows
      );

    ws["!cols"] = [
      { wch: 20 },
      { wch: 35 },
      { wch: 16 },
      { wch: 18 },
      { wch: 14 },
    ];

    const wb =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "Stock Import"
    );

    XLSX.writeFile(
      wb,
      "stock-import-template.xlsx"
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-bold">
            Import Stock
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Download your existing products,
            enter the quantity to add, and
            upload the file.
          </p>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
            <p>
              <b>How it works:</b>
            </p>
            <p className="mt-1">
              Download Template → enter only
              <b> Quantity to Add</b> → upload
              the file.
            </p>
            <p className="mt-1">
              Current Stock is never overwritten.
              New Stock = Current Stock +
              Quantity to Add.
            </p>
            <p className="mt-1">
              <b>0 is allowed</b> and means no
              stock will be added.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={downloadTemplate}
              disabled={saving}
              className="rounded-lg border border-green-600 bg-green-50 px-5 py-3 font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
            >
              Download Existing Stock Template
            </button>

            <label className="cursor-pointer rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700">
              Choose CSV / Excel
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                disabled={saving}
                onChange={(e) => {
                  const file =
                    e.target.files?.[0];

                  if (file) {
                    void handleFile(file);
                  }

                  e.currentTarget.value = "";
                }}
              />
            </label>

            {fileName && (
              <span className="text-sm text-gray-600">
                {fileName}
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">
                    Row
                  </th>
                  <th className="px-3 py-2 text-left">
                    Product
                  </th>
                  <th className="px-3 py-2 text-left">
                    Current Stock
                  </th>
                  <th className="px-3 py-2 text-left">
                    Quantity to Add
                  </th>
                  <th className="px-3 py-2 text-left">
                    New Stock
                  </th>
                  <th className="px-3 py-2 text-left">
                    Unit
                  </th>
                  <th className="px-3 py-2 text-left">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => {
                  const current =
                    Number(
                      r.product?.quantity ??
                        r.currentStock ??
                        0
                    );

                  const newStock =
                    Number.isFinite(
                      r.quantity
                    )
                      ? current +
                        r.quantity
                      : NaN;

                  return (
                    <tr
                      key={r.row}
                      className="border-t"
                    >
                      <td className="px-3 py-2">
                        {r.row}
                      </td>

                      <td className="px-3 py-2 font-medium">
                        {r.product?.name ||
                          r.name ||
                          r.itemErpId ||
                          "-"}
                      </td>

                      <td className="px-3 py-2">
                        {r.product
                          ? `${current} ${r.product.baseUnit}`
                          : "-"}
                      </td>

                      <td className="px-3 py-2 font-semibold">
                        {Number.isFinite(
                          r.quantity
                        )
                          ? r.quantity
                          : "-"}
                      </td>

                      <td className="px-3 py-2">
                        {r.product &&
                        Number.isFinite(
                          newStock
                        )
                          ? `${newStock} ${r.product.baseUnit}`
                          : "-"}
                      </td>

                      <td className="px-3 py-2">
                        {r.unit || "-"}
                      </td>

                      <td
                        className={`px-3 py-2 ${
                          r.error
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {r.error ||
                          "Ready"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <p className="text-sm text-gray-500">
              Download the existing stock
              template first, enter quantities,
              then upload it here.
            </p>
          )}

          {error && (
            <div className="whitespace-pre-wrap rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border bg-white px-5 py-2.5 font-medium"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => void importStock()}
            disabled={
              saving ||
              !preview.length ||
              rows.some((r) => r.error)
            }
            className="rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {saving
              ? "Importing..."
              : `Add ${preview.length} Row${
                  preview.length === 1
                    ? ""
                    : "s"
                }`}
          </button>
        </div>
      </div>
    </div>
  );
}
