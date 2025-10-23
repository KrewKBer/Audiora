import React, { useState, useEffect } from 'react';
import { Collapse, Navbar, NavbarBrand, NavbarToggler, NavItem, NavLink } from 'reactstrap';
import { Link, useNavigate } from 'react-router-dom';
import './NavMenu.css';

export function NavMenu() {
    const [collapsed, setCollapsed] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userRole, setUserRole] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const checkLoginStatus = () => {
            const userId = localStorage.getItem('userId');
            const role = localStorage.getItem('role');
            setIsLoggedIn(!!userId);
            setUserRole(role || '');
        };

        checkLoginStatus();
        window.addEventListener('storage', checkLoginStatus);

        return () => {
            window.removeEventListener('storage', checkLoginStatus);
        };
    }, []);

    const toggleNavbar = () => {
        setCollapsed(!collapsed);
    };

    const handleLogout = () => {
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        setIsLoggedIn(false);
        setUserRole('');
        navigate('/login');
    };

    return (
        <header>
            <Navbar className="navbar-expand-sm navbar-toggleable-sm box-shadow mb-3" container light>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <NavbarBrand tag={Link} className='text-light' to="/">Audiora</NavbarBrand>
                    {isLoggedIn && userRole && <small className="text-light" style={{ fontSize: '0.8em', marginTop: '-5px' }}>{userRole}</small>}
                </div>
                <NavbarToggler onClick={toggleNavbar} className="mr-2" />
                <Collapse className="d-sm-inline-flex flex-sm-row-reverse" isOpen={!collapsed} navbar>
                    <ul className="navbar-nav flex-grow">
                        <NavItem>
                            <NavLink tag={Link} className="text-light" to="/">Home</NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink tag={Link} className="text-light" to="/rooms">Rooms</NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink tag={Link} className="text-light" to="/search">Search</NavLink>
                        </NavItem>
                        {isLoggedIn ? (
                            <>
                                <NavItem>
                                    <NavLink tag={Link} className="text-light" to="/liked-songs">Liked Songs</NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink tag={Link} className="text-light" to="/profile">Profile</NavLink>
                                </NavItem>
                                <NavItem>
                                    <button className="btn btn-link text-light" onClick={handleLogout}>Logout</button>
                                </NavItem>
                            </>
                        ) : (
                            <>
                                <NavItem>
                                    <NavLink tag={Link} className="text-light" to="/login">Login</NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink tag={Link} className="text-light" to="/register">Register</NavLink>
                                </NavItem>
                            </>
                        )}
                    </ul>
                </Collapse>
            </Navbar>
        </header>
    );
}

