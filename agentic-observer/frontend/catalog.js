import { initializeDefaultCatalog } from '@a2ui/react';
import { TaskCard } from './components/TaskCard.jsx';

export function setupCatalog() {
  initializeDefaultCatalog({
    // Key is what agent calls, value is the React component
    TaskCard: TaskCard
  });
}