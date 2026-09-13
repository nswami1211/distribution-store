"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

type ImportRow = {
  rowNumber: number;
  name: string;
  itemErpId: string | null;
  mrp: number;
  gstPercent: number;
  unit: string;
  baseUnit: string;
  piecesPerUnit: number;
  priceBeforeGst: number;
  error?: string;
};

type Props = {
  onClose: () => void;
  onImported: () => void | Promise<void>;
};

function normalizeKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[%₹()]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getCell(
  row: Record<string, unknown>,
  aliases: string[]
) {
  const entries = Object.entries(row);

  for (const [key, value] of entries) {
    const normalized = normalizeKey(key);

    if (
      aliases.some(
        (alias) =>
          normalized === normalizeKey(alias)
      )
    ) {
      return value;
    }
  }

  return undefined;
}

function asText(value: unknown) {
  return String(value ?? "").trim();
}

function asNumber(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return NaN;
  }

  if (typeof value === "number") {
    return value;
  }

  return Number(
    String(value)
      .replace(/,/g, "")
      .replace(/₹/g, "")
      .replace(/%/g, "")
      .trim()
  );
}

function calculatePriceBeforeGst(
  mrp: number,
  gstPercent: number
) {
  return Number(
    (
      mrp /
      (1 + gstPercent / 100)
    ).toFixed(2)
  );
}

function mapRows(
  rawRows: Record<string, unknown>[]
): ImportRow[] {
  return rawRows.map((row, index) => {
    const name = asText(
      getCell(row, [
        "Product Name",
        "Product",
        "Name",
        "Item Name",
      ])
    );

    const itemErpIdText = asText(
      getCell(row, [
        "Item ERP ID",
        "ERP ID",
        "ERP",
        "Item ERP Id",
      ])
    );

    const mrp = asNumber(
      getCell(row, ["MRP", "MRP ₹"])
    );

    const gstPercent = asNumber(
      getCell(row, [
        "GST %",
        "GST",
        "GST Percent",
        "GST Percentage",
      ])
    );

    const unit =
      asText(
        getCell(row, [
          "Unit",
          "Selling Unit",
        ])
      ) || "Pieces";

    const baseUnit =
      asText(
        getCell(row, [
          "Base Unit",
          "Stock Unit",
        ])
      ) || "Piece";

    const conversionRaw = getCell(row, [
      "Pieces Per Unit",
      "Base Units Per Unit",
      "Conversion",
    ]);

    const piecesPerUnit =
      conversionRaw === undefined ||
      conversionRaw === null ||
      conversionRaw === ""
        ? 1
        : asNumber(conversionRaw);

    const errors: string[] = [];

    if (!name) {
      errors.push("Product Name is required");
    }

    if (
      !Number.isFinite(mrp) ||
      mrp < 0
    ) {
      errors.push("MRP must be 0 or greater");
    }

    if (
      !Number.isFinite(gstPercent) ||
      gstPercent < 0
    ) {
      errors.push(
        "GST % must be 0 or greater"
      );
    }

    if (
      !Number.isFinite(piecesPerUnit) ||
      piecesPerUnit <= 0 ||
      !Number.isInteger(piecesPerUnit)
    ) {
      errors.push(
        "Pieces Per Unit must be a whole number greater than 0"
      );
    }

    return {
      rowNumber: index + 2,
      name,
      itemErpId:
        itemErpIdText || null,
      mrp,
      gstPercent,
      unit,
      baseUnit,
      piecesPerUnit,
      priceBeforeGst:
        Number.isFinite(mrp) &&
        Number.isFinite(gstPercent) &&
        gstPercent >= 0
          ? calculatePriceBeforeGst(
              mrp,
              gstPercent
            )
          : NaN,
      error:
        errors.length > 0
          ? errors.join("; ")
          : undefined,
    };
  });
}

