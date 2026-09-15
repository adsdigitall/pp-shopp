import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthGate } from './components/auth/AuthGate'
import { registerServiceWorker } from './services/pushNotifications'

registerServiceWorker();

const root = createRoot(document.getElementById('root')!);
root.render(<StrictMode><AuthGate><App /></AuthGate></StrictMode>);
