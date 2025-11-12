import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from './AuthForm';

export function Register() {
    const navigate = useNavigate();

    const handleRegister = async (credentials) => {
        const response = await fetch('auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });

        if (response.ok) {
            const data = await response.json();
            
            // Store user info in localStorage
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('username', data.username);
            localStorage.setItem('role', data.role);
            
            window.dispatchEvent(new Event('storage'));
            navigate('/');
        } else {
            const errorText = await response.text();
            throw new Error(errorText || 'Registration failed');
        }
    };

    return <AuthForm formType="Register" onSubmit={handleRegister} />;
}
