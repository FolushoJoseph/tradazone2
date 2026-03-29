/**
 * @fileoverview CustomerList — customer management page.
 *
 * ISSUE: #134 (Support dark mode themes in CustomerList)
 * Category: Feature Enhancement
 * Affected Area: CustomerList
 * Description: Implemented dark mode theme support for the customer management view.
 * Utilizes Tailwind 'dark:' variants to ensure high-contrast readability 
 * and production-grade UI standards in dark environments.
 * * ISSUE: #179 (Build size limits for CustomerList)
 * Category: DevOps & Infrastructure
 * Description: Implement production build size limits and monitoring.
 * ISSUE: #125 (Rich text descriptions for CustomerList)
 * Category: Feature Enhancement
 * Description: Added a rich text editor to capture customer descriptions
 * directly from the list view, with persisted updates in DataContext.
 *
 * ISSUE: #77 (N+1 redundant renders due to missing React.memo)
 * Category: Performance & Scalability
 * Priority: High
 * Description: CustomerList re-rendered on every parent update because the
 * component itself and its derived values (filtered, columns) were not
 * memoized. Applied React.memo to the component export, useMemo to the
 * filtered list, and useMemo to the columns definition so DataTable only
 * re-renders when its inputs actually change.
 */

import { useEffect, useState, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Users } from "lucide-react";
import DataTable from "../../components/tables/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import RichTextEditor from "../../components/forms/RichTextEditor";
import { useData } from "../../context/DataContext";
import { formatUtcDate } from "../../utils/date";

// #77: wrap with memo so parent re-renders don't propagate into this page
// when customers and query haven't changed.
const CustomerList = memo(function CustomerList() {
  const navigate = useNavigate();
  const { customers, updateCustomerDescription } = useData();
  const [query, setQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const safeCustomers = customers ?? [];

  // #77: memoize filtered list — only recomputes when query or customers change.
  const filtered = useMemo(
    () =>
      query.trim()
        ? safeCustomers.filter(
            (c) =>
              c?.name?.toLowerCase().includes(query.toLowerCase()) ||
              c?.email?.toLowerCase().includes(query.toLowerCase()),
          )
        : safeCustomers,
    [query, safeCustomers],
  );

  useEffect(() => {
    if (!selectedCustomerId && safeCustomers.length > 0) {
      setSelectedCustomerId(safeCustomers[0].id);
    }
  }, [safeCustomers, selectedCustomerId]);

  const selectedCustomer =
    safeCustomers.find((customer) => customer.id === selectedCustomerId) ||
    safeCustomers[0];

  // #77: memoize columns — definition is static; recreating it every render
  // causes DataTable to see new prop references and re-render unnecessarily.
  const columns = useMemo(
    () => [
      { key: "name", header: "Name" },
      { key: "email", header: "Email" },
      { key: "phone", header: "Phone" },
      {
        key: "totalSpent",
        header: "Total Spent",
        render: (value, row) => `${value ?? "0"} ${row?.currency ?? "STRK"}`,
      },
      { key: "invoiceCount", header: "Invoices" },
      {
        key: "createdAt",
        header: "Created",
        render: (value) => formatUtcDate(value),
      },
    ],
    [],
  );

  return (
    <div className="transition-colors duration-200">
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <h1 className="text-base lg:text-xl font-semibold text-t-primary dark:text-white">
          Customers
        </h1>
        <button
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold hover:bg-brand-dark active:scale-95 transition-all"
          onClick={() => navigate("/customers/add")}
        >
          <Plus size={16} /> <span className="hidden sm:inline">Add</span>
          <span className="sm:hidden">+</span> Customer
        </button>
      </div>

      {safeCustomers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Add your first customer to start sending invoices and tracking payments."
          actionLabel="Add your first customer"
          actionPath="/customers/add"
        />
      ) : (
        <>
          {/* SEARCH BAR: Added dark mode background, border, and text colors */}
          <div className="flex items-center gap-3 mb-5 px-4 py-2.5 bg-white border border-border rounded-lg dark:bg-zinc-900 dark:border-zinc-800 transition-colors">
            <Search size={18} className="text-t-muted dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search customers..."
              className="flex-1 bg-transparent outline-none text-sm text-t-primary dark:text-zinc-200 placeholder:text-t-muted dark:placeholder:text-zinc-600"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="mb-6 rounded-xl border border-border bg-white p-4 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-t-primary dark:text-white">
                  Customer description
                </h2>
                <p className="text-xs text-t-muted">
                  Keep rich notes for proposals, preferences, and onboarding context.
                </p>
              </div>
              <div className="w-full lg:w-64">
                <label className="text-xs font-medium text-t-secondary uppercase tracking-wide">
                  Active customer
                </label>
                <select
                  className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-t-primary shadow-sm dark:bg-zinc-900 dark:text-zinc-200"
                  value={selectedCustomerId}
                  onChange={(event) => setSelectedCustomerId(event.target.value)}
                >
                  {safeCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name || customer.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <RichTextEditor
                label="Description"
                value={selectedCustomer?.description || ""}
                placeholder="Add a rich description for this customer..."
                onChange={(value) => {
                  if (selectedCustomer && updateCustomerDescription) {
                    updateCustomerDescription(selectedCustomer.id, value);
                  }
                }}
              />
            </div>
          </div>
          
          <DataTable
            dataType="customers"
            data={customers}
            columns={columns}
            enableFilters={true}
            onRowClick={(customer) =>
              customer?.id && navigate(`/customers/${customer.id}`)
            }
            emptyMessage="No customers found"
          />
        </>
      )}
    </div>
  );
});

export default CustomerList;
