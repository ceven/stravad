import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './stravad/App';
import './stravad/css/styles.css';
import './stravad/css/activity-styles.css';
import './stravad/css/background-styles.css'

// Import the core Font Awesome CSS
import '@fortawesome/fontawesome-free/css/fontawesome.css';

// Import specific icon style CSS files as needed
import '@fortawesome/fontawesome-free/css/solid.css';
import '@fortawesome/fontawesome-free/css/regular.css';
import '@fortawesome/fontawesome-free/css/brands.css';



ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
