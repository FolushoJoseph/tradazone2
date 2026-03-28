/**
 * DataTable — responsive table with horizontal scroll on mobile.
 * * ISSUE #134: Support dark mode themes in CustomerList.
 * Added 'dark:' variants to table containers, headers, and rows.
 * * ISSUE #75: Data list in API gateway lacks windowing/virtualization.
 * Virtualization is enforced for datasets exceeding VIRTUALIZATION_THRESHOLD.
 */

import { useVirtualList } from '../../hooks/useVirtualList';

const VIRTUALIZATION_THRESHOLD = 50;
const ROW_HEIGHT = 52;

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
    const shouldVirtualize = data.length > VIRTUALIZATION_THRESHOLD;
    
    const { scrollRef, virtualItems, topPadding, bottomPadding } = useVirtualList({
        items: data,
        itemHeight: ROW_HEIGHT,
    });

    const rowsToRender = shouldVirtualize
        ? virtualItems.map(v => ({ ...v.item, _virtualIndex: v.index }))
        : data.map((item, index) => ({ ...item, _virtualIndex: index }));

    return (
        /* Container: Added dark mode background and border */
        <div className={`bg-white border border-border rounded-card overflow-hidden dark:bg-zinc-950 dark:border-zinc-800 transition-colors ${className}`}>
            <div 
                ref={shouldVirtualize ? scrollRef : undefined}
                className="overflow-x-auto -webkit-overflow-scrolling-touch"
                style={shouldVirtualize ? { maxHeight: '600px', overflowY: 'auto' } : undefined}
            >
                <table className="w-full border-collapse min-w-[600px]">
                    <thead className="sticky top-0 z-10">
                        {/* Header Row: Added dark border and text color */}
                        <tr className="border-b border-border dark:border-zinc-800">
                            {selectable && (
                                <th className="w-10 px-4 py-3 bg-page dark:bg-zinc-900 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-border dark:border-zinc-700 bg-transparent text-brand focus:ring-brand"
                                        checked={isAllSelected}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                            )}
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    style={{ width: col.width }}
                                    className="text-left px-4 py-3 text-xs font-semibold text-t-muted dark:text-zinc-500 uppercase tracking-wide bg-page dark:bg-zinc-900 whitespace-nowrap"
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {shouldVirtualize && topPadding > 0 && (
                            <tr aria-hidden="true">
                                <td colSpan={columns.length + (selectable ? 1 : 0)} style={{ height: topPadding }} />
                            </tr>
                        )}
                        
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-10 text-t-muted dark:text-zinc-600">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            rowsToRender.map((row) => (
                                <tr
                                    key={row.id || row._virtualIndex}
                                    onClick={() => onRowClick?.(row)}
                                    /* Rows: Added dark mode text, border, and hover state */
                                    className={`border-b border-border dark:border-zinc-800 last:border-b-0 transition-colors ${
                                        onRowClick ? 'cursor-pointer hover:bg-page dark:hover:bg-zinc-900 active:bg-brand-bg dark:active:bg-brand/10' : ''
                                    } ${selectedItems.includes(row.id) ? 'bg-brand-bg dark:bg-brand/10' : ''}`}
                                >
                                    {selectable && (
                                        <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-border dark:border-zinc-700 bg-transparent text-brand focus:ring-brand"
                                                checked={selectedItems.includes(row.id)}
                                                onChange={(e) => handleSelectItem(e, row.id)}
                                            />
                                        </td>
                                    )}
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-4 py-3 text-sm text-t-primary dark:text-zinc-300 min-h-[44px]">
                                            {col.render ? col.render(row[col.key], row) : row[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                        
                        {shouldVirtualize && bottomPadding > 0 && (
                            <tr aria-hidden="true">
                                <td colSpan={columns.length + (selectable ? 1 : 0)} style={{ height: bottomPadding }} />
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default DataTable;