export default function ProductImportModal({
  onClose,
  onImported,
}: Props) {
  const [fileName, setFileName] =
    useState("");
  const [rows, setRows] =
    useState<ImportRow[]>([]);
  const [parsing, setParsing] =
    useState(false);
  const [importing, setImporting] =
    useState(false);
  const [serverError, setServerError] =
    useState("");

  const validRows = useMemo(
    () => rows.filter((row) => !row.error),
    [rows]
  );

  const errorRows = useMemo(
    () => rows.filter((row) => row.error),
    [rows]
  );

  async function handleFile(
    file: File | undefined
  ) {
    if (!file) {
      return;
    }

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() || "";

    if (
      extension !== "csv" &&
      extension !== "xlsx"
    ) {
      alert(
        "Please choose a CSV or XLSX file."
      );
      return;
    }

    try {
      setParsing(true);
      setServerError("");
      setRows([]);
      setFileName(file.name);

      const buffer =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(buffer, {
          type: "array",
        });

      const firstSheetName =
        workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error(
          "The file does not contain a worksheet."
        );
      }

      const worksheet =
        workbook.Sheets[firstSheetName];

      const rawRows =
        XLSX.utils.sheet_to_json<
          Record<string, unknown>
        >(worksheet, {
          defval: "",
          raw: true,
        });

      if (rawRows.length === 0) {
        throw new Error(
          "The file does not contain any product rows."
        );
      }

      setRows(mapRows(rawRows));
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to read import file."
      );

      setFileName("");
      setRows([]);
    } finally {
      setParsing(false);
    }
  }

  function downloadTemplate() {
    const csv =
      [
        [
          "Product Name",
          "Item ERP ID",
          "MRP",
          "GST %",
          "Unit",
          "Base Unit",
          "Pieces Per Unit",
        ],
        [
          "Sample Product",
          "ERP001",
          "118",
          "18",
          "Box",
          "Piece",
          "12",
        ],
      ]
        .map((row) =>
          row
            .map(
              (value) =>
                `"${String(value).replace(
                  /"/g,
                  '""'
                )}"`
            )
            .join(",")
        )
        .join("\r\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "product-import-template.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  async function importProducts() {
    if (rows.length === 0) {
      alert("Choose a file first.");
      return;
    }

    if (errorRows.length > 0) {
      alert(
        "Please fix the invalid rows before importing."
      );
      return;
    }

    try {
      setImporting(true);
      setServerError("");

      const response =
        await fetch(
          "/api/stock/import",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              products: validRows.map(
                (row) => ({
                  name: row.name,
                  itemErpId:
                    row.itemErpId,
                  mrp: row.mrp,
                  gstPercent:
                    row.gstPercent,
                  unit: row.unit,
                  baseUnit:
                    row.baseUnit,
                  piecesPerUnit:
                    row.piecesPerUnit,
                })
              ),
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        const details =
          Array.isArray(data.errors)
            ? data.errors
                .slice(0, 8)
                .map(
                  (item: {
                    row?: number;
                    error?: string;
                  }) =>
                    `Row ${
                      item.row ?? "?"
                    }: ${
                      item.error ??
                      "Invalid row"
                    }`
                )
                .join("\n")
            : "";

        throw new Error(
          details ||
            data.error ||
            "Failed to import products."
        );
      }

      alert(
        `${data.createdCount} products imported successfully.\n\nAll imported products start with 0 stock.`
      );

      await onImported();
    } catch (error) {
      console.error(error);

      setServerError(
        error instanceof Error
          ? error.message
          : "Failed to import products."
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Import Products
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Upload CSV or Excel (.xlsx).
              Imported products start with zero stock.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={importing}
            className="text-2xl text-gray-400 hover:text-gray-700 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="font-semibold text-blue-900">
              File columns
            </p>

            <p className="mt-1 text-sm text-blue-800">
              Required: Product Name, MRP,
              GST %. Optional: Item ERP ID,
              Unit, Base Unit, Pieces Per Unit.
            </p>

            <p className="mt-1 text-sm text-blue-800">
              Price Before GST is calculated
              automatically. Stock is always 0
              when a product is imported.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
              {parsing
                ? "Reading File..."
                : "Choose CSV / Excel"}

              <input
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                disabled={
                  parsing || importing
                }
                onChange={(e) => {
                  void handleFile(
                    e.target.files?.[0]
                  );

                  e.currentTarget.value =
                    "";
                }}
              />
            </label>

            <button
              type="button"
              onClick={downloadTemplate}
              disabled={importing}
              className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Download CSV Template
            </button>

            {fileName && (
              <span className="text-sm text-gray-600">
                {fileName}
              </span>
            )}
          </div>

          {rows.length > 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-gray-100 p-4">
                  <p className="text-xs text-gray-500">
                    Rows Found
                  </p>
                  <p className="text-xl font-bold">
                    {rows.length}
                  </p>
                </div>

                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-xs text-green-700">
                    Ready
                  </p>
                  <p className="text-xl font-bold text-green-700">
                    {validRows.length}
                  </p>
                </div>

                <div className="rounded-lg bg-red-50 p-4">
                  <p className="text-xs text-red-700">
                    Errors
                  </p>
                  <p className="text-xl font-bold text-red-700">
                    {errorRows.length}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3">
                        Row
                      </th>
                      <th className="px-3 py-3">
                        Product
                      </th>
                      <th className="px-3 py-3">
                        ERP ID
                      </th>
                      <th className="px-3 py-3">
                        MRP
                      </th>
                      <th className="px-3 py-3">
                        GST
                      </th>
                      <th className="px-3 py-3">
                        Before GST
                      </th>
                      <th className="px-3 py-3">
                        Unit
                      </th>
                      <th className="px-3 py-3">
                        Base Unit
                      </th>
                      <th className="px-3 py-3">
                        Conversion
                      </th>
                      <th className="px-3 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {rows
                      .slice(0, 200)
                      .map((row) => (
                        <tr
                          key={
                            row.rowNumber
                          }
                        >
                          <td className="px-3 py-3">
                            {row.rowNumber}
                          </td>

                          <td className="px-3 py-3 font-medium">
                            {row.name || "-"}
                          </td>

                          <td className="px-3 py-3">
                            {row.itemErpId ||
                              "-"}
                          </td>

                          <td className="px-3 py-3">
                            {Number.isFinite(
                              row.mrp
                            )
                              ? `₹${row.mrp.toFixed(
                                  2
                                )}`
                              : "-"}
                          </td>

                          <td className="px-3 py-3">
                            {Number.isFinite(
                              row.gstPercent
                            )
                              ? `${row.gstPercent}%`
                              : "-"}
                          </td>

                          <td className="px-3 py-3">
                            {Number.isFinite(
                              row.priceBeforeGst
                            )
                              ? `₹${row.priceBeforeGst.toFixed(
                                  2
                                )}`
                              : "-"}
                          </td>

                          <td className="px-3 py-3">
                            {row.unit}
                          </td>

                          <td className="px-3 py-3">
                            {row.baseUnit}
                          </td>

                          <td className="px-3 py-3">
                            {row.piecesPerUnit}
                          </td>

                          <td className="px-3 py-3">
                            {row.error ? (
                              <span className="text-red-600">
                                {row.error}
                              </span>
                            ) : (
                              <span className="font-medium text-green-700">
                                Ready
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {rows.length > 200 && (
                <p className="text-xs text-gray-500">
                  Preview shows the first 200 rows.
                  All {rows.length} rows will be
                  validated by the server.
                </p>
              )}
            </>
          )}

          {serverError && (
            <div className="whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {serverError}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() =>
              void importProducts()
            }
            disabled={
              importing ||
              parsing ||
              rows.length === 0 ||
              errorRows.length > 0
            }
            className="rounded-lg bg-green-600 px-6 py-2.5 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing
              ? "Importing..."
              : `Import ${validRows.length} Products`}
          </button>
        </div>
      </div>
    </div>
  );
}
