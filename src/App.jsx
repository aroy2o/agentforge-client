import { useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { setTheme } from './store/themeSlice';
import { setUser, setToken, setAuthenticated, setGoogleCalendarConnected, setNotificationsEnabled, setNotificationsState, setUserPreferencesState, setLoading, logout } from './store/authSlice';
import { setAgentsHydrated } from './store/agentsSlice';
import {
  setContinuousMode,
  setEnabled as setVoiceEnabled,
  setHasOnboarded,
  setMuted,
  setSelectedLanguage as setVoiceLanguage,
  setVoicePitch,
  setVoiceRate,
} from './store/voiceSlice';

// Lazy-loaded pages — each becomes its own JS chunk for faster initial load
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const AgentBuilder = lazy(() => import('./pages/AgentBuilder'));
const Results      = lazy(() => import('./pages/Results'));
const TaskDetail   = lazy(() => import('./pages/TaskDetail'));
const ChatHistory  = lazy(() => import('./pages/ChatHistory'));
const Scheduler    = lazy(() => import('./pages/Scheduler'));
const Memory       = lazy(() => import('./pages/Memory'));
const Settings     = lazy(() => import('./pages/Settings'));
const Auth         = lazy(() => import('./pages/Auth'));

import ProtectedRoute from './components/layout/ProtectedRoute';
import { useLocalStorage } from './hooks/useLocalStorage';
import { setSupportedLanguages } from './store/languageSlice';
import * as api from './services/api';
import * as authService from './services/authService';

// Full-screen spinner shown while a page chunk is loading
function PageLoader() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-base)]">
      <div className="w-8 h-8 rounded-full border-2 border-accent-cyan border-t-transparent animate-spin" />
    </div>
  );
}

function App() {
  useLocalStorage();
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.theme.theme);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const didSyncAgentsRef = useRef(false);

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

  useEffect(() => {
    if (!isAuthenticated || didSyncAgentsRef.current) return;

    didSyncAgentsRef.current = true;
    (async () => {
      try {
        await api.syncAllAgents();
      } catch (_) {
        // one-time best-effort migration
      } finally {
        dispatch(setAgentsHydrated(true));
      }
    })();
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    const fetchGoogleStatus = async () => {
      if (!isAuthenticated) {
        dispatch(setGoogleCalendarConnected(false));
        return;
      }

      try {
        const status = await api.getGoogleStatus();
        dispatch(setGoogleCalendarConnected(status.connected === true));
      } catch (error) {
        console.error('Failed to fetch Google Calendar status:', error);
        dispatch(setGoogleCalendarConnected(false));
      }
    };

    fetchGoogleStatus();
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    const fetchSavedPreferences = async () => {
      if (!isAuthenticated) return;
      try {
        const data = await api.getUserPreferences();
        if (data?.preferences) {
          dispatch(setUserPreferencesState(data.preferences));

          if (typeof data.preferences.voiceControlEnabled === 'boolean') {
            dispatch(setVoiceEnabled(data.preferences.voiceControlEnabled));
          } else if (data.preferences.voiceEnabledByDefault === true) {
            dispatch(setVoiceEnabled(true));
          }

          if (typeof data.preferences.voiceContinuousMode === 'boolean') {
            dispatch(setContinuousMode(data.preferences.voiceContinuousMode));
          }
          if (typeof data.preferences.voiceMuted === 'boolean') {
            dispatch(setMuted(data.preferences.voiceMuted));
          }
          if (typeof data.preferences.voiceRate === 'number') {
            dispatch(setVoiceRate(data.preferences.voiceRate));
          }
          if (typeof data.preferences.voicePitch === 'number') {
            dispatch(setVoicePitch(data.preferences.voicePitch));
          }
          if (typeof data.preferences.voiceRecognitionLanguage === 'string' && data.preferences.voiceRecognitionLanguage.trim()) {
            dispatch(setVoiceLanguage(data.preferences.voiceRecognitionLanguage));
          }
          if (typeof data.preferences.voiceOnboarded === 'boolean') {
            dispatch(setHasOnboarded(data.preferences.voiceOnboarded));
          }
        }
        if (data?.notifications) {
          dispatch(setNotificationsState(data.notifications));
          dispatch(setNotificationsEnabled(Boolean(data.notifications.emailEnabled)));
        }
      } catch (error) {
        console.error('Failed to load user preferences:', error);
      }
    };

    fetchSavedPreferences();
  }, [dispatch, isAuthenticated]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/auth" element={<Auth />} />

          {/* Protected */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/agents" element={<ProtectedRoute><AgentBuilder /></ProtectedRoute>} />
          <Route path="/builder" element={<ProtectedRoute><AgentBuilder /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
          <Route path="/results/:taskId" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatHistory /></ProtectedRoute>} />
          <Route path="/scheduler" element={<ProtectedRoute><Scheduler /></ProtectedRoute>} />
          <Route path="/memory" element={<ProtectedRoute><Memory /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
