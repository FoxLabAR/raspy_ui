<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useConnection } from '../lib/connectionStore';

const { isConnected } = useConnection();
const currentPath = ref('/opt'); // Default start path
const items = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const selectedItem = ref<any>(null);
const showCreateModal = ref(false);
const newName = ref('');
const createType = ref<'directory' | 'file'>('directory');

const breadcrumbs = computed(() => {
    const parts = currentPath.value.split('/').filter(p => p);
    // return array of { name, path }
    let path = '';
    return parts.map(p => {
        path += '/' + p;
        return { name: p, path };
    });
});

const loadPath = async (path: string) => {
    if (!isConnected.value) return;
    loading.value = true;
    error.value = '';
    selectedItem.value = null;
    
    try {
        const res = await fetch('/api/fs', {
            method: 'POST',
            body: JSON.stringify({ action: 'list', path })
        });
        const data = await res.json();
        
        if (data.success) {
            items.value = data.data;
            currentPath.value = path;
        } else {
            error.value = data.error;
        }
    } catch (e: any) {
        error.value = e.message;
    } finally {
        loading.value = false;
    }
};

const navigate = (path: string) => {
    loadPath(path);
};

const openItem = (item: any) => {
    if (item.type === 'directory') {
        navigate(item.path);
    } else {
        selectedItem.value = item;
    }
};

const goUp = () => {
    if (currentPath.value === '/') return;
    const parts = currentPath.value.split('/');
    parts.pop();
    const newPath = parts.join('/') || '/';
    navigate(newPath);
};

const createItem = async () => {
    if (!newName.value) return;
    loading.value = true;
    try {
        const res = await fetch('/api/fs', {
            method: 'POST',
            body: JSON.stringify({ 
                action: createType.value === 'directory' ? 'mkdir' : 'create_file',
                path: currentPath.value,
                name: newName.value 
            })
        });
        const data = await res.json();
        if (data.success) {
            showCreateModal.value = false;
            newName.value = '';
            loadPath(currentPath.value);
        } else {
            error.value = data.error;
        }
    } catch(e: any) {
         error.value = e.message;
    } finally {
        loading.value = false;
    }
}

const deleteItem = async () => {
    if (!selectedItem.value) return;
    if (!confirm(`Permanently delete ${selectedItem.value.name}?`)) return;
    
    loading.value = true;
    try {
         const res = await fetch('/api/fs', {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'delete',
                path: selectedItem.value.path
            })
        });
        const data = await res.json();
        if (data.success) {
            loadPath(currentPath.value);
        } else {
            error.value = data.error;
        }
    } catch (e: any) {
        error.value = e.message;
    } finally {
        loading.value = false;
    }
}

const { isConnected: connected } = useConnection();

// Watch connection
import { watch } from 'vue';
watch(connected, (newVal) => {
    if (newVal) loadPath(currentPath.value);
});

onMounted(() => {
    // If already connected, load
    if (connected.value) {
        loadPath(currentPath.value);
    }
});
</script>

<template>
  <div class="file-manager">
      <div v-if="!connected" class="empty-placeholder">
          <div class="msg">AWAITING_UPLINK...</div>
      </div>
      
      <div v-else class="content-wrapper">
          <div class="toolbar">
              <div class="breadcrumbs">
                  <button class="crumb root" @click="navigate('/')">ROOT</button>
                  <span v-for="crumb in breadcrumbs" :key="crumb.path">
                      <span class="sep">/</span>
                      <button class="crumb" @click="navigate(crumb.path)">{{ crumb.name }}</button>
                  </span>
              </div>
              <div class="actions">
                  <button class="btn-icon" @click="loadPath(currentPath)">↻</button>
                  <button class="btn-icon" @click="showCreateModal=true; createType='directory'">+ DIR</button>
                  <button class="btn-icon" @click="showCreateModal=true; createType='file'">+ FILE</button>
              </div>
          </div>
          
          <div v-if="error" class="error-banner">{{ error }}</div>
          
          <div class="file-grid" :class="{ loading }">
              <div v-if="currentPath !== '/'" class="item folder back" @click="goUp">
                  <div class="icon">⤴</div>
                  <div class="name">..</div>
              </div>
              
              <div v-for="item in items" :key="item.path" 
                   class="item" 
                   :class="[item.type, { selected: selectedItem && selectedItem.path === item.path }]"
                   @click="selectedItem = item"
                   @dblclick="openItem(item)">
                   
                   <div class="icon">{{ item.type === 'directory' ? '📁' : '📄' }}</div>
                   <div class="name">{{ item.name }}</div>
                   <div class="meta" v-if="item.type === 'file'">{{ item.size }} B</div>
              </div>
          </div>
          
          <div class="footer-status" v-if="selectedItem">
              <div class="info">
                  SELECTED: <span class="highlight">{{ selectedItem.name }}</span>
              </div>
              <div class="actions">
                  <button class="btn-danger" @click="deleteItem">DELETE</button>
               </div>
          </div>
      </div>
      
      <!-- Modal -->
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal=false">
          <div class="modal">
              <h3>CREATE NEW {{ createType.toUpperCase() }}</h3>
              <input v-model="newName" placeholder="Name..." autofocus @keyup.enter="createItem" />
              <div class="modal-actions">
                  <button @click="showCreateModal=false">CANCEL</button>
                  <button class="primary" @click="createItem">CREATE</button>
              </div>
          </div>
      </div>
  </div>
