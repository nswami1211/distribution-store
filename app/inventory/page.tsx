"use client";

import { useEffect, useState } from "react";
import CompanyHeader from "@/app/components/CompanyHeader";
import ProductImportModal from "@/app/components/ProductImportModal";
import StockImportModal from "@/app/components/StockImportModal";

type Product = {
  id: number;
  name: string;
  itemErpId?: string | null;

  // Stock is stored in base units
  quantity: number;

  // Selling/display unit
  unit: string;

  // Smallest stock unit
  baseUnit: string;

  // Example: 1 Box = 12 Pieces
  piecesPerUnit: number;

  mrp?: number | null;
  priceBeforeGst: number;
  gstPercent: number;
  priceAfterGst: number;
  isActive: boolean;
};

function formatMoney(
  value: number | null | undefined
) {
  if (
    value == null ||
    !Number.isFinite(Number(value))
  ) {
    return "-";
  }

  return `₹${Number(value).toFixed(2)}`;
}

function formatStock(product: Product) {
  const quantity = Number(product.quantity || 0);
  const conversion = Number(
    product.piecesPerUnit || 1
  );

  if (conversion <= 1) {
    return `${quantity} ${product.baseUnit}`;
  }

  const fullUnits = Math.floor(
    quantity / conversion
  );

  const remainder =
    quantity % conversion;

  if (remainder === 0) {
    return `${fullUnits} ${product.unit}`;
  }

  return `${fullUnits} ${product.unit} + ${remainder} ${product.baseUnit}`;
}

