import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App';
import { store } from './store';
import { ConversationProvider } from './contexts/ConversationContext';
import { AnalyticsProvider } from './contexts/AnalyticsContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AnalyticsProvider>
          <ConversationProvider>
            <App />
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1f2937',
                  color: '#ffffff',
                  borderRadius: '0.75rem',
                  padding: '1rem'
                }
              }}
            />
          </ConversationProvider>
        </AnalyticsProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
