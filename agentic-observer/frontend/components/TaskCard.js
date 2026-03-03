// A function that returns a template html string

export const TaskCard = ({ data }) => {
    // data is one individual object from agent_tasks array
    return `
    <div class="card" id="task-${data.id}">
      <div class="card-header">
        <strong>Task #${data.id}</strong>
        <span class="status-pill ${data.status.toLowerCase()}">${data.status}</span>
      </div>
      <div class="card-body">
        <p class="logs">${data.logs || 'Waiting for agent...'}</p>
      </div>
    </div>
  `;
};