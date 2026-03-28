/**
 * CheckoutList
 *
 * Issue #138: Export to CSV on the checkout flow (list view).
 * Category: Feature / data portability
 * Resolution: "Export to CSV" exports all visible checkouts with RFC-style field escaping.
 */
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ShoppingCart, FileSpreadsheet } from 'lucide-react';
import DataTable from '../../components/tables/DataTable';
import StatusBadge from '../../components/tables/StatusBadge';
import Button from '../../components/forms/Button';
import { buildCheckoutsListCsv, downloadCsvFile } from '../../utils/checkoutCsv';

// ISSUE #61: Checkout flow was subscribing to full DataContext, causing
// excessive re-renders when unrelated customer/invoice state changed.
// We now use a focused useCheckoutData hook for checkout-specific state.
import EmptyState from '../../components/ui/EmptyState';
import { useCheckoutData } from '../../context/DataContext';
import { formatUtcDate } from '../../utils/date';

function CheckoutList() {
    const navigate = useNavigate();
    const { checkouts } = useCheckoutData();

    const handleExportCsv = () => {
        if (checkouts.length === 0) return;
        const csv = buildCheckoutsListCsv(checkouts);
        const stamp = new Date().toISOString().slice(0, 10);
        downloadCsvFile(`tradazone-checkouts-${stamp}.csv`, csv);
    };

    const columns = [
        { key: 'id', header: 'ID' },
        { key: 'title', header: 'Title' },
        { key: 'amount', header: 'Amount', render: (value, row) => `${value} ${row.currency}` },
        { key: 'status', header: 'Status', render: (value) => <StatusBadge status={value} /> },
        { key: 'views', header: 'Views' },
        { key: 'payments', header: 'Payments' },
        { key: 'createdAt', header: 'Created', render: (value) => formatUtcDate(value) }
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-semibold text-t-primary">Checkouts</h1>
                <div className="flex items-center gap-2">
                    {checkouts.length > 0 && (
                        <Button variant="secondary" icon={FileSpreadsheet} onClick={handleExportCsv}>
                            Export to CSV
                        </Button>
                    )}
                    <button
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold hover:bg-brand-dark active:scale-95 transition-all"
                        onClick={() => navigate('/checkout/create')}
                    >
                        <Plus size={18} /> Create Checkout
                    </button>
                </div>
            </div>

            {checkouts.length === 0 ? (
                <EmptyState
                    icon={ShoppingCart}
                    title="No checkout links yet"
                    description="Create a checkout link to accept one-click crypto payments from anyone."
                    actionLabel="Create your first checkout"
                    actionPath="/checkout/create"
                />
            ) : (
                <>
                    <div className="flex items-center gap-3 mb-5 px-4 py-2.5 bg-white border border-border rounded-lg">
                        <Search size={18} className="text-t-muted" />
                        <input type="text" placeholder="Search checkouts..." className="flex-1 bg-transparent outline-none text-sm" />
                    </div>
                    <DataTable columns={columns} data={checkouts} onRowClick={(checkout) => navigate(`/checkout/${checkout.id}`)} />
                </>
            )}
        </div>
    );
}

export default CheckoutList;
