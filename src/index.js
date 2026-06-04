import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import './styles/components.css';
import './styles/layout.css';   // теперь имя правильное
import './styles/home.css';
import './styles/items.css';
import './styles/profile.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './contexts/AuthContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();