<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { sendCommand } from '../lib/api';

interface Service {
    unit: string;
    load: string;
    active: string;
    sub: string;
    description: string;
}

const services = ref<Service[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);
const showLogsModal = ref(false);
const selectedService = ref('');
const serviceLogs = ref('');

const newService = ref({
    name: '',
    execStart: '',
    user: 'root',
    description: 'My custom service'
});

const fetchServices = async () => {
    loading.value = true;
    // Get list of user/custom services or just all loaded units
    // focusing on .service files.
    const cmd = `systemctl list-units --type=service --no-legend --no-pager | head -n 50`; 
    
    const res = await sendCommand(cmd);
    if (res && res.stdout) {
        services.value = res.stdout.trim().split('\n').filter(Boolean).map(line => {
            // Parsing systemctl output is tricky as fixed width but can vary.
            // Simplified split by spaces, might need robust parsing.
            // Format: UNIT LOAD ACTIVE SUB DESCRIPTION
            const parts = line.trim().split(/\s+/);
            const unit = parts[0];
            const load = parts[1];
            const active = parts[2];
            const sub = parts[3];
            const description = parts.slice(4).join(' ');
            
            return { unit, load, active, sub, description };
        });
    }
    loading.value = false;
};

const toggleService = async (service: string, action: 'start' | 'stop' | 'restart') => {
    await sendCommand(`sudo systemctl ${action} ${service}`);
    setTimeout(fetchServices, 1000); // Wait a bit for state change
};

const viewLogs = async (service: string) => {
    selectedService.value = service;
    showLogsModal.value = true;
    serviceLogs.value = 'FETCHING_LOGS...';
    
    const cmd = `journalctl -u ${service} -n 50 --no-pager`;
    const res = await sendCommand(cmd);
    if (res) {
        serviceLogs.value = res.stdout || res.stderr || 'NO_LOGS_FOUND';
    }
};

const createService = async () => {
    if (!newService.value.name || !newService.value.execStart) return;
    
    const filename = newService.value.name.endsWith('.service') ? newService.value.name : `${newService.value.name}.service`;
    const path = `/etc/systemd/system/${filename}`;
    
    const content = `[Unit]
Description=${newService.value.description}
After=network.target

[Service]
ExecStart=${newService.value.execStart}
User=${newService.value.user}
Restart=always

[Install]
WantedBy=multi-user.target`;

    // Need sudo to write to /etc/systemd/system
    // Escaping content for echo is tricky. Using cat with EOF if possible or printf.
    // Simplest way for one-liner:
    const cmd = `
        echo "${content.replace(/\n/g, '\\n')}" | sudo tee ${path} && \
        sudo systemctl daemon-reload && \
        sudo systemctl enable ${filename} && \
        sudo systemctl start ${filename}
    `;
    
    await sendCommand(cmd);
    showCreateModal.value = false;
    fetchServices();
};

onMounted(() => {
    fetchServices();
});
</script>

<template>
  <div class="service-manager">
       <div class="toolbar">
          <button class="btn-primary" @click="showCreateModal = true">
              <span class="icon">+</span> NEW_SERVICE_UNIT
          </button>
           <button class="btn-secondary" @click="fetchServices">
              REFRESH_LIST
          </button>
      </div>

      <div class="service-list">
          <div class="header-row">
              <div class="col">UNIT</div>
              <div class="col">STATE</div>
              <div class="col">SUB</div>
              <div class="col desc">DESCRIPTION</div>
              <div class="col actions">CONTROLS</div>
          </div>
          
          <div v-for="svc in services" :key="svc.unit" class="service-row">
              <div class="col unit-name">{{ svc.unit }}</div>
              <div class="col">
                  <span class="badge" :class="svc.active">{{ svc.active }}</span>
              </div>
              <div class="col">{{ svc.sub }}</div>
              <div class="col desc">{{ svc.description }}</div>
              <div class="col actions">
                  <button class="btn-icon" title="Logs" @click="viewLogs(svc.unit)">≣</button>
                  <button class="btn-icon" title="Restart" @click="toggleService(svc.unit, 'restart')">↻</button>
                  <button v-if="svc.active === 'active'" class="btn-icon danger" title="Stop" @click="toggleService(svc.unit, 'stop')">⬛</button>
                  <button v-else class="btn-icon success" title="Start" @click="toggleService(svc.unit, 'start')">▶</button>
              </div>
          </div>
      </div>
      
       <!-- CREATE MODAL -->
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
          <div class="cyber-card modal">
              <h3>DEPLOY_NEW_SERVICE</h3>
              
              <div class="form-group">
                  <label>SERVICE_NAME (e.g. my-app.service)</label>
                  <input v-model="newService.name" placeholder="my-bot" />
              </div>
              
               <div class="form-group">
                  <label>EXEC_COMMAND (Full Path)</label>
                  <input v-model="newService.execStart" placeholder="/usr/bin/python3 /opt/script.py" />
              </div>
              
              <div class="form-group">
                  <label>RUN_AS_USER</label>
                  <input v-model="newService.user" placeholder="root" />
              </div>
              
               <div class="form-group">
                  <label>DESCRIPTION</label>
                  <input v-model="newService.description" placeholder="My Python Worker" />
              </div>
              
              <div class="modal-actions">
                  <button class="btn-cancel" @click="showCreateModal = false">CANCEL</button>
                  <button class="btn-primary" @click="createService">DEPLOY</button>
              </div>
          </div>
      </div>
      
       <!-- LOGS MODAL -->
      <div v-if="showLogsModal" class="modal-overlay" @click.self="showLogsModal = false">
          <div class="cyber-card modal logs-modal">
              <h3>LOG_OUTPUT: {{ selectedService }}</h3>
              <pre class="log-output">{{ serviceLogs }}</pre>
               <div class="modal-actions">
                  <button class="btn-cancel" @click="showLogsModal = false">CLOSE</button>
              </div>
          </div>
      </div>
  </div>
