import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function PrivateRoute({ children }) {
    const { user } = useAuth();
    const location = useLocation();

    if (!user.isAuthenticated) {
        return (
            <Navigate
                to={`/signin?redirect=${encodeURIComponent(location.pathname)}`}
                replace
            />
        );
    }

    return children;
}

export default PrivateRoute;
