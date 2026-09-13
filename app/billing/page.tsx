"use client";

import { useEffect, useMemo, useState } from "react";
import InvoiceDocument from "@/components/InvoiceDocument";
import CompanyHeader from "@/app/components/CompanyHeader";

type Product = {
  id: number;
  name: string;
  itemErpId?: string | null;

  quantity: number;

  unit: string;
  baseUnit?: string;
  piecesPerUnit?: number;

  mrp?: number | null;
  priceBeforeGst: number;
  gstPercent: number;
  priceAfterGst: number;
  isActive: boolean;
};

type Customer = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  gstNo: string | null;
  panNo: string | null;
  buyerErpId: string | null;
  createdAt: string;
  updatedAt: string;
};

type BillItem = {
  product: Product;

  quantity: number;
  freeQuantity: number;

  // Unit customer is buying
  unit: string;

  soNo: string;

  secondaryDiscount: string;
  cashDiscount: string;
};

type InvoiceItem = {
  id: number;
  productId: number;
  productName: string;
  itemErpId: string | null;
  quantity: number;
  freeQuantity: number;
  unit: string;
  mrp: number | null;
  priceBeforeGst: number;
  gstPercent: number;
  secondaryDiscount: number;
  cashDiscount: number;
  taxableValue: number;
  gstAmount: number;
  total: number;
  soNo: string | null;
};

