<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useTerminal } from '../lib/terminalStore';

const { state, toggle, clear } = useTerminal();
const bodyRef = ref<HTMLElement | null>(null);

// Auto-scroll to bottom
watch(() => state.logs.length, async () => {
  if (state.isOpen) {
    await nextTick();
    if (bodyRef.value) {
      bodyRef.value.scrollTop = bodyRef.value.scrollHeight;
    }
  }
});
</script>

<template>
  <div class="global-terminal" :class="{ 'is-open': state.isOpen }">
    <div class="terminal-header" @click="toggle">
      <div class="title-section">
        <div class="status-indicator"></div>
        <span class="title">SYS.CONSOLE</span>
      </div>
      <div class="controls">
        <button class="ctrl-btn" @click.stop="clear">CLR</button>
        <button class="ctrl-btn toggle-btn" @click.stop="toggle">
          {{ state.isOpen ? '▼' : '▲' }}
        </button>
      </div>
    </div>
    
    <div class="terminal-body" ref="bodyRef">
      <div v-if="state.logs.length === 0" class="empty-state">
        > No active logs. System ready.
      </div>
      <div v-for="log in state.logs" :key="log.id" class="log-line" :class="log.type">
        <span class="timestamp">[{{ log.timestamp }}]</span>
        <span class="content">
          <span v-if="log.type === 'command'" class="prompt">$ </span>
          {{ log.message }}
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "sass:color";

.global-terminal {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 40px; /* Collapsed height */
  background: var(--bg-terminal, #000);
  border-top: 1px solid var(--border-light, #333);
  display: flex;
  flex-direction: column;
  z-index: 9999;
  transition: height 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
  font-family: var(--font-mono, monospace);

  &.is-open {
    height: 350px; /* Expanded height */
  }

  /* ... existing styles ... */
  &:hover {
    background: color.adjust(#111, $lightness: 5%);
  }

  .title-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-green, #0f0);
      box-shadow: 0 0 8px var(--accent-green, #0f0);
    }

    .title {
      font-size: 0.9rem;
      color: var(--text-muted, #888);
      font-weight: 600;
      letter-spacing: 1px;
    }
  }

  .controls {
    display: flex;
    gap: 0.5rem;
  }
}


.ctrl-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted, #888);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  font-family: inherit;
  border-radius: 2px;
  transition: all 0.2s;

  &:hover {
    color: var(--text-main, #fff);
    background: rgba(255, 255, 255, 0.1);
  }
}

.terminal-body {
  flex-grow: 1;
  overflow-y: auto;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.95);
  color: #ccc;
  font-size: 0.85rem;
  line-height: 1.5;

  /* Custom scrollbar for this container */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #444;
  }
}

.log-line {
  margin-bottom: 0.25rem;
  word-break: break-all;
  display: flex;
  gap: 0.75rem;

  .timestamp {
    color: #555;
    flex-shrink: 0;
    user-select: none;
  }

  &.error { color: var(--accent-danger, #f33); }
  &.success { color: var(--accent-green, #0f0); }
  &.command { 
    color: var(--accent-cyan, #0ff); 
    font-weight: bold;
  }
  &.ssh_out { color: #ddd; }
  &.ssh_err { color: #f77; }
}

.empty-state {
  color: #444;
  font-style: italic;
}
</style>
