import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
    },
    reducers: {
        setUser(state, action) {
            state.user = action.payload;
        },
        setToken(state, action) {
            state.token = action.payload;
        },
        setAuthenticated(state, action) {
            state.isAuthenticated = action.payload;
        },
        setLoading(state, action) {
            state.isLoading = action.payload;
        },
        setAuthError(state, action) {
            state.error = action.payload;
        },
        logout(state) {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.error = null;
            state.isLoading = false;
        },
    },
});

export const { setUser, setToken, setAuthenticated, setLoading, setAuthError, logout } = authSlice.actions;
export default authSlice.reducer;
