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
  const { user } = useAuth();
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

  const calculateTotal = () => {
    return invoice.items.reduce(
      (total, item) => total + parseFloat(item.price) * item.quantity,
      0,
    );
  };

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

            <InvoiceMeta invoice={invoice} customer={customer} />

            <InvoiceItemsTable
                searchTerm={searchTerm}
                debouncedSearch={debouncedSearch}
                onSearchChange={handleSearchChange}
                filteredItems={filteredItems}
                total={total}
            />

            <PdfInvoicePreview
                invoiceRef={invoiceRef}
                invoice={invoice}
                customer={customer}
                sender={sender}
            />
        </div>
    );
}

export default InvoiceDetail;
