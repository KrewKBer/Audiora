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
            
            // Store the JWT token
            localStorage.setItem('token', data.token);
            
            // Decode the token to get user info
            const user = getCurrentUser();
            if (user) {
                // Store user info for easy access (optional, as we can always decode the token)
                localStorage.setItem('userId', user.sub);
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