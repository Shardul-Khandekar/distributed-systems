import React, { useEffect } from 'react';
import { A2UIProvider, A2UIRenderer, useA2UI, useA2UIActions } from '@a2ui/react';

function AgentView() {
  
  const { processMessages } = useA2UIActions();

  // const a2ui = useA2UI();
  // console.log('useA2UI returns:', a2ui);

  // const actions = useA2UIActions();
  // console.log('useA2UIActions returns:', actions);

  useEffect(() => {
    processMessages([
      {
        surface_id: 'main',
        components: [
          {
            type: 'TaskCard',
            props: { id: 101, status: 'Thinking', logs: 'Analyzing data source...' }
          },
          {
            type: 'TaskCard',
            props: { id: 102, status: 'Pending', logs: 'Waiting in queue...' }
          }
        ]
      }
    ]);
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Agentic Observer</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        <A2UIRenderer surface="main" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <A2UIProvider>
      <AgentView />
    </A2UIProvider>
  );
}