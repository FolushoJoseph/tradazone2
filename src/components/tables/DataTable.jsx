function DataTable({
    columns,
    data,
    onRowClick,
    emptyMessage = 'No data available',
    className = ''
}) {
    return (
        <div className={`bg-white border border-border rounded-card overflow-hidden ${className}`}>
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-border">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                style={{ width: col.width }}
                                className="text-left px-5 py-3 text-xs font-semibold text-t-muted uppercase tracking-wide bg-page"
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="text-center py-10 text-t-muted">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, rowIndex) => (
                            <tr
                                key={row.id || rowIndex}
                                onClick={() => onRowClick?.(row)}
                                className={`border-b border-border last:border-b-0 ${onRowClick ? 'cursor-pointer hover:bg-page' : ''}`}
                            >
                                {columns.map((col) => (
                                    <td key={col.key} className="px-5 py-3 text-sm text-t-primary">
                                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default DataTable;
