<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { sendCommand } from '../lib/api';
import { useConnection } from '../lib/connectionStore';
import ConnectionModal from './ConnectionModal.vue';

const { isConnected, setConnected } = useConnection();
const showLogin = ref(false);

const stats = ref({
    cpu: 0,
    mem: { used: 0, total: 1024 },
    disk: { used: '0', size: '0' },
    temp: 0,
    uptime: '--',
    ip: '--',
    os: 'DietPi'
});

const fetchStats = async () => {
    // If not connected, we don't spam. But we might want to check once if we think we are connected.
    // However, the loop logic should definitely respect isConnected.
    if (!isConnected.value) return;

    const cmd = `
    echo "CPU:$(top -bn1 | grep 'Cpu(s)' | awk '{print $2 + $4}')"
    echo "MEM:$(free -m | grep Mem | awk '{print $3 "/" $2}')"
    echo "DISK:$(df -h / | grep / | awk '{print $3 "/" $2}')"
    echo "TEMP:$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || vcgencmd measure_temp 2>/dev/null)"
    echo "UPTIME:$(uptime -p)"
    echo "IP:$(hostname -I | awk '{print $1}')"
    `;

    const res = await sendCommand(cmd, true); // silent execution
    
    if (res && res.stdout) {
        // We are good
        if (!isConnected.value) setConnected(true);

        const lines = res.stdout.split('\n');
        lines.forEach(line => {
             // ... parsing logic ...
             const parts = line.split(':');
             const key = parts[0];
             const val = parts.slice(1).join(':').trim();
             
             if (!val) return;
 
             if (key === 'CPU') stats.value.cpu = Math.round(parseFloat(val) || 0);
             if (key === 'MEM') {
                 const [u, t] = val.split('/');
                 if (u && t) stats.value.mem = { used: parseInt(u), total: parseInt(t) };
             }
             if (key === 'DISK') {
                 const [u, t] = val.split('/');
                 if (u && t) stats.value.disk = { used: u, size: t };
             }
             if (key === 'TEMP') {
                 let t = parseFloat(val.replace('temp=', '').replace('\'C', ''));
                 if (t > 1000) t = t / 1000;
                 stats.value.temp = Math.round(t);
             }
             if (key === 'UPTIME') stats.value.uptime = val;
             if (key === 'IP') stats.value.ip = val;
        });
    } else {
        // sendCommand returns null on error.
        // It internaly handles 401 -> setConnected(false).
        // If it's another error (500, timeout), we might not want to disconnect immediately
        // unless it persists. But sendCommand logic is robust enough now.
        // The loop will stop if isConnected becomes false.
    }
};

let interval: ReturnType<typeof setInterval>;

const startPolling = () => {
    stopPolling();
    // Force one fetch logic directly to bypass the guard? No, we set connected=true in modal.
    // But if we are reloading, we need to try.
    // Logic: 
    // If we call startPolling from modal, isConnected is true.
    // If we load page, isConnected is false (default store).
    // We should try a "ping" on load.
    
    interval = setInterval(() => {
        if (isConnected.value) fetchStats();
    }, 5000);
};

const stopPolling = () => {
    if (interval) clearInterval(interval);
};

const checkConnection = async () => {
    // Try to fetch stats once regardless of state to see if backend session is alive
    const cmd = 'echo ping';
    const res = await sendCommand(cmd, true);
    if (res) {
        setConnected(true);
        fetchStats();
    }
};

onMounted(() => {
    checkConnection();
    startPolling();
});

onUnmounted(() => stopPolling());
</script>

