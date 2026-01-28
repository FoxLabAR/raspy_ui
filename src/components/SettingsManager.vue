<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useConnection } from '../lib/connectionStore';
import { useSecurity } from '../lib/securityStore';

const { isConnected, setConnected } = useConnection();
// ...
// ...
const checkStatus = async () => {
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            body: JSON.stringify({ action: 'get_config' })
        });
        const data = await res.json();
        
        if (data.success) {
            setConnected(true);
            hasMasterPass.value = data.hasMasterPass;
        }
    } catch (e) {
        console.error('Connection check failed', e);
    }
}

onMounted(() => {
    checkStatus();
});
const { isAuthenticated, login, logout } = useSecurity();

const activeTab = ref('general');
const masterPasswordInput = ref('');
const setupPasswordInput = ref('');
const error = ref('');
const loading = ref(false);

const config = ref({
    repoPath: '/opt/git',
    connectionTimeout: 20000,
    customCommands: [] as { name: string, cmd: string }[]
});

const sshKey = ref('');
const hasMasterPass = ref(false);

// Unlocking
const unlock = async () => {
    loading.value = true;
    error.value = '';
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            body: JSON.stringify({ action: 'verify_master', password: masterPasswordInput.value })
        });
        const data = await res.json();
        if (data.success) {
            login();
            loadSettings();
        } else {
            error.value = 'INVALID_PASSWORD';
        }
    } catch (e: any) {
        error.value = e.message;
    } finally {
        loading.value = false;
    }
};

const setupMaster = async () => {
    loading.value = true;
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            body: JSON.stringify({ action: 'set_master', password: setupPasswordInput.value })
        });
        const data = await res.json();
        if (data.success) {
            hasMasterPass.value = true;
            masterPasswordInput.value = setupPasswordInput.value;
            unlock();
        }
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const loadSettings = async () => {
    const res = await fetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({ action: 'get_config' })
    });
    const data = await res.json();
    if (data.success) {
        config.value = { ...config.value, ...data.config };
        hasMasterPass.value = data.hasMasterPass;
    }
};

const saveSettings = async () => {
    loading.value = true;
    try {
        await fetch('/api/settings', {
            method: 'POST',
            body: JSON.stringify({ action: 'save_config', config: config.value })
        });
        alert('SETTINGS_SAVED');
    } catch (e) {
        alert('SAVE_FAILED');
    } finally {
        loading.value = false;
    }
};

const loadSSH = async () => {
    const res = await fetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({ action: 'get_ssh_key' })
    });
    const data = await res.json();
    if (data.success) {
        sshKey.value = data.key;
    }
};

const genSSH = async () => {
    const res = await fetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({ action: 'gen_ssh_key' })
    });
    const data = await res.json();
    if (data.success) {
        sshKey.value = data.key;
    }
};

const autoKeyName = ref('raspi_key');
const loadingSetup = ref(false);
const showKeyModal = ref(false);
const newKeyName = ref('');
const loadingKeys = ref(false);
const creatingKey = ref(false);
const smartKeys = ref<any[]>([]);

const fetchKeys = async () => {
    loadingKeys.value = true;
    try {
        const res = await fetch('/api/security/ssh_setup', {
            method: 'POST',
            body: JSON.stringify({ action: 'list_keys' })
        });
        const data = await res.json();
        if (data.keys) {
            smartKeys.value = data.keys;
        }
    } catch (e) {
        console.error('Failed to fetch keys', e);
    } finally {
        loadingKeys.value = false;
    }
};

const createSmartKey = async () => {
    if (!newKeyName.value) return;
    
    // We need host and user to update config efficiently
    const host = localStorage.getItem('raspi_host') || prompt('Target IP (HostName)?');
    const user = localStorage.getItem('raspi_user') || 'dietpi';
    
    if (!host) return;

    creatingKey.value = true;
    try {
        const res = await fetch('/api/security/ssh_setup', {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'create_smart_key', 
                keyName: newKeyName.value,
                host: host,
                username: user
            })
        });
        const data = await res.json();
        if (data.success) {
            alert('SMART_KEY_SUCCESS: Key created and config updated.');
            showKeyModal.value = false;
            fetchKeys();
        } else {
            alert('ERROR: ' + data.error);
        }
    } catch (e: any) {
        alert('SYSTEM_ERROR: ' + e.message);
    } finally {
        creatingKey.value = false;
    }
};

