import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from './AuthForm';

export function Login() {
    const navigate = useNavigate();
    const [twoFactorRequired, setTwoFactorRequired] = useState(false);
    const [tempUserId, setTempUserId] = useState(null);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (credentials) => {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });

        if (response.ok) {
            const data = await response.json();
            
            if (data.status === '2fa_required') {
                setTempUserId(data.userId);
                setTwoFactorRequired(true);
                return;
            }

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

    const handleVerify2FA = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await fetch('/auth/2fa/verify-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: tempUserId, code }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('username', data.username);
                localStorage.setItem('role', data.role);
                
                window.dispatchEvent(new Event('storage'));
                navigate('/rooms');
            } else {
                setError('Invalid 2FA Code');
            }
        } catch (err) {
            setError('Verification failed');
        }
    };

    if (twoFactorRequired) {
        return (
            <div className="auth-container">
                <form onSubmit={handleVerify2FA} className="auth-form">
                    <h3>Two-Factor Authentication</h3>
                    <p>Please enter the code from your authenticator app.</p>
                    {error && <p className="auth-error">{error}</p>}
                    <div className="form-group">
                        <label>Code</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            value={code} 
                            onChange={e => setCode(e.target.value)} 
                            placeholder="000000"
                            autoFocus
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Verify</button>
                </form>
            </div>
        );
    }

    return <AuthForm formType="Login" onSubmit={handleLogin} />;
}
