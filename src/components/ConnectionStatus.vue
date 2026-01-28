<script setup lang="ts">
import { useConnection } from '../lib/connectionStore';

const { isConnected: connected, setConnected } = useConnection();
</script>


<template>
  <div class="connection-status" 
       :class="{ online: connected, offline: !connected, clickable: connected }"
       @click="connected ? setConnected(false) : null"
       :title="connected ? 'Click to disconnect' : ''">
      {{ connected ? 'CONNECTED' : 'DISCONNECTED' }}
  </div>
</template>

<style lang="scss" scoped>
.connection-status {
    font-size: 0.75rem;
    font-family: 'JetBrains Mono', monospace;
    padding: 0.25rem 0.5rem;
    border-radius: 2px;
    background: rgba(255, 50, 50, 0.1);
    color: var(--accent-danger);
    border: 1px solid var(--accent-danger);
    transition: all 0.3s;
    
    &.online {
        background: rgba(0, 255, 100, 0.1);
        color: var(--accent-green);
        border-color: var(--accent-green);
    }

    &.clickable {
        cursor: pointer;
        &:hover {
            background: rgba(255, 50, 50, 0.2);
            color: var(--accent-danger);
            border-color: var(--accent-danger);
            content: 'DISCONNECT'; /* CSS content replacement is tricky, let's keep it simple for now */
        }
    }
}
</style>
