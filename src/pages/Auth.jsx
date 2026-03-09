import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { setUser, setToken, setAuthenticated, setLoading, setAuthError, logout } from '../store/authSlice';
import * as authService from '../services/authService';

export default function Auth() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { isLoading, error, isAuthenticated } = useAppSelector(s => s.auth);

    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '' });

    // Restore session on mount
    useEffect(() => {
        const restore = async () => {
            const token = authService.getStoredToken();
            if (!token) return;
            dispatch(setLoading(true));
            try {
                const user = await authService.getMe();
                dispatch(setUser(user));
                dispatch(setToken(token));
                dispatch(setAuthenticated(true));
            } catch {
                authService.logout();
                dispatch(logout());
            } finally {
                dispatch(setLoading(false));
            }
        };
        restore();
    }, [dispatch]);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) navigate('/', { replace: true });
    }, [isAuthenticated, navigate]);

    const handleChange = (e) => {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
        if (error) dispatch(setAuthError(null));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch(setLoading(true));
        dispatch(setAuthError(null));
        try {
            let data;
            if (mode === 'register') {
                data = await authService.register(form.name, form.email, form.password);
            } else {
                data = await authService.login(form.email, form.password);
            }
            dispatch(setUser(data.user));
            dispatch(setToken(data.token));
            dispatch(setAuthenticated(true));
            navigate('/', { replace: true });
        } catch (err) {
            const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
            dispatch(setAuthError(msg));
        } finally {
            dispatch(setLoading(false));
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#e8eeff] via-[#f0f4ff] to-[#e4f0ff] dark:from-[#05060f] dark:via-[#08090f] dark:to-[#0a0812]">

            {/* Animated ambient blobs */}
            {[
                { color: '#00d4ff', x: -200, y: -150, size: 500 },
                { color: '#a78bfa', x: 250, y: 200, size: 400 },
                { color: '#f59e0b', x: -50, y: 300, size: 350 },
            ].map((blob, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        width: blob.size,
                        height: blob.size,
                        left: `calc(50% + ${blob.x}px)`,
                        top: `calc(50% + ${blob.y}px)`,
                        background: blob.color,
                        filter: 'blur(120px)',
                        opacity: 0.07,
                        translateX: '-50%',
                        translateY: '-50%',
                    }}
                    animate={{ scale: [1, 1.12, 1], opacity: [0.07, 0.11, 0.07] }}
                    transition={{ duration: 6 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
                />
            ))}

            {/* Card */}
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="glass-card relative z-10 w-full max-w-[400px] mx-4 p-8"
            >
                {/* Logo */}
                <div className="text-center mb-6">
                    <div className="text-3xl font-bold tracking-widest text-blue-700 dark:text-accent-cyan uppercase mb-1">
                        ⬡ AgentForge
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 tracking-widest uppercase">
                        AI Agent Orchestration Platform
                    </p>
                </div>

                {/* Tab row */}
                <div className="flex mb-6 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10">
                    {['login', 'register'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setMode(tab); dispatch(setAuthError(null)); }}
                            className={`flex-1 py-2 text-xs uppercase tracking-widest font-medium transition-colors ${mode === tab
                                    ? 'bg-accent-cyan/20 text-accent-cyan dark:bg-accent-cyan/15'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            {tab === 'login' ? 'Login' : 'Register'}
                        </button>
                    ))}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    {mode === 'register' && (
                        <input
                            name="name"
                            type="text"
                            placeholder="Full name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            className="glass-input w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                        />
                    )}

                    <input
                        name="email"
                        type="email"
                        placeholder="Email address"
                        value={form.email}
                        onChange={handleChange}
                        required
                        className="glass-input w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                    />

                    <div className="relative">
                        <input
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={form.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                            className="glass-input w-full rounded-lg px-4 py-2.5 pr-10 text-sm outline-none"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="glass-button-primary w-full py-2.5 rounded-lg text-sm font-semibold tracking-wide flex items-center justify-center gap-2 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <><div className="w-4 h-4 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" /> Processing...</>
                        ) : (
                            mode === 'login' ? 'Sign In' : 'Create Account'
                        )}
                    </button>

                    {error && (
                        <p className="text-red-400 text-xs text-center mt-1">{error}</p>
                    )}

                    <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-1">
                        {mode === 'login' ? (
                            <>Don&apos;t have an account?{' '}
                                <button type="button" onClick={() => setMode('register')} className="text-accent-cyan hover:underline">Register</button>
                            </>
                        ) : (
                            <>Already have one?{' '}
                                <button type="button" onClick={() => setMode('login')} className="text-accent-cyan hover:underline">Login</button>
                            </>
                        )}
                    </p>
                </form>
            </motion.div>
        </div>
    );
}
