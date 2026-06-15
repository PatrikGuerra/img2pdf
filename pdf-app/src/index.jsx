import React from 'react';
import { createRoot } from 'react-dom/client';
import 'font-awesome/css/font-awesome.min.css';
import './index.css';
import App from './App';
import { setupMobileDragDrop } from './polyfills/mobileDragDrop';

setupMobileDragDrop();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
