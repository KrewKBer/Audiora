import React from 'react';
import { Route, Routes } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { Layout } from './components/Layout';
import './custom.css';
import { Room } from './components/Room';
import { Rooms } from './components/Rooms';

const renderRoutes = (routes) => {
    return routes.map((route, index) => (
        <Route key={index} path={route.path} index={route.index} element={route.element}>
            {route.children && renderRoutes(route.children)}
        </Route>
    ));
};

export default function App() {
    return (
        <Layout>
            <Routes>
                {renderRoutes(AppRoutes)}
                <Route path="/rooms" element={<Rooms />} />
                <Route path="/room/:id" element={<Room />} />
            </Routes>
        </Layout>
    );
}
