import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

document.documentElement.style.minHeight = '100%';
document.body.style.margin = '0';
document.body.style.minWidth = '320px';
document.body.style.minHeight = '100vh';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
