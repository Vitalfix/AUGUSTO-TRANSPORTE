"use client";

import { useEffect, useState } from 'react';

export default function ThemeSwitcher() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    return (
        <button
            onClick={toggleTheme}
            style={{
                position: 'fixed',
                top: '10px',
                right: '10px',
                zIndex: 10001,
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '50%',
                width: '35px',
                height: '35px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: 'var(--glass-shadow)',
                backdropFilter: 'var(--glass-blur)',
                fontSize: '1.2rem',
                padding: '0',
                transition: 'transform 0.2s ease'
            }}
            className="theme-switcher"
            title="Cambiar Modo"
        >
            {theme === 'dark' ? '☀️' : '🌙'}
        </button>
    );
}
