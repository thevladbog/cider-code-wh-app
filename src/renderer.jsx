import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('Starting React render process');

function render() {
  console.log('Attempting to render React app');
  
  const rootElement = document.getElementById('root');
  console.log('Root element found:', rootElement);
  
  if (rootElement) {
    try {
      const root = ReactDOM.createRoot(rootElement);
      console.log('Root created');
      
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
      console.log('App rendered');
    } catch (error) {
      console.error('Error rendering React app:', error);
    }
  } else {
    console.error('Could not find root element. Cannot mount React app.');
  }
}

// Ensure DOM is fully loaded before attempting to render
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', render);
} else {
  // If DOMContentLoaded has already fired
  render();
}
