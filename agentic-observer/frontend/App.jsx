import React from 'react';
import { A2UIProvider } from '@a2ui/react';

export default function App() {
  return (
    <A2UIProvider>
      <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Agentic Observer</h1>
        <p>A2UIProvider is now wrapping the app.</p>
      </div>
    </A2UIProvider>
  );
}