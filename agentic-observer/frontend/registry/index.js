import { Registry } from 'a2ui';
import { TaskCard } from '../components/TaskCard.js';

export function initializeRegistry() {

    Registry.add('TaskCardComponent', TaskCard);
    console.log("A2UI Registry Initialized");

}