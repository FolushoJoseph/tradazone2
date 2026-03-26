/**
 * DataTable — responsive table with horizontal scroll on mobile.
 * On mobile: wraps in overflow-x-auto so wide tables don't break layout.
 * Rows have min-h-[44px] for tap target compliance.
 */
function DataTable({
    columns,
    data,
    onRowClick,
    emptyMessage = 'No data available',
    className = '',
    selectable = false,
    selectedItems = [],
    onSelectionChange = () => {}
}) {
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            onSelectionChange(data.map(item => item.id));
        } else {
            onSelectionChange([]);
        }
    };

    const handleSelectItem = (e, id) => {
        e.stopPropagation();
        if (e.target.checked) {
            onSelectionChange([...selectedItems, id]);
        } else {
            onSelectionChange(selectedItems.filter(itemId => itemId !== id));
        }
    };

    const isAllSelected = data.length > 0 && selectedItems.length === data.length;

    return (
        <div className={`bg-white border border-border rounded-card overflow-hidden ${className}`}>
            {/* Horizontal scroll wrapper for mobile */}
            <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
                <table className="w-full border-collapse min-w-[600px]">
                    <thead>
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
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    style={{ width: col.width }}
                                    className="text-left px-4 py-3 text-xs font-semibold text-t-muted uppercase tracking-wide bg-page whitespace-nowrap"
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-10 text-t-muted">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            data.map((row, rowIndex) => (
                                <tr
                                    key={row.id || rowIndex}
                                    onClick={() => onRowClick?.(row)}
                                    className={`border-b border-border last:border-b-0 ${onRowClick ? 'cursor-pointer hover:bg-page active:bg-brand-bg' : ''} ${selectedItems.includes(row.id) ? 'bg-brand-bg' : ''}`}
                                >
                                    {selectable && (
                                        <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                                                checked={selectedItems.includes(row.id)}
                                                onChange={(e) => handleSelectItem(e, row.id)}
                                            />
                                        </td>
                                    )}
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-4 py-3 text-sm text-t-primary min-h-[44px]">
                                            {col.render ? col.render(row[col.key], row) : row[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default DataTable;
