import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const useAuth = () => {
    return localStorage.getItem('userId') !== null;
};

const PrivateRoute = () => {
    const isAuth = useAuth();
    return isAuth ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
