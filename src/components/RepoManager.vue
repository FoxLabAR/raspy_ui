<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { sendCommand } from '../lib/api';

interface Repo {
    name: string;
    path: string;
    size: string;
}

const repos = ref<Repo[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);
const newRepoName = ref('');
const baseDir = ref('/opt/git'); // Default location, configurable

const fetchRepos = async () => {
    loading.value = true;
    // Command to find bare repos in baseDir. 
    // We look for directories ending in .git or just assume subdirs are repos for now.
    // Using 'du' to get size and name.
    const cmd = `mkdir -p ${baseDir.value} && cd ${baseDir.value} && du -sh *.git 2>/dev/null`;
    
    const res = await sendCommand(cmd);
    if (res && res.stdout) {
        repos.value = res.stdout.trim().split('\n').filter(Boolean).map((line: string) => {
            const [size, name] = line.split('\t');
            return { name: name.replace('/', ''), path: `${baseDir.value}/${name}`, size };
        });
    } else {
        repos.value = [];
    }
    loading.value = false;
};

const createRepo = async () => {
    if (!newRepoName.value) return;
    
    const name = newRepoName.value.endsWith('.git') ? newRepoName.value : `${newRepoName.value}.git`;
    const fullPath = `${baseDir.value}/${name}`;
    
    // Create bare repo and post-receive hook sample
    const cmd = `
        cd ${baseDir.value} && \
        git init --bare "${name}" && \
        cd "${name}/hooks" && \
        echo '#!/bin/bash\\necho "Received push on $(date)"' > post-receive && \
        chmod +x post-receive
    `;
    
    await sendCommand(cmd);
    showCreateModal.value = false;
    newRepoName.value = '';
    fetchRepos();
};

onMounted(() => {
    // Initial check (might fail if not connected, handled by global error log)
    fetchRepos();
});
</script>

<template>
  <div class="repo-manager">
      <div class="toolbar">
          <div class="path-display">
              <span class="label">SEARCH_PATH:</span>
              <input v-model="baseDir" @change="fetchRepos" class="path-input" />
          </div>
          <button class="btn-primary" @click="showCreateModal = true">
              <span class="icon">+</span> INITIALIZE_REPOSITORY
          </button>
      </div>

      <div v-if="loading" class="loading-state">
          SCANNING_SECTOR...
      </div>
      
      <div v-else-if="repos.length === 0" class="empty-state">
          NO_REPOSITORIES_DETECTED
      </div>
      
      <div v-else class="repo-grid">
          <div v-for="repo in repos" :key="repo.path" class="cyber-card repo-card">
              <div class="repo-icon">⑆</div>
              <div class="repo-info">
                  <h3><a :href="`/repo/${repo.name}`">{{ repo.name }}</a></h3>
                  <div class="meta">{{ repo.path }}</div>
                  <div class="meta size">SIZE: {{ repo.size }}</div>
              </div>
              <div class="actions">
                  <button class="btn-icon">⚙</button>
              </div>
          </div>
      </div>
      
      <!-- CREATE MODAL -->
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
          <div class="cyber-card modal">
              <h3>NEW_REPOSITORY</h3>
              <div class="form-group">
                  <label>REPO_NAME</label>
                  <input v-model="newRepoName" placeholder="project-omega.git" autofocus @keyup.enter="createRepo" />
              </div>
              <div class="modal-actions">
                  <button class="btn-cancel" @click="showCreateModal = false">CANCEL</button>
                  <button class="btn-primary" @click="createRepo">EXECUTE</button>
              </div>
          </div>
      </div>
  </div>
</template>

<style lang="scss" scoped>
.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    background: rgba(255, 255, 255, 0.02);
    padding: 1rem;
    border: 1px solid var(--border-light);
}

.path-display {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
    
    .label {
        color: var(--text-muted);
        font-size: 0.8rem;
    }
    
    .path-input {
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--border-light);
        color: var(--accent-cyan);
        font-family: var(--font-mono);
        width: 100%;
        max-width: 400px;
        &:focus { outline: none; border-color: var(--accent-cyan); }
    }
}

.repo-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.repo-card {
    display: flex;
    align-items: center;
    background: linear-gradient(90deg, var(--bg-panel) 0%, rgba(0,0,0,0) 100%);
    transition: all 0.2s;
    
    &:hover {
        border-color: var(--text-muted);
        transform: translateX(5px);
    }
    
    .repo-icon {
        font-size: 2rem;
        color: var(--text-muted);
        margin-right: 1.5rem;
    }
    
    .repo-info {
        flex: 1;
        h3 { 
            margin: 0; 
            a {
                color: inherit;
                text-decoration: none;
                &:hover { color: var(--accent-cyan); text-decoration: underline; }
            }
        }
        .meta {
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-top: 0.25rem;
        }
        .size { color: var(--accent-cyan); }
    }
    
    .btn-icon {
        background: transparent;
        border: 1px solid var(--border-light);
        color: var(--text-muted);
        width: 32px;
        height: 32px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        
        &:hover {
            color: var(--accent-cyan);
            border-color: var(--accent-cyan);
        }
    }
}

/* Modal Stlyes reused but scoped here for portability */
.modal-overlay {
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.8);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
}
.modal {
    width: 400px;
    padding: 2rem;
    border-color: var(--accent-pink);
    
    h3 { color: var(--accent-pink); margin-top: 0; }
    
    input {
        width: 100%;
        padding: 0.5rem;
        background: rgba(0,0,0,0.3);
        border: 1px solid var(--border-light);
        color: #fff;
        margin: 1rem 0;
        font-family: var(--font-mono);
    }
    
    .modal-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        
        button {
            padding: 0.5rem 1rem;
            border: 1px solid transparent;
            cursor: pointer;
            font-family: var(--font-mono);
        }
        
        .btn-primary { background: var(--accent-pink); color: #000; }
        .btn-cancel { background: transparent; border-color: var(--border-light); color: #fff; }
    }
}

.btn-primary {
    background: var(--accent-cyan);
    color: #000;
    border: none;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-weight: bold;
    font-family: var(--font-mono);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    &:hover { opacity: 0.9; }
}
</style>
