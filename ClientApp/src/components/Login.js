import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from './AuthForm';

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
            
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('username', data.username);
            localStorage.setItem('role', data.role);
            
            window.dispatchEvent(new Event('storage'));
            navigate('/rooms');
            
            return data;
        } else {
            const errorText = await response.text();
            throw new Error(errorText || 'Login failed');
        }
    };

    return <AuthForm formType="Login" onSubmit={handleLogin} />;
}