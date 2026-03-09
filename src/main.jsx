import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import store from './store/index.js'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0a1020',
            color: '#e2e8f0',
            border: '1px solid #1a2840',
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontSize: '13px',
          },
        }}
      />
    </Provider>
  </StrictMode>,
)