export default function InventoryPage() {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [showAddStock, setShowAddStock] =
    useState(false);

  const [showImportProducts, setShowImportProducts] =
    useState(false);

  const [showImportStock, setShowImportStock] =
    useState(false);

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [name, setName] =
    useState("");

  const [itemErpId, setItemErpId] =
    useState("");

  const [quantity, setQuantity] =
    useState("");

  const [unit, setUnit] =
    useState("Pieces");
  const [baseUnit, setBaseUnit] =
    useState("Pieces");
  const [piecesPerUnit, setPiecesPerUnit] =
    useState(1);

  const [mrp, setMrp] =
    useState("");

  const [priceBeforeGst, setPriceBeforeGst] =
    useState("");

  const [gstPercent, setGstPercent] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [updatingId, setUpdatingId] =
    useState<number | null>(null);

  /*
   * =====================================================
   * LOAD PRODUCTS
   * =====================================================
   */

  async function loadProducts() {
    try {
      setLoading(true);

      const response =
        await fetch("/api/stock", {
          cache: "no-store",
        });

      if (!response.ok) {
        throw new Error(
          "Failed to load products."
        );
      }

      const data =
        await response.json();

      setProducts(data);
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to load inventory."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  /*
   * =====================================================
   * SEARCH
   * =====================================================
   */

  const filteredProducts =
    products.filter((product) => {
      const text =
        search.toLowerCase().trim();

      if (!text) {
        return true;
      }

      return (
        product.name
          .toLowerCase()
          .includes(text) ||
        (product.itemErpId || "")
          .toLowerCase()
          .includes(text)
      );
    });

  /*
   * =====================================================
   * NEW PRODUCT
   * =====================================================
   */

  function openNewProduct() {
    setSelectedProduct(null);

    setName("");
    setItemErpId("");
    setQuantity("");
    setUnit("Pieces");
    setBaseUnit("Piece");
    setPiecesPerUnit(1);
    setMrp("");
    setPriceBeforeGst("");
    setGstPercent("");

    setShowAddStock(true);
  }

  /*
   * =====================================================
   * EXISTING PRODUCT
   * =====================================================
   */

  function openAddStock(
    product: Product
  ) {
    setSelectedProduct(product);

    setName(product.name);

    setItemErpId(
      product.itemErpId ?? ""
    );

    /*
     * IMPORTANT:
     *
     * This is the NEW quantity to ADD.
     * It must NOT contain current stock.
     *
     * Example:
     *
     * Current stock = 8
     * Quantity field = 5
     * Result = 13
     */
    setQuantity("");

    setUnit(product.unit);
    setBaseUnit(product.baseUnit || "Piece");
    setPiecesPerUnit(
      (product.piecesPerUnit || 1)
    );

    setMrp(
      product.mrp != null
        ? String(product.mrp)
        : ""
    );

    setPriceBeforeGst(
      calculatePriceBeforeGst(
        product.mrp != null
          ? String(product.mrp)
          : "",
        String(product.gstPercent)
      )
    );

    setGstPercent(
      String(product.gstPercent)
    );

    setShowAddStock(true);
  }

  /*
   * =====================================================
   * CLOSE MODAL
   * =====================================================
   */

  function closeModal() {
    if (saving) {
      return;
    }

    setShowAddStock(false);
    setSelectedProduct(null);

    setName("");
    setItemErpId("");
    setQuantity("");
    setUnit("Pieces");
    setBaseUnit("Piece");
    setPiecesPerUnit(1);
    setMrp("");
    setPriceBeforeGst("");
    setGstPercent("");
  }
  function calculatePriceBeforeGst(
  mrpValue: string,
  gstValue: string
) {
  const mrpNumber = Number(mrpValue);
  const gstNumber = Number(gstValue);

  if (
    !Number.isFinite(mrpNumber) ||
    mrpNumber < 0 ||
    !Number.isFinite(gstNumber) ||
    gstNumber < 0
  ) {
    return "";
  }

  return (
    mrpNumber /
    (1 + gstNumber / 100)
  ).toFixed(2);
}
useEffect(() => {
  if (
    mrp.trim() === "" ||
    gstPercent.trim() === ""
  ) {
    setPriceBeforeGst("");
    return;
  }

  const calculated =
    calculatePriceBeforeGst(
      mrp,
      gstPercent
    );

  setPriceBeforeGst(calculated);
}, [mrp, gstPercent]);

  /*
   * =====================================================
   * SAVE STOCK
   * =====================================================
   */

  async function saveStock() {
    const qty =
      Number(quantity);
    const conversion = Number(piecesPerUnit);
    if (
  !Number.isFinite(conversion) ||
  conversion <= 0 ||
  !Number.isInteger(conversion)
) {
  alert(
    "Pieces per unit must be a whole number greater than 0."
  );
  return;
}
    const price =
      Number(priceBeforeGst);

    const gst =
      Number(gstPercent);

    const mrpValue =
      mrp.trim() === ""
        ? null
        : Number(mrp);

    /*
     * NAME
     */

    if (!name.trim()) {
      alert(
        "Product name is required."
      );
      return;
    }

    /*
     * QUANTITY
     *
     * Only required when adding stock to an
     * existing product. New products start at 0.
     */

    if (
      selectedProduct &&
      (
        !Number.isFinite(qty) ||
        qty <= 0 ||
        !Number.isInteger(qty)
      )
    ) {
      alert(
        "Quantity must be a whole number greater than 0."
      );
      return;
    }

    // New product is created with zero stock.
    const stockQuantity = selectedProduct ? qty : 0;

    /*
     * PRICE
     */

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      alert(
        "Please enter a valid price."
      );
      return;
    }

    /*
     * GST
     */

    if (
      !Number.isFinite(gst) ||
      gst < 0
    ) {
      alert(
        "Please enter a valid GST percentage."
      );
      return;
    }

    /*
     * MRP
     */

    if (
      mrpValue !== null &&
      (
        !Number.isFinite(mrpValue) ||
        mrpValue < 0
      )
    ) {
      alert(
        "Please enter a valid MRP."
      );
      return;
    }

    try {
      setSaving(true);

      /*
       * IMPORTANT:
       *
       * Existing product:
       * send product ID.
       *
       * New product:
       * send null.
       */

      const response =
        await fetch("/api/stock", {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            productId:
              selectedProduct?.id ??
              null,

            name:
              name.trim(),

            itemErpId:
              itemErpId.trim() ||
              null,

            quantity: stockQuantity,

unit:
  selectedProduct
    ? selectedProduct.unit
    : unit,

baseUnit:
  selectedProduct
    ? selectedProduct.baseUnit
    : baseUnit,

piecesPerUnit:
  selectedProduct
    ? selectedProduct.piecesPerUnit
    : conversion,

mrp: mrpValue,

            priceBeforeGst:
              price,

            gstPercent:
              gst,
          }),
        });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to save stock."
        );
      }

      /*
       * EXISTING PRODUCT
       */

      if (
        data.action ===
        "STOCK_ADDED"
      ) {
        alert(
  `Stock added successfully.\n\n` +
  `Product: ${data.product.name}\n` +
  `Previous Stock: ${data.previousQuantity} ${data.product.baseUnit}\n` +
  `Added: ${data.addedBaseQuantity} ${data.product.baseUnit}\n` +
  `New Stock: ${data.newQuantity} ${data.product.baseUnit}`
);
      }

      /*
       * NEW PRODUCT
       */

      else {
        alert(
          `Product created successfully.\n\n` +
          `${data.product.name}\n` +
          `Stock: 0 ${data.product.baseUnit}\n\n` +
          `Use Add Stock to add inventory.`
        );
      }

      closeModal();

      await loadProducts();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to save stock."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * =====================================================
   * TOGGLE ACTIVE / INACTIVE
   * =====================================================
   */

  async function toggleProduct(
    product: Product
  ) {
    try {
      setUpdatingId(product.id);

      const response =
        await fetch("/api/stock", {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            id: product.id,

            isActive:
              !product.isActive,
          }),
        });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update product."
        );
      }

      await loadProducts();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to update product."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  /*
   * =====================================================
   * DELETE
   * =====================================================
   */

  async function deleteProduct(
    product: Product
  ) {
    const confirmed =
      window.confirm(
        `Delete "${product.name}"?\n\n` +
        `Products with stock or billing history cannot be permanently deleted.`
      );

    if (!confirmed) {
      return;
    }

    try {
      const response =
        await fetch("/api/stock", {
          method: "DELETE",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            id: product.id,
          }),
        });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete product."
        );
      }

      await loadProducts();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete product."
      );
    }
  }

  /*
   * =====================================================
   * PAGE
   * =====================================================
   */

  return (
    <main className="min-h-screen bg-gray-100">

      {/* HEADER */}

      <CompanyHeader pageTitle="Inventory" />
      {/* CONTENT */}

      <div className="mx-auto max-w-7xl px-4 py-6">

        {/* TITLE */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Inventory
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Manage products and stock.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() =>
                setShowImportProducts(true)
              }
              className="rounded-lg border border-blue-600 bg-white px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50"
            >
              Import Products
            </button>

            <button
              onClick={() => setShowImportStock(true)}
              className="rounded-lg border border-purple-600 bg-white px-5 py-3 font-semibold text-purple-700 hover:bg-purple-50"
            >
              Import Stock
            </button>

            <button
              onClick={
                openNewProduct
              }
              className="rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
            >
              + Add New Product
            </button>
          </div>

        </div>

        {/* SEARCH */}

        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">

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
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
          />

        </div>

        {/* INVENTORY */}

        <div className="overflow-hidden rounded-xl bg-white shadow-sm">

          <div className="border-b px-5 py-4">

            <h2 className="text-lg font-semibold text-gray-900">
              Products
            </h2>

          </div>

          {loading ? (

            <div className="px-5 py-16 text-center text-gray-500">
              Loading inventory...
            </div>

          ) : filteredProducts.length ===
            0 ? (

            <div className="px-5 py-16 text-center text-gray-500">
              No products found.
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1000px] text-left text-sm">

                <thead className="bg-gray-50">

                  <tr>

                    <th className="px-4 py-3">
                      Product
                    </th>

                    <th className="px-4 py-3">
                      ERP ID
                    </th>

                    <th className="px-4 py-3">
                      Stock
                    </th>

                    <th className="px-4 py-3">
                      Unit
                    </th>

                    <th className="px-4 py-3">
                      MRP
                    </th>

                    <th className="px-4 py-3">
                      Price Before GST
                    </th>

                    <th className="px-4 py-3">
                      GST
                    </th>

                    <th className="px-4 py-3">
                      Status
                    </th>

                    <th className="px-4 py-3">
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y">

                  {filteredProducts.map(
                    (product) => (
                      <tr
                        key={
                          product.id
                        }
                        className="hover:bg-gray-50"
                      >

                        <td className="px-4 py-4">

                          <p className="font-semibold text-gray-900">
                            {
                              product.name
                            }
                          </p>

                          <p className="text-xs text-gray-500">
                            ID:{" "}
                            {
                              product.id
                            }
                          </p>

                        </td>

                        <td className="px-4 py-4">
                          {
                            product.itemErpId ||
                            "-"
                          }
                        </td>
<td className="px-4 py-4">
  <span
    className={`font-bold ${
      product.quantity <= 10
        ? "text-red-600"
        : "text-green-600"
    }`}
  >
    {formatStock(product)}
  </span>

  {product.piecesPerUnit > 1 && (
    <p className="mt-1 text-xs text-gray-500">
      {product.quantity}{" "}
      {product.baseUnit} total
    </p>
  )}
</td>

                        <td className="px-4 py-4">
                          {
                            product.unit
                          }
                        </td>

                        <td className="px-4 py-4">
                          {formatMoney(
                            product.mrp
                          )}

                        </td>

                        <td className="px-4 py-4">
                          {formatMoney(
                            product.priceBeforeGst
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {
                            product.gstPercent
                          }
                          %
                        </td>

                        <td className="px-4 py-4">

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              product.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {product.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>

                        </td>

                        <td className="px-4 py-4">

                          <div className="flex flex-wrap gap-2">

                            <button
                              onClick={() =>
                                openAddStock(
                                  product
                                )
                              }
                              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              + Add Stock
                            </button>

                            <button
                              onClick={() =>
                                toggleProduct(
                                  product
                                )
                              }
                              disabled={
                                updatingId ===
                                product.id
                              }
                              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                            >
                              {product.isActive
                                ? "Deactivate"
                                : "Activate"}
                            </button>

                            <button
                              onClick={() =>
                                deleteProduct(
                                  product
                                )
                              }
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>

                          </div>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>

      {showImportProducts && (
        <ProductImportModal
          onClose={() =>
            setShowImportProducts(false)
          }
          onImported={async () => {
            setShowImportProducts(false);
            await loadProducts();
          }}
        />
      )}

      {showImportStock && (
        <StockImportModal
          products={products}
          onClose={() => setShowImportStock(false)}
          onImported={async () => {
            setShowImportStock(false);
            await loadProducts();
          }}
        />
      )}

      {/* =================================================
          ADD STOCK MODAL
          ================================================= */}

      {showAddStock && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b px-6 py-5">

              <div>

                <h2 className="text-xl font-bold text-gray-900">

                  {selectedProduct
                    ? "Add Stock"
                    : "Add New Product"}

                </h2>

                <p className="mt-1 text-sm text-gray-500">

                  {selectedProduct
                    ? "Add stock to the existing product."
                    : "Create a new product. Stock starts at zero."}

                </p>

              </div>

              <button
                onClick={
                  closeModal
                }
                disabled={saving}
                className="text-2xl text-gray-400 hover:text-gray-700 disabled:opacity-50"
              >
                ×
              </button>

            </div>

            {/* EXISTING PRODUCT INFO */}

            {selectedProduct && (

              <div className="mx-6 mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">

                <p className="text-sm font-medium text-blue-800">
                  Existing Product
                </p>

                <div className="mt-2 grid gap-3 sm:grid-cols-3">

                  <div>
                    <p className="text-xs text-gray-500">
                      Product
                    </p>

                    <p className="font-semibold">
                      {
                        selectedProduct.name
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Current Stock
                    </p>

                    <p className="font-bold text-blue-700">
  {formatStock(selectedProduct)}
</p>

{selectedProduct.piecesPerUnit > 1 && (
  <p className="text-xs text-gray-500">
    {selectedProduct.quantity}{" "}
    {selectedProduct.baseUnit} total
  </p>
)}
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Product ID
                    </p>

                    <p className="font-semibold">
                      {
                        selectedProduct.id
                      }
                    </p>
                  </div>

                </div>

              </div>

            )}

            {/* FORM */}

            <div className="grid gap-4 p-6 sm:grid-cols-2">

              {/* PRODUCT NAME */}

              <div className="sm:col-span-2">

                <label className="mb-1 block text-sm font-medium">
                  Product Name *
                </label>

                <input
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  disabled={
                    !!selectedProduct
                  }
                  placeholder="Product name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 disabled:bg-gray-100"
                />

              </div>

              {/* ERP */}

              <div>

                <label className="mb-1 block text-sm font-medium">
                  Item ERP ID
                </label>

                <input
                  value={itemErpId}
                  onChange={(e) =>
                    setItemErpId(
                      e.target.value
                    )
                  }
                  placeholder="ERP ID"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                />

              </div>

              {/* QUANTITY - ONLY FOR ADD STOCK */}

              {selectedProduct && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Quantity to Add * (Base Unit)
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(e.target.value)
                    }
                    placeholder={`Enter quantity in ${baseUnit}`}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500"
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    Stock will be added in the product's base unit.
                  </p>
                </div>
              )}

              {/* UNIT */}

<div>
  <label className="mb-1 block text-sm font-medium">
    Unit
  </label>

  <select
    value={unit}
    onChange={(e) =>
      setUnit(e.target.value)
    }
    disabled={!!selectedProduct}
    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 disabled:bg-gray-100"
  >
    <option value="Pieces">
      Pieces
    </option>

    <option value="Box">
      Box
    </option>

    <option value="Packet">
      Packet
    </option>

    <option value="Bottle">
      Bottle
    </option>

    <option value="Carton">
      Carton
    </option>

    <option value="Dozen">
      Dozen
    </option>

    <option value="Kg">
      Kg
    </option>

    <option value="Gram">
      Gram
    </option>

    <option value="Litre">
      Litre
    </option>

    <option value="Ml">
      Ml
    </option>
  </select>
</div>

{/* BASE UNIT */}

<div>
  <label className="mb-1 block text-sm font-medium">
    Base Unit
  </label>

  <select
    value={baseUnit}
    onChange={(e) =>
      setBaseUnit(e.target.value)
    }
    disabled={!!selectedProduct}
    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 disabled:bg-gray-100"
  >
    <option value="Piece">
      Piece
    </option>

    <option value="Kg">
      Kg
    </option>

    <option value="Gram">
      Gram
    </option>

    <option value="Litre">
      Litre
    </option>

    <option value="Ml">
      Ml
    </option>
  </select>
</div>

{/* CONVERSION */}

<div>
  <label className="mb-1 block text-sm font-medium">
  {baseUnit}s per {unit}
</label>

  <input
    type="number"
    min="1"
    step="1"
    value={piecesPerUnit}
    onChange={(e) =>
      setPiecesPerUnit(
        Number(e.target.value)
      )
    }
    disabled={!!selectedProduct}
    placeholder="Example: 12"
    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 disabled:bg-gray-100"
  />

  <p className="mt-1 text-xs text-gray-500">
    Example: 1 Box = 12 Pieces
  </p>
</div>
              {/* MRP */}

              <div>

                <label className="mb-1 block text-sm font-medium">
                  MRP
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={mrp}
                  onChange={(e) =>
                    setMrp(
                      e.target.value
                    )
                  }
                  placeholder="MRP"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                />

              </div>

              {/* PRICE */}

             <div>
  <label className="mb-1 block text-sm font-medium">
    Price Before GST *
  </label>

  <input
    type="number"
    value={priceBeforeGst}
    readOnly
    placeholder="Auto calculated"
    className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2.5 text-gray-700"
  />

  <p className="mt-1 text-xs text-gray-500">
    Automatically calculated from MRP and GST.
  </p>
</div>

              {/* GST */}

              <div>

                <label className="mb-1 block text-sm font-medium">
                  GST %
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    gstPercent
                  }
                  onChange={(e) =>
                    setGstPercent(
                      e.target.value
                    )
                  }
                  placeholder="GST %"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                />

              </div>

            </div>

            {/* MODAL FOOTER */}

            <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">

              <button
                onClick={
                  closeModal
                }
                disabled={saving}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={
                  saveStock
                }
                disabled={saving}
                className="rounded-lg bg-green-600 px-6 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : selectedProduct
                    ? "Add Stock"
                    : "Create Product"}
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}