import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye } from 'lucide-react';
import DataTable from '../../components/tables/DataTable';
import StatusBadge from '../../components/tables/StatusBadge';
import { useData } from '../../context/DataContext';

function InvoiceList() {
    const navigate = useNavigate();
    const { invoices } = useData();

    const columns = [
        { key: 'id', header: 'Invoice ID' },
        { key: 'customer', header: 'Customer' },
        { key: 'amount', header: 'Amount', render: (value, row) => `${value} ${row.currency}` },
        { key: 'status', header: 'Status', render: (value) => <StatusBadge status={value} /> },
        { key: 'dueDate', header: 'Due Date' },
        {
            key: 'actions',
            header: '',
            render: (_, row) => (
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/invoice/${row.id}`); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-brand bg-brand-bg rounded-lg hover:bg-brand hover:text-white transition-colors"
                >
                    <Eye size={14} /> View
                </button>
            ),
        },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-semibold text-t-primary">Invoices</h1>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors" onClick={() => navigate('/invoices/create')}>
                    <Plus size={18} /> Create Invoice
                </button>
            </div>

            <div className="flex items-center gap-3 mb-5 px-4 py-2.5 bg-white border border-border rounded-lg">
                <Search size={18} className="text-t-muted" />
                <input type="text" placeholder="Search invoices..." className="flex-1 bg-transparent outline-none text-sm" />
            </div>

            <DataTable columns={columns} data={invoices} onRowClick={(invoice) => navigate(`/invoices/${invoice.id}`)} />
        </div>
    );
}

export default InvoiceList;
