/**
 * InvoiceDetail
 *
 * ISSUE: N+1 redundant renders in InvoiceDetail due to missing React.memo
 * Category: Performance & Scalability
 * * This fix introduces a debounced search filter for invoice line items to
 * optimize rendering performance and improve UX for large invoices.
 *
 * Issue: Missing "Export to CSV" action on InvoiceDetail.
 * Category: Functionality Gap / Data Portability
 * Risk: Users cannot export line-item data for accounting workflows.
 * Resolution: Added a dedicated CSV export button with proper CSV escaping,
 * invoice metadata rows, and line-item totals.
 *
 * ISSUE #165: Implement production build size limits and monitoring for InvoiceDetail.
 * Category: DevOps & Infrastructure
 * Description: This page is complex and includes heavy dependencies like html2pdf.js.
 * Build size is monitored via separate chunking in vite.config.js to prevent regression.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Send, Download, Edit, Eye, Search, FileSpreadsheet } from "lucide-react";
import Button from "../../components/forms/Button";
import StatusBadge from "../../components/tables/StatusBadge";
import InvoiceLayout from "../../components/invoice/InvoiceLayout";
import { useData } from "../../context/DataContext";
import { loadSession, useAuth } from "../../context/AuthContext";
import { useDebounce } from "../../hooks/useDebounce";
import { formatUtcDate } from "../../utils/date";

function escapeCsvField(value) {
  const normalized = value == null ? "" : String(value);
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function buildInvoiceCsv(invoice) {
  const rows = [
    ["Invoice ID", invoice.id],
    ["Customer", invoice.customer],
    ["Due Date", formatUtcDate(invoice.dueDate)],
    ["Created", formatUtcDate(invoice.createdAt)],
    [],
    ["Item", "Quantity", "Price (STRK)", "Total (STRK)"],
  ];

  invoice.items.forEach((item) => {
    const quantity = Number(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    rows.push([item.name, quantity, price, quantity * price]);
  });

  const grandTotal = invoice.items.reduce((total, item) => {
    return total + (parseFloat(item.price) || 0) * (Number(item.quantity) || 0);
  }, 0);

  rows.push([]);
  rows.push(["Grand Total", "", "", grandTotal]);

  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\n");
}

function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const invoiceRef = useRef(null);
// user not used - removed to fix ESLint no-unused-vars
  const { invoices, customers } = useData();

  const invoice = invoices.find((inv) => inv.id === id);
  const customer = customers.find((c) => c.id === invoice?.customerId);

  // #21: bail out early if the session expired while the page was open
  useEffect(() => {
    if (!loadSession()) {
      navigate("/signin?reason=expired", { replace: true });
    }
  }, [navigate]);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  /**
   * Filtered items list - Memoized to prevent recalculation on every render
   * only triggers when the debounced value or the invoice data changes.
   */
  const filteredItems = useMemo(() => {
    if (!invoice) return [];
    if (!debouncedSearch.trim()) return invoice.items;

    const term = debouncedSearch.toLowerCase();
    return invoice.items.filter((item) =>
      item.name.toLowerCase().includes(term),
    );
  }, [invoice, debouncedSearch]);

  const handleDownload = async () => {
    const html2pdf = (await import("html2pdf.js")).default;
    const element = invoiceRef.current;

    const options = {
      margin: 0,
      filename: `${invoice.id}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf().set(options).from(element).save();
  };

  const handleExportCsv = () => {
    if (!invoice) return;

    const csvContent = buildInvoiceCsv(invoice);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${invoice.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  };

  if (!invoice) return <div className="p-6">Invoice not found</div>;

  const total = invoice.items.reduce(
    (acc, item) => acc + (parseFloat(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            to="/invoices"
            className="inline-flex items-center gap-1.5 text-sm text-t-muted hover:text-brand transition-colors mb-2"
          >
            <ArrowLeft size={16} /> Back to Invoices
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-t-primary">
              {invoice.id}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={Eye}
            onClick={() => navigate(`/invoice/${invoice.id}`)}
          >
            View Invoice
          </Button>
          <Button variant="secondary" icon={Download} onClick={handleDownload}>
            Download
          </Button>
          <Button variant="secondary" icon={FileSpreadsheet} onClick={handleExportCsv}>
            Export to CSV
          </Button>
          <Button variant="secondary" icon={Send}>
            Send
          </Button>
          <Button variant="primary" icon={Edit}>
            Edit
          </Button>
        </div>
      </div>

      <div ref={invoiceRef}>
        <div className="bg-white border border-border rounded-card p-6 mb-5">
          <h2 className="text-base font-semibold mb-4">Invoice Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <span className="block text-xs text-t-muted mb-1">Customer</span>
              <span className="text-sm font-medium">{invoice.customer}</span>
            </div>
            <div>
              <span className="block text-xs text-t-muted mb-1">Email</span>
              <span className="text-sm font-medium">
                {customer?.email || "N/A"}
              </span>
            </div>
            <div>
              <span className="block text-xs text-t-muted mb-1">Due Date</span>
              <span className="text-sm font-medium">
                {formatUtcDate(invoice.dueDate)}
              </span>
            </div>
            <div>
              <span className="block text-xs text-t-muted mb-1">Created</span>
              <span className="text-sm font-medium">
                {formatUtcDate(invoice.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-card overflow-hidden">
          <div className="p-4 border-b border-border bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-sm">Line Items</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-t-muted" />
              <input
                type="text"
                placeholder="Filter items..."
                className="pl-9 pr-4 py-2 border border-border rounded-lg text-xs focus:ring-1 focus:ring-brand outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-border text-t-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Item</th>
                <th className="px-6 py-3 text-right font-medium">Quantity</th>
                <th className="px-6 py-3 text-right font-medium">Price</th>
                <th className="px-6 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-t-primary">{item.name}</td>
                  <td className="px-6 py-4 text-right text-t-muted">{item.quantity}</td>
                  <td className="px-6 py-4 text-right text-t-muted">{item.price} STRK</td>
                  <td className="px-6 py-4 text-right font-semibold">
                    {(parseFloat(item.price) * item.quantity).toFixed(2)} STRK
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-t-muted">
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50/50">
              <tr>
                <td colSpan="3" className="px-6 py-4 text-right font-medium">Grand Total</td>
                <td className="px-6 py-4 text-right font-bold text-lg text-brand">
                  {total.toFixed(2)} STRK
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default InvoiceDetail;
