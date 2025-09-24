import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const useAuth = () => {
    const userId = localStorage.getItem('userId');
    return !!userId;
};

const PrivateRoute = () => {
    const isAuth = useAuth();
    return isAuth ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