type BusinessProfile = {
  id: number;
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

type Company = {
  name: string;
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

type Invoice = {
  invoiceNo: string;
  company: Company;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  customerGstNo: string | null;
  customerPanNo: string | null;

  buyerErpId: string | null;
  salesmanName: string | null;
  routeName: string | null;

  paymentMethod: string;

  subtotal: number;
  gstAmount: number;
  grandTotal: number;

  createdAt: string;

  items: InvoiceItem[];
};

function money(value: number | null | undefined) {
  const numberValue = Number(value ?? 0);
  return `₹${numberValue.toFixed(2)}`;
}

function formatAvailableStock(
  pieces: number,
  piecesPerUnit: number,
  unit: string,
  baseUnit: string
) {
  if (!piecesPerUnit || piecesPerUnit <= 1) {
    return `${pieces} ${baseUnit}`;
  }

  const wholeUnits = Math.floor(pieces / piecesPerUnit);
  const remainingPieces = pieces % piecesPerUnit;

  if (wholeUnits > 0 && remainingPieces > 0) {
    return `${wholeUnits} ${unit} ${remainingPieces} ${baseUnit}`;
  }

  if (wholeUnits > 0) {
    return `${wholeUnits} ${unit}`;
  }

  return `${remainingPieces} ${baseUnit}`;
}

export default function BillingPage() {
  /*
   * ==================================================
   * PRODUCTS
   * ==================================================
   */

  const [products, setProducts] = useState<Product[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");

  /*
   * ==================================================
   * CUSTOMERS
   * ==================================================
   */

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [customerSaving, setCustomerSaving] = useState(false);

  /*
   * ==================================================
   * GENERAL
   * ==================================================
   */

  const [loading, setLoading] = useState(false);

  /*
   * ==================================================
   * CUSTOMER FIELDS
   * ==================================================
   */

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerGstNo, setCustomerGstNo] = useState("");
  const [customerPanNo, setCustomerPanNo] = useState("");

  /*
   * ==================================================
   * INVOICE INFORMATION
   * ==================================================
   */

  const [buyerErpId, setBuyerErpId] = useState("");
  const [salesmanName, setSalesmanName] = useState("");
  const [routeName, setRouteName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  /*
   * ==================================================
   * LOAD PRODUCTS
   * ==================================================
   */

  async function loadProducts() {
    try {
      const response = await fetch("/api/stock", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load products.");
      }

      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to load inventory."
      );
    }
  }

  /*
   * ==================================================
   * LOAD CUSTOMERS
   * ==================================================
   */

  async function loadCustomers() {
    try {
      const response = await fetch("/api/customers", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load customers.");
      }

      setCustomers(data);
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to load customers."
      );
    }
  }

  /*
   * ==================================================
   * INITIAL LOAD
   * ==================================================
   */

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, []);

  /*
   * ==================================================
   * CUSTOMER SEARCH
   * ==================================================
   */

  const filteredCustomers = useMemo(() => {
    const text = customerSearch.trim().toLowerCase();

    if (!text) {
      return [];
    }

    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(text) ||
        (customer.phone || "").toLowerCase().includes(text) ||
        (customer.buyerErpId || "").toLowerCase().includes(text) ||
        (customer.gstNo || "").toLowerCase().includes(text)
      );
    });
  }, [customers, customerSearch]);

  /*
   * ==================================================
   * SELECT CUSTOMER
   * ==================================================
   */

  function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone || "");
    setCustomerAddress(customer.address || "");
    setCustomerGstNo(customer.gstNo || "");
    setCustomerPanNo(customer.panNo || "");
    setBuyerErpId(customer.buyerErpId || "");
    setCustomerSearch(customer.name);
    setShowCustomerResults(false);
  }

  /*
   * ==================================================
   * CLEAR SELECTED CUSTOMER
   * ==================================================
   */

  function clearSelectedCustomer() {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setCustomerGstNo("");
    setCustomerPanNo("");
    setBuyerErpId("");
    setShowCustomerResults(false);
  }

  /*
   * ==================================================
   * SAVE NEW CUSTOMER
   * ==================================================
   */

  async function saveCustomer() {
    if (!customerName.trim()) {
      alert("Please enter customer name.");
      return;
    }

    try {
      setCustomerSaving(true);

      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: customerName.trim(),
          phone: customerPhone.trim() || null,
          address: customerAddress.trim() || null,
          gstNo: customerGstNo.trim() || null,
          panNo: customerPanNo.trim() || null,
          buyerErpId: buyerErpId.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save customer.");
      }

      await loadCustomers();

      if (data.customer) {
        selectCustomer(data.customer);
      }

      alert("Customer saved successfully.");
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save customer."
      );
    } finally {
      setCustomerSaving(false);
    }
  }

  /*
   * ==================================================
   * UPDATE CUSTOMER
   * ==================================================
   */

  async function updateCustomer() {
    if (!selectedCustomer) {
      return;
    }

    if (!customerName.trim()) {
      alert("Customer name is required.");
      return;
    }

    try {
      setCustomerSaving(true);

      const response = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: customerName.trim(),
          phone: customerPhone.trim() || null,
          address: customerAddress.trim() || null,
          gstNo: customerGstNo.trim() || null,
          panNo: customerPanNo.trim() || null,
          buyerErpId: buyerErpId.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update customer.");
      }

      await loadCustomers();

      if (data.customer) {
        selectCustomer(data.customer);
      }

      alert("Customer updated successfully.");
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update customer."
      );
    } finally {
      setCustomerSaving(false);
    }
  }

  /*
   * ==================================================
   * DELETE CUSTOMER
   * ==================================================
   */

  async function deleteCustomer() {
    if (!selectedCustomer) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${selectedCustomer.name}" permanently?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setCustomerSaving(true);

      const response = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete customer.");
      }

      setCustomers((current) =>
        current.filter((customer) => customer.id !== selectedCustomer.id)
      );

      clearSelectedCustomer();
      alert("Customer deleted successfully.");
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete customer."
      );
    } finally {
      setCustomerSaving(false);
    }
  }

  /*
   * ==================================================
   * PRODUCT SEARCH
   * ==================================================
   */

  const filteredProducts = products.filter((product) => {
    if (!product.isActive) {
      return false;
    }

    if (product.quantity <= 0) {
      return false;
    }

    const searchText = search.toLowerCase().trim();

    if (!searchText) {
      return true;
    }

    return (
      product.name.toLowerCase().includes(searchText) ||
      (product.itemErpId || "").toLowerCase().includes(searchText)
    );
  });

  /*
   * ==================================================
   * SELECT PRODUCT
   * ==================================================
   */

