<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useConnection } from '../lib/connectionStore';

const props = defineProps<{ repoName: string; }>();
const { isConnected } = useConnection();

// We need the full path. For now assume it sits in the 'repo root' defined in settings?
// Or we pass it via query param?
// Let's assume standard location /opt/git for now or pass it.
// Actually, earlier we listed repos from a specific path. 
// We should probably pass the full path in the URL query or store it.
// Let's use a default root for now + name.
const repoPath = computed(() => `/opt/git/${props.repoName}.git`); 

const activeTab = ref<'info' | 'hooks'>('info');
const details = ref<any>(null);
const loading = ref(false);
const error = ref('');

// Hooks editing
const selectedHook = ref('post-receive');
const hookContent = ref('');
const loadingHook = ref(false);
const savingHook = ref(false);

const loadDetails = async () => {
    if (!isConnected.value) return;
    loading.value = true;
    error.value = '';
    
    try {
        const res = await fetch('/api/git/details', {
            method: 'POST',
            body: JSON.stringify({ action: 'get_details', path: repoPath.value })
        });
        const data = await res.json();
        if (data.success) {
            details.value = data.data;
        } else {
            error.value = data.error;
        }
    } catch (e: any) {
        error.value = e.message;
    } finally {
        loading.value = false;
    }
};

const loadHook = async () => {
    if (!isConnected.value) return;
    loadingHook.value = true;
    try {
        const res = await fetch('/api/git/details', {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'get_hook', 
                path: repoPath.value, 
                hookName: selectedHook.value 
            })
        });
        const data = await res.json();
        if (data.success) {
            hookContent.value = data.content;
        }
    } catch (e) {
        console.error(e);
    } finally {
        loadingHook.value = false;
    }
}

const saveHook = async () => {
    if (!isConnected.value) return;
    savingHook.value = true;
    try {
        const res = await fetch('/api/git/details', {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'save_hook', 
                path: repoPath.value, 
                hookName: selectedHook.value,
                hookContent: hookContent.value
            })
        });
        const data = await res.json();
        if (data.success) {
            alert('Hook saved successfully');
        } else {
            alert('Failed to save hook: ' + data.error);
        }
    } catch (e) {
        alert('Error saving hook');
    } finally {
        savingHook.value = false;
    }
}

const copyCloneUrl = () => {
    // Assuming user is 'dietpi' and host is... we need to know the host IP.
    // We can get it from localStorage or stats if available.
    const host = localStorage.getItem('raspi_host') || 'raspberrypi';
    const user = localStorage.getItem('raspi_user') || 'dietpi';
    const url = `${user}@${host}:${repoPath.value}`;
    navigator.clipboard.writeText(`git clone ${url}`);
    alert('Clone URL copied to clipboard: ' + url);
}

onMounted(() => {
    if (isConnected.value) {
        loadDetails();
        loadHook();
    }
    watch(() => props.repoName, () => {
         if (isConnected.value) loadDetails();
    });
    watch(selectedHook, () => loadHook());
});
</script>

<template>
  <div class="repo-details">
      <div class="header">
          <div class="title-group">
               <h1>{{ repoName }}</h1>
               <div class="badge">BARE REPO</div>
          </div>
          <button class="btn-copy" @click="copyCloneUrl">📋 COPY CLONE URL</button>
      </div>

      <div class="tabs">
          <button :class="{ active: activeTab === 'info' }" @click="activeTab = 'info'">OVERVIEW</button>
          <button :class="{ active: activeTab === 'hooks' }" @click="activeTab = 'hooks'">GIT HOOKS</button>
      </div>

      <div class="tab-content" v-if="activeTab === 'info'">
          <div v-if="loading" class="loading">LOADING REPO DATA...</div>
          <div v-else-if="details" class="details-grid">
              <div class="section branches">
                  <h3>BRANCHES</h3>
                  <ul>
                      <li v-for="branch in details.branches" :key="branch" :class="{ current: branch.includes('*') }">
                          {{ branch }}
                      </li>
                  </ul>
              </div>
              <div class="section commits">
                  <h3>RECENT COMMITS</h3>
                   <div v-for="commit in details.commits" :key="commit.hash" class="commit-item">
                       <span class="hash">{{ commit.hash }}</span>
                       <span class="msg">{{ commit.msg }}</span>
                       <div class="meta">
                           <span class="author">{{ commit.author }}</span>
                           <span class="time">{{ commit.time }}</span>
                       </div>
                   </div>
              </div>
          </div>
      </div>

      <div class="tab-content" v-if="activeTab === 'hooks'">
          <div class="hooks-ui">
              <div class="sidebar">
                  <label>SELECT HOOK</label>
                  <select v-model="selectedHook" size="10">
                      <option value="post-receive">post-receive</option>
                      <option value="pre-receive">pre-receive</option>
                      <option value="update">update</option>
                      <!-- Add others as needed -->
                  </select>
              </div>
              <div class="editor-area">
                  <textarea v-model="hookContent" :disabled="loadingHook"></textarea>
                  <div class="actions">
                      <button class="btn-primary" @click="saveHook" :disabled="savingHook">
                          {{ savingHook ? 'SAVING...' : 'SAVE HOOK' }}
                      </button>
                  </div>
              </div>
          </div>
      </div>
  </div>
