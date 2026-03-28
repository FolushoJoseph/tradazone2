import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Package, Trash2 } from "lucide-react";
import DataTable from "../../components/tables/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import { useData } from "../../context/DataContext";

/**
 * ItemsList — catalog of products and services
 * FIX: #123 — Added bulk-delete functionality for items.
 */
function ItemsList() {
  const navigate = useNavigate();
  const { items, deleteItems } = useData();
  const [selectedRows, setSelectedRows] = useState([]);

  const columns = [
    { key: "name", header: "Name" },
    { key: "description", header: "Description" },
    {
      key: "type",
      header: "Type",
      render: (value) => <span className="capitalize">{value}</span>,
    },
    {
      key: "price",
      header: "Price",
      render: (value, row) => `${value} ${row.currency}`,
    },
    { key: "unit", header: "Unit" },
  ];

  const handleDeleteSelected = () => {
    if (
      window.confirm(
        `Are you sure you want to delete ${selectedRows.length} items?`,
      )
    ) {
      deleteItems(selectedRows);
      setSelectedRows([]);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-t-primary">
          Items & Services
        </h1>
        <div className="flex gap-3">
          {selectedRows.length > 0 && (
            <button
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 border border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 active:scale-95 transition-all"
              onClick={handleDeleteSelected}
            >
              <Trash2 size={18} /> Delete ({selectedRows.length})
            </button>
          )}
          <button
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold hover:bg-brand-dark active:scale-95 transition-all"
            onClick={() => navigate("/items/add")}
          >
            <Plus size={18} /> Add Item
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No items or services yet"
          description="Add your products or services to quickly include them in invoices."
          actionLabel="Add your first item"
          actionPath="/items/add"
        />
      ) : (
        <>
          <div className="flex items-center gap-3 mb-5 px-4 py-2.5 bg-white border border-border rounded-lg">
            <Search size={18} className="text-t-muted" />
            <input
              type="text"
              placeholder="Search items and services..."
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
          <DataTable
            dataType="items"
            data={items}
            selectable
            selectedItems={selectedRows}
            onSelectionChange={setSelectedRows}
            columns={columns}
            enableFilters={true}
            onRowClick={(item) => navigate(`/items/${item.id}`)}
          />
        </>
      )}
    </div>
  );
}

export default ItemsList;
