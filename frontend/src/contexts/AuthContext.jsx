import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('accessToken');
            if (token) {
                try {
                    const { data } = await api.get('/auth/me');
                    setUser(data.data);
                } catch {
                    localStorage.clear();
                }
            }
            setLoading(false);
        };
        init();
    }, []);

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        setUser(data.data.user);
        return data.data.user;
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') });
        } catch { }
        localStorage.clear();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