const deprecateKey = async (name: string) => {
    if (!confirm(`REVOKE access for key '${name}'? This will delete local files.`)) return;
    
    try {
        const res = await fetch('/api/security/ssh_setup', {
            method: 'POST',
            body: JSON.stringify({ action: 'delete_key', keyName: name })
        });
        if (res.ok) fetchKeys();
    } catch (e) {
        alert('DELETE_FAILED');
    }
};

// Initial load
watch(activeTab, (val) => {
    if (val === 'ssh') fetchKeys();
});

const runAutoSetup = async () => {
    // Deprecated by new UI but keeping if needed or redirecting
    showKeyModal.value = true;
};

const addCommand = () => {
    config.value.customCommands.push({ name: 'NEW_CMD', cmd: 'echo "hello"' });
};

const removeCommand = (idx: number) => {
    config.value.customCommands.splice(idx, 1);
};


onMounted(() => {
    if (isConnected.value) checkStatus();
});
</script>

<template>
  <div class="settings-manager">
      <div v-if="!isConnected" class="offline-msg">SYSTEM OFFLINE</div>
      
      <div v-else-if="!isAuthenticated" class="auth-gate">
          <div class="cyber-card login-box">
              <h3>SECURITY_CLEARANCE_REQUIRED</h3>
              
              <div v-if="!hasMasterPass" class="setup-mode">
                  <p>NO MASTER PASSWORD DETECTED. INITIALIZE SECURITY PROTOCOL.</p>
                  <input type="password" v-model="setupPasswordInput" placeholder="SET_MASTER_PASSWORD" />
                  <button class="btn-primary" @click="setupMaster">INITIALIZE</button>
              </div>
              
              <div v-else class="login-mode">
                   <p>ENTER MASTER KEY TO ACCESS SETTINGS</p>
                   <input type="password" v-model="masterPasswordInput" placeholder="••••••••" @keyup.enter="unlock" />
                   <button class="btn-primary" @click="unlock">UNLOCK</button>
                   <div v-if="error" class="error">{{ error }}</div>
              </div>
          </div>
      </div>
      
      <div v-else class="settings-content">
          <div class="sidebar">
              <button :class="{ active: activeTab === 'general' }" @click="activeTab = 'general'">GENERAL</button>
              <button :class="{ active: activeTab === 'ssh' }" @click="activeTab = 'ssh'">SSH KEYS</button>
              <button :class="{ active: activeTab === 'commands' }" @click="activeTab = 'commands'">COMMANDS</button>
              <div class="spacer"></div>
              <button class="btn-logout" @click="logout">LOCK SESSION</button>
          </div>
          
          <div class="main-panel">
              <div v-if="activeTab === 'general'" class="panel-content">
                  <h2>GENERAL_CONFIGURATION</h2>
                  
                  <div class="form-group">
                      <label>GIT_REPOSITORY_PATH</label>
                      <input v-model="config.repoPath" />
                  </div>
                  
                  <div class="form-group">
                      <label>CONNECTION_TIMEOUT (ms)</label>
                      <input type="number" v-model="config.connectionTimeout" />
                  </div>
                  
                  <div class="actions">
                      <button class="btn-primary" @click="saveSettings">SAVE_CHANGES</button>
                  </div>
              </div>
              
              <div v-if="activeTab === 'ssh'" class="panel-content">
                   <h2>SMART_KEY_MANAGEMENT</h2>
                   
                   <p class="desc-text">Manage dedicated SSH identities for password-less access. Keys are automatically synced to your local SSH config.</p>
                   
                   <div class="keys-list">
                       <div v-if="loadingKeys" class="loading">SCANNING_CREDENTIALS...</div>
                       <div v-else-if="smartKeys.length === 0" class="empty">NO_SMART_KEYS_FOUND</div>
                       
                       <div v-else v-for="key in smartKeys" :key="key.name" class="key-item cyber-card">
                           <div class="key-info">
                               <span class="icon">🔑</span>
                               <div class="details">
                                   <span class="name">{{ key.name }}</span>
                                   <span class="path">{{ key.path }}</span>
                               </div>
                           </div>
                           <div class="key-status">
                               <span class="badge" :class="key.isConfigured ? 'active' : 'warn'">
                                   {{ key.isConfigured ? 'CONFIGURED' : 'UNLINKED' }}
                               </span>
                           </div>
                           <button class="btn-danger icon-only" title="DEPRECATE" @click="deprecateKey(key.name)">×</button>
                       </div>
                   </div>

                   <div class="actions">
                       <button class="btn-primary" @click="showKeyModal = true">
                           <span class="plus">+</span> NEW_SMART_KEY
                       </button>
                       <button class="btn-secondary" @click="fetchKeys">REFRESH</button>
                   </div>
              </div>
              
              <!-- Custom Commands Tab content... -->
              <div v-if="activeTab === 'commands'" class="panel-content">
                  <h2>CUSTOM_COMMAND_REGISTRY</h2>
                  
                  <div class="cmd-list">
                      <div v-for="(cmd, idx) in config.customCommands" :key="idx" class="cmd-item">
                          <input v-model="cmd.name" placeholder="NAME" class="name-input" />
                          <input v-model="cmd.cmd" placeholder="SHELLvCOMMAND" class="cmd-input" />
                          <button class="btn-danger" @click="removeCommand(idx)">×</button>
                      </div>
                  </div>
                  
                  <button class="btn-add" @click="addCommand">+ ADD COMMAND</button>
                  
                   <div class="actions mt-4">
                      <button class="btn-primary" @click="saveSettings">SAVE_REGISTRY</button>
                  </div>
              </div>
          </div>
      </div>
      
      <!-- NEW KEY MODAL -->
      <div v-if="showKeyModal" class="modal-overlay" @click.self="showKeyModal = false">
          <div class="cyber-card modal">
              <h3>INITIALIZE_SMART_KEY</h3>
              <p>This will generate a new pair, install it on the Pi, and update your PC's SSH config.</p>
              
              <div class="form-group">
                  <label>KEY_CODENAME (Host Alias)</label>
                  <input v-model="newKeyName" placeholder="e.g. raspi_work" autofocus @keyup.enter="createSmartKey" />
              </div>
              
              <div class="modal-actions">
                  <button class="btn-cancel" @click="showKeyModal = false">CANCEL</button>
                  <button class="btn-primary" @click="createSmartKey" :disabled="creatingKey">
                      {{ creatingKey ? 'PROCESSING...' : 'EXECUTE' }}
                  </button>
              </div>
          </div>
      </div>
  </div>
