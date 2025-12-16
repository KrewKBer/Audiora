import React, { useState, useEffect } from 'react';
import { Collapse, Navbar, NavbarBrand, NavbarToggler } from 'reactstrap';
import { Link, useNavigate } from 'react-router-dom';
import './NavMenu.css';
import { Sidebar } from './Sidebar';

export function NavMenu() {
    const [collapsed, setCollapsed] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [xpData, setXpData] = useState({ xp: 0, level: 1 });
    const navigate = useNavigate();
    const [showSidebar, setShowSidebar] = useState(false);

    useEffect(() => {
        const checkLoginStatus = async () => {
            const userId = localStorage.getItem('userId');
            const loggedIn = userId !== null;
            const role = localStorage.getItem('role');
            setIsLoggedIn(loggedIn);
            setUserRole(role || '');

            if (loggedIn) {
                try {
                    const res = await fetch(`/auth/user?userId=${userId}`);
                    if (res.ok) {
                        const data = await res.json();
                        setXpData({ xp: data.xp || 0, level: data.level || 1 });
                        // Update role if changed on server
                        if (data.role && data.role !== role) {
                            localStorage.setItem('role', data.role);
                            setUserRole(data.role);
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch user XP", e);
                }
            }
        };

        checkLoginStatus();
        window.addEventListener('storage', checkLoginStatus);

        const handleXpUpdate = (e) => {
            const amount = e.detail?.amount || 0;
            setXpData(prev => {
                const newXp = prev.xp + amount;
                const newLevel = Math.min(100, 1 + Math.floor(newXp / 100));
                
                // Check for rank up locally
                let newRole = userRole;
                if (userRole !== 'Admin') {
                    if (newLevel >= 20) newRole = 'Hacker';
                    else if (newLevel >= 10) newRole = 'Pro';
                    else newRole = 'Noob';
                }
                
                if (newRole !== userRole) {
                    setUserRole(newRole);
                    localStorage.setItem('role', newRole);
                }

                return { xp: newXp, level: newLevel };
            });
        };
        window.addEventListener('xpUpdate', handleXpUpdate);

        return () => {
            window.removeEventListener('storage', checkLoginStatus);
            window.removeEventListener('xpUpdate', handleXpUpdate);
        };
    }, [userRole]);

    const toggleNavbar = () => { setCollapsed(!collapsed); };

    const handleLogout = () => {
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        window.location.href = '/login';
        setIsLoggedIn(false);
        setUserRole('');
    };

    // Calculate progress for current level (0-99 XP within the level)
    const levelProgress = xpData.xp % 100;

    return (
        <header>
            <Navbar className="navbar-expand-sm navbar-toggleable-sm box-shadow mb-3" container light>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <NavbarBrand tag={Link} className='text-light' to="/">Audiora</NavbarBrand>
                    {isLoggedIn && (
                        <div className="xp-container">
                            <div className="xp-rank">{userRole}</div>
                            <div className="xp-progress-bg">
                                <div className="xp-progress-fill" style={{ width: `${levelProgress}%` }}></div>
                            </div>
                            <div className="xp-stats">XP: {xpData.xp} | Lvl: {xpData.level}</div>
                        </div>
                    )}
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