</template>

<style lang="scss" scoped>
.repo-details {
    padding: 2rem;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    
    h1 {
        margin: 0;
        font-size: 1.5rem;
        color: var(--accent-cyan);
        letter-spacing: 2px;
    }
    
    .badge {
        font-size: 0.6rem;
        background: rgba(255,255,255,0.1);
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        margin-left: 1rem;
        display: inline-block;
        vertical-align: middle;
    }
}

.btn-copy {
    background: transparent;
    border: 1px solid var(--accent-cyan);
    color: var(--accent-cyan);
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-family: var(--font-mono);
    &:hover { background: var(--accent-cyan); color: #000; }
}

.tabs {
    display: flex;
    gap: 1rem;
    border-bottom: 1px solid var(--border-light);
    margin-bottom: 1rem;
    
    button {
        background: none;
        border: none;
        padding: 0.5rem 1rem;
        color: var(--text-muted);
        cursor: pointer;
        font-family: var(--font-mono);
        border-bottom: 2px solid transparent;
        
        &.active {
            color: var(--text-main);
            border-bottom-color: var(--accent-cyan);
        }
    }
}

.tab-content {
    flex: 1;
    overflow-y: auto;
}

.details-grid {
    display: grid;
    grid-template-columns: 250px 1fr;
    gap: 2rem;
}

.section {
    h3 {
        font-size: 0.8rem;
        color: var(--text-muted);
        border-bottom: 1px solid var(--border-light);
        padding-bottom: 0.5rem;
        margin-bottom: 1rem;
    }
}

.branches ul {
    list-style: none;
    padding: 0;
    
    li {
        padding: 0.25rem 0;
        font-family: var(--font-mono);
        font-size: 0.9rem;
        
        &.current { color: var(--accent-green); }
    }
}

.commit-item {
    margin-bottom: 1rem;
    border-left: 2px solid var(--border-light);
    padding-left: 1rem;
    
    .hash { color: var(--accent-pink); font-family: var(--font-mono); margin-right: 0.5rem; font-size: 0.8rem; }
    .msg { font-weight: bold; }
    .meta { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem; }
}

.hooks-ui {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 1rem;
    height: 100%;
}

.sidebar select {
    width: 100%;
    height: 300px;
    background: rgba(0,0,0,0.3);
    border: 1px solid var(--border-light);
    color: var(--text-main);
    font-family: var(--font-mono);
    padding: 0.5rem;
    
    option { padding: 0.25rem; }
}

.editor-area {
    display: flex;
    flex-direction: column;
    
    textarea {
        flex: 1;
        background: #111;
        border: 1px solid var(--border-light);
        color: #eee;
        padding: 1rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.9rem;
        resize: none;
        min-height: 400px;
        &:focus { outline: none; border-color: var(--accent-cyan); }
    }
    
    .actions {
        margin-top: 1rem;
        text-align: right;
        
        .btn-primary {
            background: var(--accent-cyan);
            border: none;
            padding: 0.5rem 1.5rem;
            cursor: pointer;
            font-weight: bold;
            &:hover:not(:disabled) { background: #fff; }
        }
    }
}
</style>
