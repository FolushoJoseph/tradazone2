import logo from '../../assets/logo.png';

function InvoiceHeader() {
    return (
        <div className="flex items-start justify-between mb-12">
            {/* Logo */}
            <div className="w-20 h-20 bg-brand rounded-xl flex items-center justify-center p-3">
                <img src={logo} alt="Tradazone" className="w-full object-contain" />
            </div>

            {/* Invoice Title */}
            <h1 className="text-6xl font-light text-t-primary tracking-tight">
                Invoice
            </h1>
        </div>
    );
}

export default InvoiceHeader;