</template>

<style lang="scss" scoped>
.settings-manager {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.offline-msg { color: var(--text-muted); letter-spacing: 2px; }

.auth-gate {
    .login-box {
        width: 400px;
        padding: 2rem;
        text-align: center;
        border-color: var(--accent-pink);
        
        h3 { color: var(--accent-pink); margin-top: 0; }
        p { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 2rem; }
        
        input {
            width: 100%;
            padding: 0.8rem;
            background: rgba(0,0,0,0.3);
            border: 1px solid var(--border-light);
            color: white;
            margin-bottom: 1rem;
            text-align: center;
            font-family: var(--font-mono);
            letter-spacing: 4px;
            
            &:focus { outline: none; border-color: var(--accent-pink); }
        }
        
        .btn-primary { width: 100%; background: var(--accent-pink); color: black; border: none; padding: 0.8rem; cursor: pointer; font-weight: bold; }
        .error { color: var(--accent-danger); margin-top: 1rem; font-size: 0.8rem; }
    }
}

.settings-content {
    width: 100%;
    height: 100%;
    display: flex;
    
    .sidebar {
        width: 200px;
        border-right: 1px solid var(--border-light);
        display: flex;
        flex-direction: column;
        
        button {
            padding: 1rem;
            text-align: left;
            background: transparent;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            font-family: var(--font-mono);
            border-left: 2px solid transparent;
            
            &.active {
                color: var(--accent-cyan);
                background: rgba(255,255,255,0.02);
                border-left-color: var(--accent-cyan);
            }
            
            &:hover { color: var(--text-main); }
        }
        
        .spacer { flex: 1; }
        
        .btn-logout {
            color: var(--accent-danger);
            &:hover { background: rgba(255,50,50,0.1); }
        }
    }
    
    .main-panel {
        flex: 1;
        padding: 2rem;
        overflow-y: auto;
        
        h2 { color: var(--accent-cyan); margin-top: 0; font-size: 1.2rem; border-bottom: 1px solid var(--border-light); padding-bottom: 1rem; margin-bottom: 2rem; }
    }
}

.form-group {
    margin-bottom: 1.5rem;
    label { display: block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.8rem; }
    input {
        width: 100%;
        padding: 0.8rem;
        background: rgba(0,0,0,0.3);
        border: 1px solid var(--border-light);
        color: white;
        font-family: var(--font-mono);
        &:focus { outline: none; border-color: var(--accent-cyan); }
    }
}

.key-display {
    textarea {
        width: 100%;
        height: 200px;
        background: #111;
        border: 1px solid var(--border-light);
        color: var(--accent-green);
        padding: 1rem;
        font-family: var(--font-mono);
        font-size: 0.8rem;
        resize: none;
    }
}

.cmd-item {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    
    .name-input { width: 150px; }
    .cmd-input { flex: 1; }
    .btn-danger { background: transparent; border: 1px solid var(--accent-danger); color: var(--accent-danger); cursor: pointer; width: 40px; }
}

.btn-add {
    background: transparent;
    border: 1px dashed var(--border-light);
    color: var(--text-muted);
    width: 100%;
    padding: 1rem;
    cursor: pointer;
    &:hover { border-color: var(--accent-cyan); color: var(--accent-cyan); }
}

.actions {
    margin-top: 2rem;
    display: flex;
    gap: 1rem;
    
    button {
        padding: 0.8rem 2rem;
        cursor: pointer;
        border: none;
        font-weight: bold;
        font-family: var(--font-mono);
    }
    .btn-primary { background: var(--accent-cyan); color: black; }
    .btn-secondary { background: transparent; border: 1px solid var(--border-light); color: var(--text-main); }
}

.keys-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
    
    .loading, .empty {
        text-align: center; color: var(--text-muted); padding: 2rem; font-family: var(--font-mono); font-size: 0.8rem; letter-spacing: 2px;
    }
    
    .key-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        background: rgba(0,0,0,0.3);
        border: 1px solid var(--border-light);
        
        .key-info {
            display: flex;
            align-items: center;
            gap: 1rem;
            
            .icon { font-size: 1.5rem; }
            .details {
                display: flex; flex-direction: column;
                .name { color: var(--accent-cyan); font-weight: bold; font-family: var(--font-mono); }
                .path { font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono); }
            }
        }
        
        .badge {
            font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: bold;
            &.active { background: rgba(0, 255, 100, 0.1); color: var(--accent-green); border: 1px solid var(--accent-green); }
            &.warn { background: rgba(255, 100, 0, 0.1); color: orange; border: 1px solid orange; }
        }
        
        .btn-danger {
            background: transparent; color: var(--accent-danger); border: none; font-size: 1.2rem; cursor: pointer;
            &:hover { color: #fff; }
        }
    }
}

.desc-text {
    color: var(--text-muted); margin-bottom: 1.5rem; font-size: 0.9rem;
}

.modal-actions {
    display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;
    button { padding: 0.5rem 1rem; cursor: pointer; border: 1px solid transparent; font-family: var(--font-mono); }
    .btn-cancel { background: transparent; border-color: #444; color: #ccc; }
    .btn-primary { background: var(--accent-cyan); color: #000; font-weight: bold; }
}

.mt-4 { margin-top: 2rem; }
</style>
