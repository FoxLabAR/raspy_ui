<script setup lang="ts">
import { onMounted } from 'vue';
import { useConnection } from '../lib/connectionStore';

const { isConnected: connected, setConnected, attemptAutoConnect, checkActiveSession, disconnect } = useConnection();

onMounted(async () => {
    // First check if we are effectively connected (backend session check)
    await checkActiveSession();
    // Then try auto-connect if configured and not connected
    if (!connected.value) {
        attemptAutoConnect();
    }
});
</script>

<template>
  <div class="connection-status" 
       :class="{ online: connected, offline: !connected, clickable: connected }"
       @click="connected ? disconnect() : null"
       :title="connected ? 'Click to disconnect' : ''">
      {{ connected ? 'CONNECTED' : 'DISCONNECTED' }}
      <i v-if="connected" class="ri-shut-down-line ml-1"></i>
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
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
        }
    }
    
    /* Reveal disconnect text on hover */
    &.clickable:hover {
        &::after {
            content: " x";
        }
    }
    
    .ml-1 { margin-left: 4px; }
}
</style>