function selectProduct(product: Product) {
  setSelectedProduct(product);
  setSearch(product.name);
  setQuantity("");

  // Always bill in pieces when a piece/base unit is available.
  // Box/unit remains available in the dropdown for intentional selection.
  setSelectedUnit(product.baseUnit || product.unit || "Piece");
}

  /*
   * ==================================================
   * UNIT & PRICE CONVERSION HELPERS
   * ==================================================
   */

  function getConversionFactor(product: Product, unit: string) {
    if (unit === product.baseUnit) {
      return 1;
    }

    if (unit === product.unit) {
      return Number(product.piecesPerUnit || 1);
    }

    return 1;
  }

  function getBaseQuantity(
    product: Product,
    quantity: number,
    unit: string,
    freeQuantity = 0
  ) {
    const conversion = getConversionFactor(product, unit);
    return (quantity + freeQuantity) * conversion;
  }

  function getSellingPrice(product: Product, unit: string) {
    const price = Number(product.priceBeforeGst || 0);

    if (unit === product.baseUnit) {
      const conversion = Number(product.piecesPerUnit || 1);
      return price / conversion;
    }

    return price;
  }

  /*
   * ==================================================
   * ADD ITEM
   * ==================================================
   */

  function addItem() {
    if (!selectedProduct) {
      alert("Please select a product.");
      return;
    }

    const qty = Number(quantity);

    if (!Number.isFinite(qty) || qty <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    const unit =
      selectedUnit ||
      selectedProduct.unit ||
      selectedProduct.baseUnit ||
      "Piece";

    const requiredStock = getBaseQuantity(selectedProduct, qty, unit);

    if (requiredStock > selectedProduct.quantity) {
      alert(
        `Insufficient stock. Available: ${selectedProduct.quantity} ${
          selectedProduct.baseUnit || selectedProduct.unit
        }. Required: ${requiredStock} ${
          selectedProduct.baseUnit || selectedProduct.unit
        }.`
      );
      return;
    }

    const existingItem = billItems.find(
      (item) => item.product.id === selectedProduct.id
    );

    if (existingItem) {
      if (existingItem.unit !== unit) {
        alert(
          "This product is already added with another unit. Remove it first or use the same unit."
        );
        return;
      }

      const newQuantity = existingItem.quantity + qty;

      const required = getBaseQuantity(
        selectedProduct,
        newQuantity,
        unit,
        existingItem.freeQuantity
      );

      if (required > selectedProduct.quantity) {
        alert(
          `Insufficient stock. Available: ${selectedProduct.quantity} ${
            selectedProduct.baseUnit || selectedProduct.unit
          }.`
        );
        return;
      }

      setBillItems(
        billItems.map((item) =>
          item.product.id === selectedProduct.id
            ? {
                ...item,
                quantity: newQuantity,
              }
            : item
        )
      );
    } else {
      setBillItems([
        ...billItems,
        {
          product: selectedProduct,
          quantity: qty,
          freeQuantity: 0,
          unit,
          soNo: "",
          secondaryDiscount: "0",
          cashDiscount: "0",
        },
      ]);
    }

    setSearch("");
    setSelectedProduct(null);
    setQuantity("");
    setSelectedUnit("");
  }

  /*
   * ==================================================
   * REMOVE ITEM
   * ==================================================
   */

  function removeItem(productId: number) {
    setBillItems(billItems.filter((item) => item.product.id !== productId));
  }

  function changeQuantity(productId: number, value: string) {
    const qty = Number(value);

    if (!value || qty <= 0) {
      return;
    }

    setBillItems(
      billItems.map((item) => {
        if (item.product.id !== productId) {
          return item;
        }

        const requiredStock = getBaseQuantity(
          item.product,
          qty,
          item.unit,
          item.freeQuantity
        );

        if (requiredStock > item.product.quantity) {
          alert(
            `Only ${item.product.quantity} ${
              item.product.baseUnit || item.product.unit
            } available.`
          );
          return item;
        }

        return {
          ...item,
          quantity: qty,
        };
      })
    );
  }

  function changeFreeQuantity(productId: number, value: string) {
    const freeQty = Number(value);

    if (!value || freeQty < 0) {
      return;
    }

    setBillItems(
      billItems.map((item) => {
        if (item.product.id !== productId) {
          return item;
        }

        const requiredStock = getBaseQuantity(
          item.product,
          item.quantity,
          item.unit,
          freeQty
        );

        if (requiredStock > item.product.quantity) {
          alert(
            `Insufficient stock.\n\n` +
              `Available: ${item.product.quantity} ${
                item.product.baseUnit || item.product.unit
              }\n` +
              `Required: ${requiredStock} ${
                item.product.baseUnit || item.product.unit
              }`
          );
          return item;
        }

        return {
          ...item,
          freeQuantity: freeQty,
        };
      })
    );
  }

  /*
   * ==================================================
   * DISCOUNTS
   * ==================================================
   */

  function changeDiscount(
    productId: number,
    field: "secondaryDiscount" | "cashDiscount",
    value: string
  ) {
    setBillItems(
      billItems.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  /*
   * ==================================================
   * SO NUMBER
   * ==================================================
   */

  function changeSoNo(productId: number, value: string) {
    setBillItems(
      billItems.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              soNo: value,
            }
          : item
      )
    );
  }

  /*
   * ==================================================
   * TOTALS
   * ==================================================
   */

  const subtotal = useMemo(() => {
    return billItems.reduce((total, item) => {
      const gross =
        getSellingPrice(item.product, item.unit) * item.quantity;

      const discount =
        Number(item.secondaryDiscount || 0) +
        Number(item.cashDiscount || 0);

      const taxableValue = Math.max(0, gross - discount);

      return total + taxableValue;
    }, 0);
  }, [billItems]);

  const gstAmount = useMemo(() => {
    return billItems.reduce((total, item) => {
      const gross =
        getSellingPrice(item.product, item.unit) * item.quantity;

      const discount =
        Number(item.secondaryDiscount || 0) +
        Number(item.cashDiscount || 0);

      const taxableValue = Math.max(0, gross - discount);

      const gst = (taxableValue * item.product.gstPercent) / 100;

      return total + gst;
    }, 0);
  }, [billItems]);

  const grandTotal = subtotal + gstAmount;

  /*
   * ==================================================
   * GENERATE BILL
   * ==================================================
   */

  async function generateBill() {
    if (billItems.length === 0) {
      alert("Please add at least one product.");
      return;
    }

    try {
      setLoading(true);

      let finalCustomer = selectedCustomer;

      if (customerName.trim()) {
        const customerPayload = {
          name: customerName.trim(),
          phone: customerPhone.trim() || null,
          address: customerAddress.trim() || null,
          gstNo: customerGstNo.trim() || null,
          panNo: customerPanNo.trim() || null,
          buyerErpId: buyerErpId.trim() || null,
        };

        if (selectedCustomer) {
          const customerResponse = await fetch(
            `/api/customers/${selectedCustomer.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(customerPayload),
            }
          );

          const customerData = await customerResponse.json();

          if (!customerResponse.ok) {
            throw new Error(
              customerData.error || "Failed to update customer."
            );
          }

          finalCustomer = customerData.customer || selectedCustomer;
        } else {
          const customerResponse = await fetch("/api/customers", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(customerPayload),
          });

          const customerData = await customerResponse.json();

          if (!customerResponse.ok) {
            throw new Error(
              customerData.error || "Failed to save customer."
            );
          }

          finalCustomer = customerData.customer || null;
        }
      }

      const response = await fetch("/api/billing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: customerName.trim() || null,
          customerPhone: customerPhone.trim() || null,
          customerAddress: customerAddress.trim() || null,
          customerGstNo: customerGstNo.trim() || null,
          customerPanNo: customerPanNo.trim() || null,
          buyerErpId: buyerErpId.trim() || null,
          salesmanName: salesmanName.trim() || null,
          routeName: routeName.trim() || null,
          paymentMethod,
          items: billItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            freeQuantity: item.freeQuantity,
            unit: item.unit,
            soNo: item.soNo.trim() || null,
            secondaryDiscount: Number(item.secondaryDiscount || 0),
            cashDiscount: Number(item.cashDiscount || 0),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create bill.");
      }

      const sale = data.sale;

      const invoiceItems: InvoiceItem[] = sale.items.map(
        (item: InvoiceItem) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          itemErpId: item.itemErpId,
          quantity: item.quantity,
          freeQuantity: item.freeQuantity,
          unit: item.unit,
          mrp: item.mrp,
          priceBeforeGst: item.priceBeforeGst,
          gstPercent: item.gstPercent,
          secondaryDiscount: item.secondaryDiscount,
          cashDiscount: item.cashDiscount,
          taxableValue: item.taxableValue,
          gstAmount: item.gstAmount,
          total: item.total,
          soNo: item.soNo,
        })
      );

      setInvoice({
        invoiceNo: sale.invoiceNo,
        company: sale.company,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone,
        customerAddress: sale.customerAddress,
        customerGstNo: sale.customerGstNo,
        customerPanNo: sale.customerPanNo,
        buyerErpId: sale.buyerErpId,
        salesmanName: sale.salesmanName,
        routeName: sale.routeName,
        paymentMethod: sale.paymentMethod,
        subtotal: sale.subtotal,
        gstAmount: sale.gstAmount,
        grandTotal: sale.grandTotal,
        createdAt: sale.createdAt,
        items: invoiceItems,
      });

      if (finalCustomer) {
        setSelectedCustomer(finalCustomer);
        setCustomerSearch(finalCustomer.name);
        setCustomerName(finalCustomer.name);
        setCustomerPhone(finalCustomer.phone || "");
        setCustomerAddress(finalCustomer.address || "");
        setCustomerGstNo(finalCustomer.gstNo || "");
        setCustomerPanNo(finalCustomer.panNo || "");
        setBuyerErpId(finalCustomer.buyerErpId || "");
        setShowCustomerResults(false);
      }

      setBillItems([]);
      setSearch("");
      setSelectedProduct(null);
      setQuantity("");

      await loadProducts();
      await loadCustomers();
    } catch (error) {
      console.error("Generate bill error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to create bill."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ==================================================
   * CLEAR BILL
   * ==================================================
   */

  function clearBill() {
    setBillItems([]);
    setSearch("");
    setSelectedProduct(null);
    setQuantity("");
  }

  /*
   * ==================================================
   * PRINT
   * ==================================================
   */

  function printInvoice() {
    window.print();
  }

  /*
   * ==================================================
   * INVOICE SCREEN
   * ==================================================
   */

  if (invoice) {
    return (
      <main className="min-h-screen bg-gray-200 p-4 sm:p-8 print:bg-white print:p-0">
        <div className="mx-auto max-w-[210mm]">
          <div className="mb-5 flex flex-wrap gap-3 print:hidden">
            <button
              onClick={printInvoice}
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              🖨️ Print Invoice
            </button>

            <button
              onClick={() => setInvoice(null)}
              className="rounded-lg border bg-white px-5 py-3 font-medium hover:bg-gray-50"
            >
              ← New Bill
            </button>

            <a
              href="/"
              className="rounded-lg border bg-white px-5 py-3 font-medium hover:bg-gray-50"
            >
              Dashboard
            </a>
          </div>

          <InvoiceDocument invoice={invoice} />
        </div>
      </main>
    );
  }

  /*
   * ==================================================
   * BILLING SCREEN
   * ==================================================
   */

  return (
    <main className="min-h-screen bg-gray-100">
      <CompanyHeader pageTitle="Billing" />

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT */}
          <div className="space-y-6 lg:col-span-2">
            {/* CUSTOMER DETAILS */}
            <div className="rounded-xl bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h2 className="text-lg font-semibold">Customer Details</h2>
                <p className="text-sm text-gray-500">
                  Search a saved customer or create a new one.
                </p>
              </div>

              <div className="space-y-4 p-5">
                {/* CUSTOMER SEARCH */}
                <div className="relative">
                  <label className="mb-1 block text-sm font-medium">
                    Search Saved Customer
                  </label>

                  <input
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setSelectedCustomer(null);
                      setShowCustomerResults(true);
                    }}
                    onFocus={() => setShowCustomerResults(true)}
                    placeholder="Search name, phone, ERP ID or GST..."
                    className="w-full rounded-lg border px-3 py-3 outline-none focus:border-blue-500"
                  />

                  {showCustomerResults &&
                    customerSearch.trim() &&
                    filteredCustomers.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-30 max-h-64 overflow-y-auto rounded-lg border bg-white shadow-xl">
                        {filteredCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => selectCustomer(customer)}
                            className="block w-full border-b px-4 py-3 text-left hover:bg-blue-50"
                          >
                            <p className="font-semibold">{customer.name}</p>
                            <p className="text-xs text-gray-500">
                              Phone: {customer.phone || "-"} • ERP:{" "}
                              {customer.buyerErpId || "-"} • GST:{" "}
                              {customer.gstNo || "-"}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}

                  {showCustomerResults &&
                    customerSearch.trim() &&
                    filteredCustomers.length === 0 && (
                      <div className="absolute left-0 right-0 top-full z-30 rounded-lg border bg-white p-4 shadow-xl">
                        <p className="text-sm text-gray-500">
                          No saved customer found.
                        </p>
                      </div>
                    )}
                </div>

                {/* SELECTED CUSTOMER */}
                {selectedCustomer && (
                  <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-green-700">
                        Saved Customer
                      </p>
                      <p className="font-bold text-green-900">
                        {selectedCustomer.name}
                      </p>
                      <p className="text-sm text-green-700">
                        Customer ID: {selectedCustomer.id}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={clearSelectedCustomer}
                      className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-600"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {/* FIELDS */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Customer Name
                    </label>
                    <input
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setSelectedCustomer(null);
                      }}
                      placeholder="ABC Stores"
                      className="w-full rounded-lg border px-3 py-2.5"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Phone
                    </label>
                    <input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full rounded-lg border px-3 py-2.5"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium">
                      Address
                    </label>
                    <textarea
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      rows={2}
                      placeholder="Customer address"
                      className="w-full rounded-lg border px-3 py-2.5"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Customer GST No.
                    </label>
                    <input
                      value={customerGstNo}
                      onChange={(e) =>
                        setCustomerGstNo(e.target.value.toUpperCase())
                      }
                      placeholder="GSTIN"
                      className="w-full rounded-lg border px-3 py-2.5 uppercase"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Customer PAN No.
                    </label>
                    <input
                      value={customerPanNo}
                      onChange={(e) =>
                        setCustomerPanNo(e.target.value.toUpperCase())
                      }
                      placeholder="PAN"
                      className="w-full rounded-lg border px-3 py-2.5 uppercase"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Buyer ERP ID
                    </label>
                    <input
                      value={buyerErpId}
                      onChange={(e) => setBuyerErpId(e.target.value)}
                      placeholder="ERP ID"
                      className="w-full rounded-lg border px-3 py-2.5"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Salesman
                    </label>
                    <input
                      value={salesmanName}
                      onChange={(e) => setSalesmanName(e.target.value)}
                      placeholder="Salesman"
                      className="w-full rounded-lg border px-3 py-2.5"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Route
                    </label>
                    <input
                      value={routeName}
                      onChange={(e) => setRouteName(e.target.value)}
                      placeholder="Route"
                      className="w-full rounded-lg border px-3 py-2.5"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Payment
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-lg border bg-white px-3 py-2.5"
                    >
                      <option>Cash</option>
                      <option>UPI</option>
                      <option>Card</option>
                      <option>Credit</option>
                      <option>Bank Transfer</option>
                    </select>
                  </div>
                </div>

                {/* CUSTOMER ACTIONS */}
                <div className="flex flex-wrap gap-3">
                  {!selectedCustomer && (
                    <button
                      type="button"
                      disabled={customerSaving}
                      onClick={saveCustomer}
                      className="rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {customerSaving ? "Saving..." : "Save Customer"}
                    </button>
                  )}

                  {selectedCustomer && (
                    <button
                      type="button"
                      disabled={customerSaving}
                      onClick={updateCustomer}
                      className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2.5 font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      {customerSaving ? "Updating..." : "Update Customer"}
                    </button>
                  )}

                  {selectedCustomer && (
                    <button
                      type="button"
                      disabled={customerSaving}
                      onClick={deleteCustomer}
                      className="rounded-lg bg-red-50 px-4 py-2.5 font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      Delete Customer
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* PRODUCT SEARCH */}
            <div className="rounded-xl bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h2 className="text-lg font-semibold">Add Products</h2>
              </div>

              <div className="space-y-5 p-5">
                <div className="relative">
                  <label className="mb-1 block text-sm font-medium">
                    Product
                  </label>

                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSelectedProduct(null);
                    }}
                    placeholder="Search product or ERP ID..."
                    className="w-full rounded-lg border px-3 py-3"
                  />

                  {search &&
                    !selectedProduct &&
                    filteredProducts.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-20 max-h-64 overflow-y-auto rounded-lg border bg-white shadow-xl">
                        {filteredProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => selectProduct(product)}
                            className="block w-full border-b px-4 py-3 text-left hover:bg-blue-50"
                          >
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-gray-500">
                              ERP: {product.itemErpId || "-"} • Stock:{" "}
                              {product.quantity} {product.unit} • Price:{" "}
                              {money(product.priceBeforeGst)}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                </div>

                {selectedProduct && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{selectedProduct.name}</p>
                        <div className="text-sm text-gray-600">
                          <p>ERP: {selectedProduct.itemErpId || "-"}</p>
                          <p className="mt-1">
  Available:{" "}
  {selectedProduct.piecesPerUnit &&
  selectedProduct.piecesPerUnit > 1
    ? `${formatAvailableStock(
        selectedProduct.quantity,
        selectedProduct.piecesPerUnit,
        selectedProduct.unit,
        selectedProduct.baseUnit || "Piece"
      )} (${selectedProduct.quantity} ${
        selectedProduct.baseUnit || "Piece"
      })`
    : `${selectedProduct.quantity} ${
        selectedProduct.baseUnit || selectedProduct.unit
      }`}
</p>
                          {selectedProduct.piecesPerUnit &&
                            selectedProduct.piecesPerUnit > 1 && (
                              <p className="mt-1 text-xs font-medium text-blue-700">
                                1 {selectedProduct.unit} ={" "}
                                {selectedProduct.piecesPerUnit}{" "}
                                {selectedProduct.baseUnit}
                              </p>
                            )}
                        </div>
                      </div>

                      <p className="text-lg font-bold text-blue-700">
                        {money(selectedProduct.priceAfterGst)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    disabled={!selectedProduct}
                    placeholder="Quantity"
                    className="flex-1 rounded-lg border px-3 py-3 disabled:bg-gray-100"
                  />

                  <select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    disabled={!selectedProduct}
                    className="w-32 rounded-lg border bg-white px-3 py-3 disabled:bg-gray-100"
                  >
                    {selectedProduct && (
                      <>
                        <option value={selectedProduct.unit}>
                          {selectedProduct.unit}
                        </option>

                        {selectedProduct.baseUnit &&
                          selectedProduct.baseUnit !==
                            selectedProduct.unit && (
                            <option value={selectedProduct.baseUnit}>
                              {selectedProduct.baseUnit}
                            </option>
                          )}
                      </>
                    )}
                  </select>

                  <button
                    onClick={addItem}
                    disabled={!selectedProduct}
                    className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>

            {/* BILL ITEMS */}
            <div className="rounded-xl bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h2 className="text-lg font-semibold">Invoice Items</h2>
              </div>

              {billItems.length === 0 ? (
                <div className="px-5 py-12 text-center text-gray-500">
                  No products added.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-left text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3">#</th>
                        <th className="px-3 py-3">SO No.</th>
                        <th className="px-3 py-3">Product</th>
                        <th className="px-3 py-3">MRP</th>
                        <th className="px-3 py-3">Qty / Unit</th>
                        <th className="px-3 py-3">Free</th>
                        <th className="px-3 py-3">Price</th>
                        <th className="px-3 py-3">Sec. Disc.</th>
                        <th className="px-3 py-3">Cash Disc.</th>
                        <th className="px-3 py-3">Taxable</th>
                        <th className="px-3 py-3">GST</th>
                        <th className="px-3 py-3">Total</th>
                        <th className="px-3 py-3">Remove</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {billItems.map((item, index) => {
                        const unitPrice = getSellingPrice(
                          item.product,
                          item.unit
                        );
                        const gross = unitPrice * item.quantity;

                        const discount =
                          Number(item.secondaryDiscount || 0) +
                          Number(item.cashDiscount || 0);

                        const taxable = Math.max(0, gross - discount);

                        const gst =
                          (taxable * item.product.gstPercent) / 100;

                        const total = taxable + gst;

                        return (
                          <tr key={item.product.id}>
                            <td className="px-3 py-4">{index + 1}</td>

                            <td className="px-3 py-4">
                              <input
                                value={item.soNo}
                                onChange={(e) =>
                                  changeSoNo(item.product.id, e.target.value)
                                }
                                placeholder="SO"
                                className="w-24 rounded border px-2 py-1"
                              />
                            </td>

                            <td className="px-3 py-4">
                              <p className="font-medium">
                                {item.product.name}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                ERP: {item.product.itemErpId || "-"}
                              </p>
                            </td>

                            <td className="px-3 py-4">
                              {money(item.product.mrp)}
                            </td>

                            <td className="px-3 py-4">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    changeQuantity(
                                      item.product.id,
                                      e.target.value
                                    )
                                  }
                                  className="w-16 rounded border px-2 py-1"
                                />
                                <span className="font-medium">
                                  {item.unit}
                                </span>
                              </div>
                            </td>

                            <td className="px-3 py-4">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={item.freeQuantity}
                                onChange={(e) =>
                                  changeFreeQuantity(
                                    item.product.id,
                                    e.target.value
                                  )
                                }
                                className="w-20 rounded border px-2 py-1"
                              />
                            </td>

                            <td className="px-3 py-4">
                              {money(unitPrice)}
                            </td>

                            <td className="px-3 py-4">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={item.secondaryDiscount}
                                onChange={(e) =>
                                  changeDiscount(
                                    item.product.id,
                                    "secondaryDiscount",
                                    e.target.value
                                  )
                                }
                                className="w-20 rounded border px-2 py-1"
                              />
                            </td>

                            <td className="px-3 py-4">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={item.cashDiscount}
                                onChange={(e) =>
                                  changeDiscount(
                                    item.product.id,
                                    "cashDiscount",
                                    e.target.value
                                  )
                                }
                                className="w-20 rounded border px-2 py-1"
                              />
                            </td>

                            <td className="px-3 py-4 font-medium">
                              {money(taxable)}
                            </td>

                            <td className="px-3 py-4">
                              {item.product.gstPercent}%
                              <br />
                              {money(gst)}
                            </td>

                            <td className="px-3 py-4 font-bold">
                              {money(total)}
                            </td>

                            <td className="px-3 py-4">
                              <button
                                onClick={() =>
                                  removeItem(item.product.id)
                                }
                                className="text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
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

          {/* SUMMARY */}
          <div>
            <div className="sticky top-6 rounded-xl bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h2 className="text-lg font-semibold">Bill Summary</h2>
              </div>

              <div className="space-y-4 p-5">
                <div className="flex justify-between text-sm">
                  <span>Products</span>
                  <span>{billItems.length}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>Taxable Value</span>
                  <span>{money(subtotal)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>Total GST</span>
                  <span>{money(gstAmount)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>Payment</span>
                  <span className="font-medium">{paymentMethod}</span>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Grand Total</span>
                    <span className="text-2xl font-bold text-blue-700">
                      {money(grandTotal)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={generateBill}
                  disabled={loading || billItems.length === 0}
                  className="w-full rounded-lg bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? "Creating Bill..." : "Generate Tax Invoice"}
                </button>

                <button
                  onClick={clearBill}
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 font-medium disabled:opacity-50"
                >
                  Clear Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}