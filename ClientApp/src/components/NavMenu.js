import React, { useState, useEffect } from 'react';
import { Collapse, Navbar, NavbarBrand, NavbarToggler } from 'reactstrap';
import { Link, useNavigate } from 'react-router-dom';
import './NavMenu.css';
import { Sidebar } from './Sidebar';

export function NavMenu() {
    const [collapsed, setCollapsed] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userRole, setUserRole] = useState('');
    const navigate = useNavigate();
    const [showSidebar, setShowSidebar] = useState(false);

    useEffect(() => {
        const checkLoginStatus = () => {
            const loggedIn = localStorage.getItem('userId') !== null;
            const role = localStorage.getItem('role');
            setIsLoggedIn(loggedIn);
            setUserRole(role || '');
        };

        checkLoginStatus();
        window.addEventListener('storage', checkLoginStatus);

        return () => {
            window.removeEventListener('storage', checkLoginStatus);
        };
    }, []);

    const toggleNavbar = () => { setCollapsed(!collapsed); };

    const handleLogout = () => {
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        window.location.href = '/login';
        setIsLoggedIn(false);
        setUserRole('');
    };

    return (
        <header>
            <Navbar className="navbar-expand-sm navbar-toggleable-sm box-shadow mb-3" container light>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <NavbarBrand tag={Link} className='text-light' to="/">Audiora</NavbarBrand>
                    {isLoggedIn && userRole && <small className="text-light" style={{ fontSize: '0.8em', marginTop: '-5px' }}>{userRole}</small>}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isLoggedIn && (
                        <button className="menu-btn-translucent" onClick={() => setShowSidebar(true)}>Menu</button>
                    )}
                    <NavbarToggler onClick={toggleNavbar} className="mr-2" />
                </div>
                <Collapse className="d-sm-inline-flex flex-sm-row-reverse" isOpen={!collapsed} navbar>
                    {/* Top bar kept minimal intentionally; use the Menu button to navigate */}
                </Collapse>
            </Navbar>
            <Sidebar open={showSidebar} onClose={() => setShowSidebar(false)} />
        </header>
    );
}

