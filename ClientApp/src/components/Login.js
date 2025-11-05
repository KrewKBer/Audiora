import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from './AuthForm';
import { getCurrentUser } from '../utils/api';

export function Login() {
    const navigate = useNavigate();

    const handleLogin = async (credentials) => {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });

        if (response.ok) {
            const data = await response.json();
            
            // Store the JWT token - this is the ONLY thing we need to store!
            // The token contains all user info (userId, username, role) and is secure
            localStorage.setItem('token', data.token);
            
            // Decode the token to get user info for display purposes
            const user = getCurrentUser();
            if (user) {
                // Store username and role for UI display (these are not security-sensitive)
                // We NEVER store userId separately - always get it from the token!
                localStorage.setItem('username', user.name || credentials.username);
                localStorage.setItem('role', user.role);
            }
            
            window.dispatchEvent(new Event('storage'));
            navigate('/rooms');
            
            return data; // Return for AuthForm to handle
        } else {
            const errorText = await response.text();
            throw new Error(errorText || 'Login failed');
        }
    };

    return <AuthForm formType="Login" onSubmit={handleLogin} />;
}