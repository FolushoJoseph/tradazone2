/**
 * CheckoutDetail
 *
 * Issue #138: Export to CSV on the checkout flow (detail view).
 * Category: Feature / data portability
 * Resolution: "Export to CSV" downloads a key-value summary for the active checkout.
 */
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Copy, Link as LinkIcon, Edit, Trash2, ExternalLink, FileSpreadsheet } from 'lucide-react';
import Button from '../../components/forms/Button';
import StatusBadge from '../../components/tables/StatusBadge';
import { useCheckoutData } from '../../context/DataContext';
import { formatUtcDate } from '../../utils/date';
import { buildCheckoutDetailCsv, downloadCsvFile } from '../../utils/checkoutCsv';
import LazyChart from '../../components/ui/LazyChart';

function CheckoutDetail() {
    const { id } = useParams();
    const { checkouts } = useCheckoutData();
    const checkout = checkouts.find(c => c.id === id);

    if (!checkout) return <div className="p-8"><p className="text-t-muted">Checkout not found</p></div>;

    const copyLink = () => { navigator.clipboard.writeText(checkout.paymentLink); };

    const handleExportCsv = () => {
        const csv = buildCheckoutDetailCsv(checkout);
        downloadCsvFile(`${checkout.id}.csv`, csv);
    };

    const chartData = {
        labels: ['Views', 'Payments'],
        datasets: [{
            label: 'Engagement',
            data: [checkout.views, checkout.payments],
            backgroundColor: ['rgba(67, 56, 202, 0.4)', 'rgba(249, 115, 22, 0.4)'],
            borderColor: ['rgb(67, 56, 202)', 'rgb(249, 115, 22)'],
            borderWidth: 1.5,
            borderRadius: 6,
        }]
    };

    const chartOptions = {
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.05)' }
            },
            x: {
                grid: { display: false }
            }
        }
    };

    return (
        <div>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <Link to="/checkout" className="inline-flex items-center gap-1.5 text-sm text-t-muted hover:text-brand transition-colors mb-2">
                        <ArrowLeft size={16} /> Back to Checkouts
                    </Link>
                    <h1 className="text-xl font-semibold text-t-primary">{checkout.title}</h1>
                    <p className="text-sm text-t-muted">{checkout.id}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="secondary" icon={FileSpreadsheet} onClick={handleExportCsv}>
                        Export to CSV
                    </Button>
                    <Button variant="secondary" icon={Edit}>Edit</Button>
                    <Button variant="danger" icon={Trash2}>Delete</Button>
                </div>
            </div>

            <div className="bg-white border border-border rounded-card p-6 mb-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold">Checkout Information</h2>
                    <StatusBadge status={checkout.status} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                    <div><span className="block text-xs text-t-muted mb-1">Amount</span><span className="text-sm font-medium">{checkout.amount} {checkout.currency}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Description</span><span className="text-sm font-medium">{checkout.description}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Views</span><span className="text-sm font-medium">{checkout.views}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Payments</span><span className="text-sm font-medium">{checkout.payments}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Created</span><span className="text-sm font-medium">{formatUtcDate(checkout.createdAt)}</span></div>
                </div>
            </div>

            <div className="bg-white border border-border rounded-card p-6 mb-5">
                <h2 className="text-base font-semibold mb-4">Payment Link</h2>
                <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-page rounded-lg">
                        <LinkIcon size={16} className="text-t-muted" />
                        <span className="text-sm flex-1">{checkout.paymentLink}</span>
                    </div>
                    <Button variant="secondary" icon={Copy} onClick={copyLink}>Copy</Button>
                    <Button variant="secondary" icon={ExternalLink}>Open</Button>
                </div>
            </div>

            <div className="bg-white border border-border rounded-card p-6">
                <h2 className="text-base font-semibold mb-4">Performance Metrics</h2>
                <div className="bg-page/40 rounded-xl p-4">
                    <LazyChart
                        type="bar"
                        data={chartData}
                        options={chartOptions}
                        height={240}
                    />
                </div>
            </div>
        </div>
    );
}

export default CheckoutDetail;
