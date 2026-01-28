import { reactive, readonly } from 'vue';

export interface LogEntry {
  id: number;
  timestamp: string;
  type: 'info' | 'error' | 'success' | 'command' | 'ssh_out' | 'ssh_err';
  message: string;
}

const state = reactive({
  isOpen: false, // Default closed
  logs: [] as LogEntry[]
});

let logId = 0;

export const useTerminal = () => {
  const toggle = () => {
    state.isOpen = !state.isOpen;
  };
  
  const open = () => {
    state.isOpen = true;
  };
  
  const close = () => {
    state.isOpen = false;
  };
  
  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    state.logs.push({
      id: logId++,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    });
    // Keep log max size reasonable
    if (state.logs.length > 500) {
      state.logs.shift();
    }
  };
  
  const clear = () => {
    state.logs = [];
  };

  return {
    state: readonly(state),
    toggle,
    open,
    close,
    addLog,
    clear
  };
};
