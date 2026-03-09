import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { setTheme } from './store/themeSlice';
import { setUser, setToken, setAuthenticated, setLoading, logout } from './store/authSlice';
import Dashboard from './pages/Dashboard';
import AgentBuilder from './pages/AgentBuilder';
import Results from './pages/Results';
import ChatHistory from './pages/ChatHistory';
import Scheduler from './pages/Scheduler';
import Auth from './pages/Auth';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { useLocalStorage } from './hooks/useLocalStorage';
import { setSupportedLanguages } from './store/languageSlice';
import * as api from './services/api';
import * as authService from './services/authService';

function App() {
  useLocalStorage();
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.theme.theme);

  // Restore auth session on app start
  useEffect(() => {
    const restore = async () => {
      const token = authService.getStoredToken();
      if (!token) {
        dispatch(setLoading(false));
        return;
      }
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

  useEffect(() => {
    const saved = localStorage.getItem('agentforge_theme');
    if (saved === 'light' || saved === 'dark') {
      dispatch(setTheme(saved));
    } else {
      dispatch(setTheme('dark'));
    }
  }, [dispatch]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('agentforge_theme', theme);
  }, [theme]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/health');
      } catch {
        toast.error('Backend server not detected. Start the server at localhost:3001.', {
          duration: Infinity,
          id: 'backend-health-warning',
        });
      }
    };
    checkHealth();
  }, []);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const langs = await api.getSupportedLanguages();
        if (langs && langs.length > 0) {
          dispatch(setSupportedLanguages(langs));
        }
      } catch (error) {
        console.error("Failed to load supported languages:", error);
      }
    };
    fetchLanguages();
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/auth" element={<Auth />} />

        {/* Protected */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/builder" element={<ProtectedRoute><AgentBuilder /></ProtectedRoute>} />
        <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatHistory /></ProtectedRoute>} />
        <Route path="/scheduler" element={<ProtectedRoute><Scheduler /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
