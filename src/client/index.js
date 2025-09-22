import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

// Unregister any existing service workers (one-time cleanup)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
      console.log('Unregistered old service worker');
    }
  });
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
<div className="App">
  <div className="App-intro">
    <App />
  </div>
</div>
);

// Register a reasonable service worker instead of the aggressive default
registerServiceWorker();
