function InvoiceTable({ items = [], currency = 'STRK' }) {
    return (
        <div className="mb-8">
            {/* Table Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-t border-gray-200 py-3">
                <span className="text-sm font-semibold text-t-primary">Item Description</span>
                <span className="text-sm font-semibold text-brand text-center">Price</span>
                <span className="text-sm font-semibold text-brand text-center">Quantity</span>
                <span className="text-sm font-semibold text-brand text-right">Amount</span>
            </div>

            {/* Table Rows */}
            {items.map((item, index) => {
                const amount = parseFloat(item.price) * item.quantity;
                return (
                    <div
                        key={index}
                        className="grid grid-cols-[2fr_1fr_1fr_1fr] border-t border-gray-200 py-4"
                    >
                        <span className="text-sm text-t-primary">{item.name}</span>
                        <span className="text-sm text-brand text-center">{item.price}</span>
                        <span className="text-sm text-brand text-center">{item.quantity}</span>
                        <span className="text-sm text-brand text-right">{amount}</span>
                    </div>
                );
            })}

            {/* Empty rows for visual consistency (like the reference) */}
            {items.length < 4 &&
                Array.from({ length: 4 - items.length }).map((_, i) => (
                    <div
                        key={`empty-${i}`}
                        className="grid grid-cols-[2fr_1fr_1fr_1fr] border-t border-gray-200 py-4"
                    >
                        <span className="text-sm text-gray-300">Item Description</span>
                        <span className="text-sm text-gray-300 text-center">Price</span>
                        <span className="text-sm text-gray-300 text-center">Quantity</span>
                        <span className="text-sm text-gray-300 text-right">Amount</span>
                    </div>
                ))}
        </div>
    );
}

export default InvoiceTable;
