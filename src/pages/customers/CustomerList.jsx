import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import DataTable from '../../components/tables/DataTable';
import { useData } from '../../context/DataContext';

function CustomerList() {
    const navigate = useNavigate();
    const { customers } = useData();

    const columns = [
        { key: 'name', header: 'Name' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Phone' },
        { key: 'totalSpent', header: 'Total Spent', render: (value, row) => `${value} ${row.currency}` },
        { key: 'invoiceCount', header: 'Invoices' },
        { key: 'createdAt', header: 'Created' }
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-semibold text-t-primary">Customers</h1>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors" onClick={() => navigate('/customers/add')}>
                    <Plus size={18} /> Add Customer
                </button>
            </div>

            <div className="flex items-center gap-3 mb-5 px-4 py-2.5 bg-white border border-border rounded-lg">
                <Search size={18} className="text-t-muted" />
                <input type="text" placeholder="Search customers..." className="flex-1 bg-transparent outline-none text-sm" />
            </div>

            <DataTable
                columns={columns}
                data={customers}
                onRowClick={(customer) => navigate(`/customers/${customer.id}`)}
                emptyMessage="No customers found"
            />
        </div>
    );
}

export default CustomerList;