</template>

<style lang="scss" scoped>
.file-manager {
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
}

.content-wrapper {
    display: flex;  
    flex-direction: column;
    height: 100%;
}

.empty-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
    font-family: var(--font-mono);
    letter-spacing: 2px;
}

.toolbar {
    padding: 1rem;
    background: var(--bg-panel);
    border-bottom: 1px solid var(--border-light);
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .breadcrumbs {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        
        .crumb {
            background: none;
            border: none;
            color: var(--accent-cyan);
            font-family: var(--font-mono);
            cursor: pointer;
            text-transform: uppercase;
            &:hover { text-decoration: underline; }
            &.root { font-weight: bold; }
        }
        .sep {
            color: var(--text-muted);
            margin: 0 0.5rem;
        }
    }
    
    .actions {
        display: flex;
        gap: 0.5rem;
        
        .btn-icon {
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--border-light);
            color: var(--text-main);
            padding: 0.25rem 0.75rem;
            cursor: pointer;
            font-family: var(--font-mono);
            &:hover { background: var(--accent-cyan); color: #000; }
        }
    }
}

.error-banner {
    background: rgba(255, 50, 50, 0.2);
    color: var(--accent-danger);
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    text-align: center;
}

.file-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    grid-auto-rows: 100px;
    gap: 1rem;
    padding: 1rem;
    overflow-y: auto;
    
    &.loading { opacity: 0.5; pointer-events: none; }
    
    .item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,0.03);
        border: 1px solid transparent;
        border-radius: 4px;
        cursor: pointer;
        padding: 0.5rem;
        transition: all 0.2s;
        
        &:hover {
            background: rgba(255,255,255,0.08);
        }
        
        &.selected {
            border-color: var(--accent-cyan);
            background: rgba(0, 243, 255, 0.1);
        }
        
        .icon {
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }
        
        .name {
            font-size: 0.8rem;
            text-align: center;
            word-break: break-all;
            color: var(--text-main);
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .meta {
            font-size: 0.7rem;
            color: var(--text-muted);
            margin-top: 0.2rem;
        }
        
        &.directory .name { color: var(--accent-cyan); }
    }
}

.footer-status {
    background: var(--bg-panel);
    border-top: 1px solid var(--border-light);
    padding: 0.5rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    
    .highlight { color: var(--accent-cyan); font-weight: bold; }
    
    .btn-danger {
        background: rgba(255, 50, 50, 0.2);
        color: var(--accent-danger);
        border: 1px solid var(--accent-danger);
        padding: 0.25rem 0.75rem;
        cursor: pointer;
        font-family: var(--font-mono);
        &:hover { background: var(--accent-danger); color: #fff; }
    }
}

.modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.modal {
    background: var(--bg-panel);
    border: 1px solid var(--accent-cyan);
    padding: 2rem;
    width: 300px;
    
    h3 { margin-top: 0; color: var(--accent-cyan); font-family: var(--font-mono); }
    
    input {
        width: 100%;
        padding: 0.5rem;
        background: rgba(0,0,0,0.3);
        border: 1px solid var(--border-light);
        color: white;
        margin: 1rem 0;
        font-family: var(--font-mono);
        &:focus { outline: none; border-color: var(--accent-cyan); }
    }
    
    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        
        button {
            padding: 0.5rem 1rem;
            cursor: pointer;
            background: transparent;
            border: 1px solid var(--border-light);
            color: var(--text-muted);
            
            &.primary {
                background: var(--accent-cyan);
                color: black;
                border-color: var(--accent-cyan);
            }
        }
    }
}
</style>
