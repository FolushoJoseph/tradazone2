/**
 * DataTable — responsive table with horizontal scroll on mobile.
 *
 * Supports optional filter/sort controls for data sets that opt in through
 * DataContext filter configs, while preserving the original plain table output
 * for callers that do not enable filtering.
 */

import { useCallback, useMemo } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import {
  FILTER_CONFIGS,
  useDataFilters,
  useFilteredData,
} from "../../context/DataContext";
import { useVirtualList } from "../../hooks/useVirtualList";

const FILTER_ROW_HEIGHT = 60;
const VIRTUALIZATION_THRESHOLD = 50;
const ROW_HEIGHT = 52;

const FALLBACK_FILTERS = {
  search: "",
  sort: { field: "", dir: "desc" },
  status: "all",
  dateFrom: "",
  dateTo: "",
  amountMin: "",
  amountMax: "",
};

function DataTable({
  columns,
  data: rawData,
  onRowClick,
  emptyMessage = "No data available",
  className = "",
  selectable = false,
  selectedItems = [],
  onSelectionChange = () => {},
  enableFilters = false,
  dataType = "generic",
}) {
  const dataFilters = useDataFilters(dataType);
  const filters = enableFilters ? dataFilters.filters : FALLBACK_FILTERS;
  const setFilters = dataFilters.setFilters;
  const resetFilters = dataFilters.resetFilters;

  const config = enableFilters
    ? FILTER_CONFIGS[dataType] || { searchableFields: [] }
    : { searchableFields: [] };
  const filteredData = useFilteredData({ data: rawData, filters, config });

  const shouldVirtualize = filteredData.length > VIRTUALIZATION_THRESHOLD;
  const { scrollRef, virtualItems, topPadding, bottomPadding } = useVirtualList({
    items: filteredData,
    itemHeight: ROW_HEIGHT,
  });

  const rowsToRender = shouldVirtualize
    ? virtualItems.map((virtualRow) => ({
        ...virtualRow.item,
        _virtualIndex: virtualRow.index,
      }))
    : filteredData.map((item, index) => ({ ...item, _virtualIndex: index }));

  const isAllSelected =
    filteredData.length > 0 && selectedItems.length === filteredData.length;

  const showFilters = enableFilters
    ? Boolean(
        config.searchableFields?.length ||
          config.statusField ||
          config.dateFields ||
          config.amountField,
      )
    : false;

  const statusOptions = useMemo(() => {
    if (!showFilters || !config.statusField) {
      return [];
    }

    return Array.from(
      new Set(
        rawData
          .map((item) => item[config.statusField])
          .filter((status) => typeof status === "string" && status.trim().length > 0),
      ),
    );
  }, [config.statusField, rawData, showFilters]);

  const updateFilters = useCallback(
    (nextPatch) => {
      setFilters({
        ...filters,
        ...nextPatch,
      });
    },
    [filters, setFilters],
  );

  const toggleSort = useCallback(
    (field) => {
      if (!enableFilters) {
        return;
      }

      updateFilters({
        sort: {
          field,
          dir:
            filters.sort.field === field && filters.sort.dir === "asc"
              ? "desc"
              : "asc",
        },
      });
    },
    [enableFilters, filters.sort.dir, filters.sort.field, updateFilters],
  );

  const clearSearch = useCallback(() => {
    updateFilters({ search: "" });
  }, [updateFilters]);

  const handleSelectAll = useCallback(
    (event) => {
      if (event.target.checked) {
        onSelectionChange(filteredData.map((item) => item.id));
      } else {
        onSelectionChange([]);
      }
    },
    [filteredData, onSelectionChange],
  );

  const handleSelectItem = useCallback(
    (event, id) => {
      event.stopPropagation();

      if (event.target.checked) {
        onSelectionChange([...selectedItems, id]);
      } else {
        onSelectionChange(selectedItems.filter((itemId) => itemId !== id));
      }
    },
    [onSelectionChange, selectedItems],
  );

  const isSorted = useCallback(
    (field) => enableFilters && filters.sort.field === field,
    [enableFilters, filters.sort.field],
  );

  return (
    <div className={`bg-white border border-border rounded-card overflow-hidden ${className}`}>
      <div
        ref={shouldVirtualize ? scrollRef : undefined}
        className="overflow-x-auto -webkit-overflow-scrolling-touch"
        style={shouldVirtualize ? { maxHeight: "600px", overflowY: "auto" } : undefined}
      >
        <table className="w-full border-collapse min-w-[600px]">
          {showFilters && (
            <thead className="sticky top-0 z-20 bg-white">
              <tr style={{ height: FILTER_ROW_HEIGHT }}>
                {selectable && <th className="w-10 px-4 py-3 bg-page whitespace-nowrap" />}
                <th colSpan={columns.length} className="px-4 py-3 bg-page">
                  <div className="flex flex-wrap items-center gap-3">
                    {config.searchableFields?.length > 0 && (
                      <div className="relative flex-1 min-w-[220px]">
                        <Search
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-t-muted"
                        />
                        <input
                          type="text"
                          placeholder="Search..."
                          className="w-full pl-10 pr-8 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                          value={filters.search}
                          onChange={(event) => updateFilters({ search: event.target.value })}
                        />
                        {filters.search && (
                          <button
                            type="button"
                            onClick={clearSearch}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                            aria-label="Clear search"
                          >
                            <X size={16} className="text-t-muted" />
                          </button>
                        )}
                      </div>
                    )}

                    {config.statusField && (
                      <select
                        value={filters.status}
                        onChange={(event) => updateFilters({ status: event.target.value })}
                        className="px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                      >
                        <option value="all">All Status</option>
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    )}

                    {config.dateFields && (
                      <>
                        <input
                          type="date"
                          value={filters.dateFrom}
                          onChange={(event) => updateFilters({ dateFrom: event.target.value })}
                          className="px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                          aria-label="Filter from date"
                        />
                        <input
                          type="date"
                          value={filters.dateTo}
                          onChange={(event) => updateFilters({ dateTo: event.target.value })}
                          className="px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                          aria-label="Filter to date"
                        />
                      </>
                    )}

                    {config.amountField && (
                      <>
                        <input
                          type="number"
                          min="0"
                          placeholder="Min amount"
                          value={filters.amountMin}
                          onChange={(event) => updateFilters({ amountMin: event.target.value })}
                          className="w-32 px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                          aria-label="Minimum amount"
                        />
                        <input
                          type="number"
                          min="0"
                          placeholder="Max amount"
                          value={filters.amountMax}
                          onChange={(event) => updateFilters({ amountMax: event.target.value })}
                          className="w-32 px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                          aria-label="Maximum amount"
                        />
                      </>
                    )}

                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-4 py-2 text-sm font-medium text-t-muted hover:text-t-primary transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
          )}

          <thead
            className={enableFilters ? "sticky z-10 bg-white border-t border-border" : undefined}
            style={enableFilters ? { top: showFilters ? FILTER_ROW_HEIGHT : 0 } : undefined}
          >
            <tr className="border-b border-border">
              {selectable && (
                <th className="w-10 px-4 py-3 bg-page whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                  />
                </th>
              )}

              {columns.map((column) => {
                const sortable = enableFilters && column.sortable !== false;
                const headerClasses = [
                  "text-left px-4 py-3 text-xs font-semibold text-t-muted uppercase tracking-wide bg-page whitespace-nowrap",
                  sortable ? "cursor-pointer hover:bg-gray-50 transition-colors" : "",
                  isSorted(column.key) ? "font-bold text-t-primary" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <th
                    key={column.key}
                    style={{ width: column.width }}
                    className={headerClasses}
                    onClick={sortable ? () => toggleSort(column.key) : undefined}
                  >
                    {sortable ? (
                      <div className="flex items-center gap-1">
                        {column.header}
                        {isSorted(column.key) ? (
                          filters.sort.dir === "asc" ? (
                            <ChevronUp size={14} className="text-brand" />
                          ) : (
                            <ChevronDown size={14} className="text-brand" />
                          )
                        ) : (
                          <ChevronDown size={14} className="text-t-muted opacity-50" />
                        )}
                      </div>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {shouldVirtualize && topPadding > 0 && (
              <tr aria-hidden="true">
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  style={{ height: topPadding }}
                />
              </tr>
            )}

            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="text-center py-10 text-t-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rowsToRender.map((row) => (
                // Keep default markup stable for legacy snapshot coverage when
                // filter/sort mode is not enabled.
                <tr
                  key={row.id || row._virtualIndex}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-border last:border-b-0 ${
                    onRowClick ? "cursor-pointer hover:bg-page active:bg-brand-bg" : ""
                  }${selectedItems.includes(row.id) ? " bg-brand-bg" : ""}`}
                >
                  {selectable && (
                    <td className="w-10 px-4 py-3" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                        checked={selectedItems.includes(row.id)}
                        onChange={(event) => handleSelectItem(event, row.id)}
                      />
                    </td>
                  )}

                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-sm text-t-primary min-h-[44px]">
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}

            {shouldVirtualize && bottomPadding > 0 && (
              <tr aria-hidden="true">
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  style={{ height: bottomPadding }}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
