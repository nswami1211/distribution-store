"use client";

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

export type InvoiceData = {
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

type Props = {
  invoice: InvoiceData;
};

const ITEMS_PER_PAGE = 10;

function money(value: number | null | undefined) {
  return `₹${Number(value ?? 0).toFixed(2)}`;
}

function amountInWords(amount: number) {
  const number = Math.round(Number(amount || 0));

  if (number === 0) return "Zero Rupees Only";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function underThousand(n: number): string {
    let result = "";

    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }

    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }

    if (n > 0) {
      result += ones[n] + " ";
    }

    return result.trim();
  }

  let result = "";

  if (number >= 10000000) {
    result += underThousand(Math.floor(number / 10000000)) + " Crore ";
    amount %= 10000000;
  }

  if (number >= 100000) {
    result += underThousand(Math.floor(number / 100000)) + " Lakh ";
    amount %= 100000;
  }

  if (number >= 1000) {
    result += underThousand(Math.floor(number / 1000)) + " Thousand ";
    amount %= 1000;
  }

  if (number > 0) {
    result += underThousand(number);
  }

  return `${result.trim()} Rupees Only`;
}

export default function InvoiceDocument({ invoice }: Props) {
  const company = invoice.company;

  const companyName =
    company?.shopName?.trim() ||
    company?.name?.trim() ||
    "Distribution Store";

  const companyAddress = [
    company?.address,
    company?.city,
    company?.state,
    company?.pincode,
  ]
    .filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
    )
    .join(", ");

  const invoiceDate = new Date(
    invoice.createdAt
  ).toLocaleDateString("en-IN");

  /*
   * EXACT PAGINATION RULE:
   * maximum 10 actual items per page.
   * No artificial/blank rows.
   */
  const pages: InvoiceItem[][] = [];

  for (
    let i = 0;
    i < invoice.items.length;
    i += ITEMS_PER_PAGE
  ) {
    pages.push(
      invoice.items.slice(i, i + ITEMS_PER_PAGE)
    );
  }

  // Still render one page if there are no items.
  if (pages.length === 0) {
    pages.push([]);
  }

  const totalPages = pages.length;

  return (
    <>
      <div id="invoice">
        {pages.map((pageItems, pageIndex) => {
          const isFirstPage = pageIndex === 0;
          const isLastPage =
            pageIndex === totalPages - 1;

          const startIndex =
            pageIndex * ITEMS_PER_PAGE;

          return (
            <div
              key={pageIndex}
              className={`invoice-page ${
                pageIndex > 0 ? "page-break" : ""
              }`}
            >
              <div className="invoice-border">

                {/* TOP COPY / TITLE */}
                <div className="top-strip">
                  <span>Seller Copy</span>
                  <strong>TAX INVOICE</strong>
                  <span>Original for Recipient</span>
                </div>

                {/* SELLER */}
                <div className="seller-section">
                  <div className="seller-left">
                    <h1>{companyName}</h1>

                    {companyAddress && (
                      <div>{companyAddress}</div>
                    )}

                    {company.phone && (
                      <div>
                        Phone: {company.phone}
                      </div>
                    )}
                  </div>

                  <div className="seller-right">
                    {company.gstin && (
                      <div>
                        <strong>GSTIN:</strong>{" "}
                        {company.gstin}
                      </div>
                    )}

                    {company.pan && (
                      <div>
                        <strong>PAN:</strong>{" "}
                        {company.pan}
                      </div>
                    )}

                    {company.email && (
                      <div>
                        <strong>Email:</strong>{" "}
                        {company.email}
                      </div>
                    )}
                  </div>
                </div>

                {/* INVOICE INFORMATION */}
                <div className="invoice-info">
                  <div>
                    <strong>Invoice No.</strong>
                    <span>{invoice.invoiceNo}</span>
                  </div>

                  <div>
                    <strong>Invoice Date</strong>
                    <span>{invoiceDate}</span>
                  </div>

                  <div>
                    <strong>Payment</strong>
                    <span>
                      {invoice.paymentMethod}
                    </span>
                  </div>
                </div>

                {/* BUYER INFORMATION */}
                {isFirstPage && (
                  <div className="buyer-section">
                    <div className="buyer-box">
                      <div className="section-title">
                        BILL TO
                      </div>

                      <strong>
                        {invoice.customerName ||
                          "Walk-in Customer"}
                      </strong>

                      {invoice.customerPhone && (
                        <div>
                          Phone:{" "}
                          {invoice.customerPhone}
                        </div>
                      )}

                      {invoice.customerAddress && (
                        <div>
                          {invoice.customerAddress}
                        </div>
                      )}

                      {invoice.customerGstNo && (
                        <div>
                          GSTIN:{" "}
                          {invoice.customerGstNo}
                        </div>
                      )}

                      {invoice.customerPanNo && (
                        <div>
                          PAN:{" "}
                          {invoice.customerPanNo}
                        </div>
                      )}
                    </div>

                    <div className="buyer-box">
                      <div className="section-title">
                        CUSTOMER DETAILS
                      </div>

                      <div>
                        <strong>ERP ID:</strong>{" "}
                        {invoice.buyerErpId || "-"}
                      </div>

                      <div>
                        <strong>Salesman:</strong>{" "}
                        {invoice.salesmanName || "-"}
                      </div>

                      <div>
                        <strong>Route:</strong>{" "}
                        {invoice.routeName || "-"}
                      </div>
                    </div>
                  </div>
                )}

                {/* ITEMS */}
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>S No.</th>
                      <th>SO NO.</th>
                      <th>Item ERP Id</th>
                      <th>Item Name</th>
                      <th>MRP (₹)</th>
                      <th>Free Qty</th>
                      <th>Invoice/Delivery Qty</th>
                      <th>Price/Piece</th>
                      <th>Net Amt (₹)</th>
                      <th>
                        Secondary Dis. (₹)(%)
                      </th>
                      <th>
                        Cash Dis. (₹)(%)
                      </th>
                      <th>Taxable Value (₹)</th>
                      <th>GST (%)</th>
                      <th>GST Amt (₹)</th>
                      <th>Total Value (₹)</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pageItems.map(
                      (item, itemIndex) => {
                        const serial =
                          startIndex +
                          itemIndex +
                          1;

                        const netAmount =
                          Number(item.quantity || 0) *
                          Number(
                            item.priceBeforeGst || 0
                          );

                        return (
                          <tr key={item.id}>
                            <td className="center">
                              {serial}
                            </td>

                            <td className="center">
                              {item.soNo || "-"}
                            </td>

                            <td className="center">
                              {item.itemErpId || "-"}
                            </td>

                            <td className="item-name">
                              {item.productName}
                            </td>

                            <td className="number">
                              {money(item.mrp)}
                            </td>

                            <td className="center">
                              {item.freeQuantity}
                            </td>

                            <td className="center">
                              {item.quantity}
                            </td>

                            <td className="number">
                              {money(
                                item.priceBeforeGst
                              )}
                            </td>

                            <td className="number">
                              {money(netAmount)}
                            </td>

                            <td className="number">
                              {money(
                                item.secondaryDiscount
                              )}
                            </td>

                            <td className="number">
                              {money(
                                item.cashDiscount
                              )}
                            </td>

                            <td className="number">
                              {money(
                                item.taxableValue
                              )}
                            </td>

                            <td className="center">
                              {item.gstPercent}%
                            </td>

                            <td className="number">
                              {money(
                                item.gstAmount
                              )}
                            </td>

                            <td className="number bold">
                              {money(item.total)}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>

                {/* ONLY LAST PAGE GETS TOTALS */}
                {isLastPage && (
                  <>
                    <div className="summary-section">
                      <div className="amount-words">
                        <strong>
                          Amount in Words
                        </strong>

                        <div>
                          {amountInWords(
                            invoice.grandTotal
                          )}
                        </div>

                        <div className="payment-line">
                          <strong>
                            Payment Method:
                          </strong>{" "}
                          {invoice.paymentMethod}
                        </div>
                      </div>

                      <div className="totals">
                        <div>
                          <span>
                            Taxable Value
                          </span>
                          <span>
                            {money(
                              invoice.subtotal
                            )}
                          </span>
                        </div>

                        <div>
                          <span>GST</span>
                          <span>
                            {money(
                              invoice.gstAmount
                            )}
                          </span>
                        </div>

                        <div className="gst-split">
                          <span>CGST</span>
                          <span>
                            {money(
                              Number(
                                invoice.gstAmount
                              ) / 2
                            )}
                          </span>
                        </div>

                        <div className="gst-split">
                          <span>SGST</span>
                          <span>
                            {money(
                              Number(
                                invoice.gstAmount
                              ) / 2
                            )}
                          </span>
                        </div>

                        <div className="grand-total">
                          <strong>
                            TOTAL VALUE
                          </strong>

                          <strong>
                            {money(
                              invoice.grandTotal
                            )}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="footer-section">
                      <div>
                        <strong>
                          Terms & Conditions
                        </strong>

                        <p>
                          Goods once sold will not
                          be taken back.
                        </p>

                        <p>
                          Subject to local
                          jurisdiction.
                        </p>
                      </div>

                      <div className="signature">
                        <strong>
                          For {companyName}
                        </strong>

                        <div className="signature-space" />

                        <span>
                          Authorised Signatory
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {!isLastPage && (
                  <div className="continued">
                    Continued on next page...
                  </div>
                )}

                <div className="page-number">
                  Page {pageIndex + 1} of{" "}
                  {totalPages}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 5mm;
        }

        * {
          box-sizing: border-box;
        }

        .invoice-page {
          width: 287mm;
          min-height: 200mm;
          background: white;
          color: black;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 8px;
        }

        .page-break {
          break-before: page;
          page-break-before: always;
        }

        .invoice-border {
          width: 100%;
          min-height: 200mm;
          border: 1.5px solid #000;
          position: relative;
        }

        .top-strip {
          height: 7mm;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          align-items: center;
          border-bottom: 1px solid #000;
          padding: 0 3mm;
          font-size: 8px;
        }

        .top-strip strong {
          text-align: center;
          font-size: 11px;
        }

        .top-strip span:last-child {
          text-align: right;
        }

        .seller-section {
          min-height: 23mm;
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid #000;
          padding: 3mm 4mm;
        }

        .seller-left {
          border-right: 1px solid #000;
          padding-right: 4mm;
        }

        .seller-left h1 {
          margin: 0 0 1.5mm;
          font-size: 17px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .seller-right {
          padding-left: 4mm;
          line-height: 1.7;
        }

        .invoice-info {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          border-bottom: 1px solid #000;
        }

        .invoice-info > div {
          min-height: 11mm;
          padding: 2mm 3mm;
          border-right: 1px solid #000;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .invoice-info > div:last-child {
          border-right: 0;
        }

        .invoice-info strong {
          font-size: 7px;
          text-transform: uppercase;
        }

        .invoice-info span {
          margin-top: 1mm;
          font-weight: 700;
          font-size: 9px;
        }

        .buyer-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid #000;
        }

        .buyer-box {
          min-height: 19mm;
          padding: 2.5mm 3mm;
          border-right: 1px solid #000;
          line-height: 1.55;
        }

        .buyer-box:last-child {
          border-right: 0;
        }

        .section-title {
          font-size: 7px;
          font-weight: 800;
          margin-bottom: 1.5mm;
          text-transform: uppercase;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 7px;
        }

        .items-table th {
          height: 13mm;
          padding: 1mm;
          border-right: 1px solid #000;
          border-bottom: 1.5px solid #000;
          text-align: center;
          vertical-align: middle;
          font-weight: 800;
          line-height: 1.2;
          background: #f3f3f3;
        }

        .items-table th:last-child {
          border-right: 0;
        }

        .items-table td {
          height: 6.5mm;
          padding: 1mm;
          border-right: 1px solid #000;
          border-bottom: 1px solid #000;
          vertical-align: middle;
          line-height: 1.15;
          overflow: hidden;
          word-break: break-word;
        }

        .items-table td:last-child {
          border-right: 0;
        }

        .items-table .center {
          text-align: center;
        }

        .items-table .number {
          text-align: right;
          white-space: nowrap;
        }

        .items-table .item-name {
          font-weight: 600;
        }

        .items-table .bold {
          font-weight: 800;
        }

        /* Column widths matching the photographed invoice */
        .items-table th:nth-child(1),
        .items-table td:nth-child(1) {
          width: 4%;
        }

        .items-table th:nth-child(2),
        .items-table td:nth-child(2) {
          width: 5%;
        }

        .items-table th:nth-child(3),
        .items-table td:nth-child(3) {
          width: 7%;
        }

        .items-table th:nth-child(4),
        .items-table td:nth-child(4) {
          width: 16%;
        }

        .items-table th:nth-child(5),
        .items-table td:nth-child(5) {
          width: 6%;
        }

        .items-table th:nth-child(6),
        .items-table td:nth-child(6) {
          width: 5%;
        }

        .items-table th:nth-child(7),
        .items-table td:nth-child(7) {
          width: 7%;
        }

        .items-table th:nth-child(8),
        .items-table td:nth-child(8) {
          width: 7%;
        }

        .items-table th:nth-child(9),
        .items-table td:nth-child(9) {
          width: 7%;
        }

        .items-table th:nth-child(10),
        .items-table td:nth-child(10) {
          width: 8%;
        }

        .items-table th:nth-child(11),
        .items-table td:nth-child(11) {
          width: 8%;
        }

        .items-table th:nth-child(12),
        .items-table td:nth-child(12) {
          width: 8%;
        }

        .items-table th:nth-child(13),
        .items-table td:nth-child(13) {
          width: 4%;
        }

        .items-table th:nth-child(14),
        .items-table td:nth-child(14) {
          width: 7%;
        }

        .items-table th:nth-child(15),
        .items-table td:nth-child(15) {
          width: 8%;
        }

        .summary-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-top: 1.5px solid #000;
        }

        .amount-words {
          min-height: 38mm;
          padding: 3mm;
          border-right: 1px solid #000;
          line-height: 1.7;
        }

        .amount-words > div {
          margin-top: 2mm;
          font-weight: 600;
        }

        .payment-line {
          margin-top: 8mm !important;
        }

        .totals {
          padding: 2mm 3mm;
        }

        .totals > div {
          display: flex;
          justify-content: space-between;
          padding: 1.2mm 0;
        }

        .gst-split {
          font-size: 7px;
        }

        .grand-total {
          margin-top: 1mm;
          padding-top: 2mm !important;
          border-top: 1.5px solid #000;
          font-size: 10px;
        }

        .footer-section {
          min-height: 34mm;
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-top: 1px solid #000;
          padding: 3mm;
        }

        .footer-section p {
          margin: 1mm 0;
          font-size: 7px;
        }

        .signature {
          text-align: right;
        }

        .signature-space {
          height: 15mm;
        }

        .signature span {
          font-size: 7px;
        }

        .continued {
          border-top: 1px solid #000;
          padding: 2mm;
          text-align: right;
          font-size: 7px;
          font-style: italic;
        }

        .page-number {
          position: absolute;
          right: 3mm;
          bottom: 1.5mm;
          font-size: 7px;
        }

        @media screen {
          .invoice-page {
            margin: 10mm auto;
            box-shadow: 0 0 8px rgba(0, 0, 0, 0.25);
          }
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          #invoice,
          #invoice * {
            visibility: visible;
          }

          #invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 287mm;
            margin: 0;
            padding: 0;
          }

          .invoice-page {
            margin: 0 !important;
            box-shadow: none !important;
            break-after: page;
            page-break-after: always;
          }

          .invoice-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }

          .page-break {
            break-before: page;
            page-break-before: always;
          }

          .items-table {
            break-inside: auto;
            page-break-inside: auto;
          }

          .items-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </>
  );
}