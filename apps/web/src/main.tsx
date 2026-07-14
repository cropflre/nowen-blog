import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { App } from './App';
import './index.css';
import './motion.css';
import 'highlight.js/styles/github-dark.css';

document.documentElement.classList.toggle(
  'motion-enabled',
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
