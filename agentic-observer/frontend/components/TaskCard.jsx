import React from 'react';

export function TaskCard({ id, status, logs }) {
    return (
    <div style={{
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '1rem',
      margin: '0.5rem',
      minWidth: '200px'
    }}>
      <h3>Task #{id}</h3>
      <p><strong>Status:</strong> {status}</p>
      <p><strong>Logs:</strong> {logs}</p>
    </div>
  );
}