</template>

<style lang="scss" scoped>
.toolbar {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
}

.service-list {
    background: rgba(0,0,0,0.2);
    border: 1px solid var(--border-light);
    border-radius: 4px;
}

.header-row, .service-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 3fr 1.5fr;
    padding: 0.75rem 1rem;
    align-items: center;
    gap: 1rem;
}

.header-row {
    background: rgba(255,255,255,0.05);
    font-weight: 600;
    font-size: 0.8rem;
    color: var(--text-muted);
}

.service-row {
    border-bottom: 1px solid rgba(255,255,255,0.05);
    font-family: var(--font-mono);
    font-size: 0.85rem;
    
    &:hover { background: rgba(255,255,255,0.02); }
    &:last-child { border-bottom: none; }
}

.unit-name { color: var(--accent-cyan); }

.badge {
    padding: 0.2rem 0.5rem;
    border-radius: 2px;
    font-size: 0.7rem;
    text-transform: uppercase;
    background: #333;
    
    &.active { background: rgba(0, 255, 100, 0.2); color: var(--accent-green); }
    &.inactive { background: rgba(255, 50, 50, 0.2); color: var(--accent-danger); }
}

.actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
}

.btn-icon {
    background: transparent;
    border: 1px solid var(--border-light);
    color: var(--text-muted);
    width: 28px; height: 28px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    border-radius: 4px;
    &:hover { border-color: #fff; color: #fff; }
    
    &.danger:hover { border-color: var(--accent-danger); color: var(--accent-danger); }
    &.success:hover { border-color: var(--accent-green); color: var(--accent-green); }
}

.btn-primary {
    background: var(--accent-pink);
    color: #000;
    border: none;
    padding: 0.5rem 1rem;
    font-family: var(--font-mono);
    font-weight: bold;
    cursor: pointer;
    &:hover { opacity: 0.9; }
}

.btn-secondary {
    background: transparent;
    border: 1px solid var(--border-light);
    color: var(--text-main);
    padding: 0.5rem 1rem;
    font-family: var(--font-mono);
    cursor: pointer;
    &:hover { background: rgba(255,255,255,0.05); }
}

/* Modal re-use */
.modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex; align-items: center; justify-content: center;
    z-index: 200;
}
.modal {
    width: 500px;
    padding: 2rem;
    background: var(--bg-panel);
    border: 1px solid var(--accent-cyan);
    
    h3 { margin-top: 0; color: var(--accent-cyan); }
}

.logs-modal {
    width: 800px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}

.log-output {
    background: #000;
    padding: 1rem;
    color: #ccc;
    height: 400px;
    overflow-y: auto;
    font-size: 0.8rem;
    margin: 1rem 0;
    white-space: pre-wrap;
}

.form-group {
    margin-bottom: 1rem;
    label { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; }
    input { 
        width: 100%; padding: 0.5rem; 
        background: rgba(0,0,0,0.3); border: 1px solid #444; color: #fff;
        font-family: var(--font-mono);
    }
}
.modal-actions {
    display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;
    button { padding: 0.5rem 1rem; cursor: pointer; border: 1px solid transparent; font-family: var(--font-mono); }
    .btn-cancel { background: transparent; border-color: #444; color: #ccc; }
    .btn-primary { background: var(--accent-cyan); color: #000; font-weight: bold; }
}
</style>