<template>
  <div class="monitor-container">
      <div v-if="!isConnected" class="empty-placeholder">
          <div class="msg">SYSTEM OFFLINE // NO CARRIER</div>
          <button class="btn-connect" @click="showLogin = true">ESTABLISH_UPLINK</button>
      </div>
      
      <div v-else class="dashboard-content">
      <!-- ... content ... -->
          <div class="dashboard-grid">
               <!-- ... grid ... -->
               <div class="cyber-card stats-card">
                   <h3>CPU_LOAD</h3>
                   <div class="value">{{ stats.cpu }}<span class="unit">%</span></div>
                   <div class="bar-container">
                       <div class="bar" :style="{ width: stats.cpu + '%' }"></div>
                   </div>
               </div>
               
               <div class="cyber-card stats-card">
                   <h3>MEMORY_USAGE</h3>
                   <div class="value">{{ stats.mem.used }}<span class="unit">MB</span></div>
                   <div class="sub">/ {{ stats.mem.total }} MB</div>
                    <div class="bar-container">
                       <div class="bar" :style="{ width: (stats.mem.used / stats.mem.total * 100) + '%' }"></div>
                   </div>
               </div>
               
               <div class="cyber-card stats-card">
                   <h3>ROOT_FS</h3>
                   <div class="value">{{ stats.disk.used }}<span class="unit"></span></div>
                   <div class="sub">USED OF {{ stats.disk.size }}</div>
               </div>
               
                <div class="cyber-card stats-card">
                   <h3>CORE_TEMP</h3>
                   <div class="value" :class="{'text-danger': stats.temp > 75, 'text-green': stats.temp <= 75}">
                       {{ stats.temp }}<span class="unit">°C</span>
                   </div>
               </div>
          </div>
          
          <div class="section mt-4">
             <h2 class="section-title">SYSTEM_IDENTITY</h2>
             <div class="cyber-card">
                  <div class="info-row">
                     <span class="label">IP_ADDRESS</span>
                     <span class="val text-cyan">{{ stats.ip }}</span>
                 </div>
                 <div class="info-row">
                     <span class="label">UPTIME</span>
                     <span class="val">{{ stats.uptime }}</span>
                 </div>
                 <div class="info-row">
                     <span class="label">TARGET_OS</span>
                     <span class="val">{{ stats.os }}</span>
                 </div>
             </div>
           </div>
      </div>

      <ConnectionModal v-if="showLogin" @close="showLogin = false" @connected="setConnected(true); startPolling(); fetchStats()" />
  </div>
</template>

<style lang="scss" scoped>
.empty-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    border: 1px dashed var(--border-light);
    border-radius: 4px;
    background: rgba(0,0,0,0.2);
    
    .msg {
        color: var(--text-muted);
        letter-spacing: 2px;
        margin-bottom: 2rem;
        font-family: var(--font-mono);
    }
    
    .btn-connect {
        background: transparent;
        border: 1px solid var(--accent-cyan);
        color: var(--accent-cyan);
        padding: 1rem 2rem;
        font-family: var(--font-mono);
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        
        &:hover {
            background: rgba(0, 243, 255, 0.1);
            box-shadow: 0 0 20px rgba(0, 243, 255, 0.2);
        }
    }
}

.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
}

.stats-card {
    h3 {
        font-size: 0.75rem;
        color: var(--text-muted);
        margin: 0 0 0.5rem 0;
        letter-spacing: 1px;
    }
    .value {
        font-size: 2.5rem;
        font-weight: 700;
        font-family: 'JetBrains Mono';
        line-height: 1;
        margin-bottom: 0.5rem;
        
        .unit {
            font-size: 1rem;
            opacity: 0.5;
            margin-left: 0.25rem;
        }
    }
    .sub {
        font-size: 0.8rem;
        color: var(--text-muted);
    }
    
    .bar-container {
        height: 4px;
        background: rgba(255,255,255,0.1);
        margin-top: 1rem;
        border-radius: 2px;
        overflow: hidden;
        
        .bar {
            height: 100%;
            background: var(--accent-cyan);
        }
    }
    
    .text-danger { color: var(--accent-danger); }
    .text-green { color: var(--accent-green); }
}

.mt-4 { margin-top: 2rem; }

.section-title {
    font-size: 1rem;
    margin-bottom: 1rem;
    color: var(--accent-pink);
    text-transform: uppercase;
    letter-spacing: 1px;
}

.info-row {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    
    &:last-child { border-bottom: none; }
    
    .label {
        color: var(--text-muted);
        font-size: 0.9rem;
    }
    .val {
        font-family: 'JetBrains Mono';
        font-size: 0.9rem;
    }
}
</style>
