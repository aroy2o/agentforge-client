import api from './api';

const TOKEN_KEY = 'agentforge_token';

export async function register(name, email, password) {
    const response = await api.post('/api/auth/register', { name, email, password });
    localStorage.setItem(TOKEN_KEY, response.data.token);
    return response.data;
}

export async function login(email, password) {
    const response = await api.post('/api/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, response.data.token);
    return response.data;
}

export function logout() {
    localStorage.removeItem(TOKEN_KEY);
}

export async function getMe() {
    const response = await api.get('/api/auth/me');
    return response.data.user;
}

export function getStoredToken() {
    return localStorage.getItem(TOKEN_KEY);
}
