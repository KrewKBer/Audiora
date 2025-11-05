import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from './AuthForm';
import { getCurrentUser } from '../utils/api';

export function Register() {
    const navigate = useNavigate();

    const handleRegister = async (credentials) => {
        const response = await fetch('auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials), // credentials now includes genres
        });

        if (response.ok) {
            // Automatically log in the user after registration
            const loginResponse = await fetch('auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            });

            if (loginResponse.ok) {
                const data = await loginResponse.json();
                
                // Store the JWT token - this is the ONLY thing we need!
                localStorage.setItem('token', data.token);
                
                // Store username and role for UI display (from decoded token)
                const user = getCurrentUser();
                if (user) {
                    localStorage.setItem('username', user.name || credentials.username);
                    localStorage.setItem('role', user.role);
                }
                
                window.dispatchEvent(new Event('storage'));
                navigate('/');
            } else {
                navigate('/login'); // Fallback to login page
            }
        } else {
            const errorText = await response.text();
            throw new Error(errorText || 'Registration failed');
        }
    };

    return <AuthForm formType="Register" onSubmit={handleRegister} />;
}
