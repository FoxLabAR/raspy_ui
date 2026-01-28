<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { connectSSH } from '../lib/api';

const emit = defineEmits(['close', 'connected']);

const form = ref({
    host: '',
    username: 'dietpi',
    password: '',
    authType: 'password', // password | key
    keyName: ''
});

const loading = ref(false);
const error = ref('');

onMounted(() => {
    const savedHost = localStorage.getItem('raspi_host');
    const savedUser = localStorage.getItem('raspi_user');
    const savedAuth = localStorage.getItem('raspi_auth_type');
    const savedKey = localStorage.getItem('raspi_key_name');
    
    if (savedHost) form.value.host = savedHost;
    if (savedUser) form.value.username = savedUser;
    if (savedAuth) form.value.authType = savedAuth;
    if (savedKey) form.value.keyName = savedKey;
});

const connect = async () => {
    loading.value = true;
    error.value = '';
    
    // Persist non-sensitive data
    localStorage.setItem('raspi_host', form.value.host);
    localStorage.setItem('raspi_user', form.value.username);
    // Auth pref is saved by Settings, but we can update if user toggles manually?
    localStorage.setItem('raspi_auth_type', form.value.authType);

    const result = await connectSSH(form.value);
    loading.value = false;
    if (result && result.success) {
        emit('connected');
        emit('close');
    } else {
        error.value = (result && result.error) || 'CONNECTION_FAILED_RETRY';
    }
};

const toggleAuth = () => {
    form.value.authType = form.value.authType === 'password' ? 'key' : 'password';
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal cyber-card">
        <div class="modal-header">
            <h2>ESTABLISH UPLINK</h2>
            <div class="icon">⚯</div>
        </div>
        
        <form @submit.prevent="connect">
            <div class="form-group">
                <label>TARGET_HOST</label>
                <div class="input-wrapper">
                    <span class="prefix">ssh://</span>
                    <input v-model="form.host" placeholder="192.168.0.x" required autofocus />
                </div>
            </div>
            
            <div class="form-group">
                <label>USER_ID</label>
                <input v-model="form.username" placeholder="dietpi" required />
            </div>
            
            <div class="form-group" v-if="form.authType === 'password'">
                <div class="label-row">
                    <label>ACCESS_KEY</label>
                    <button type="button" class="link-btn" @click="toggleAuth" v-if="form.keyName">USE KEY</button>
                </div>
                <input type="password" v-model="form.password" placeholder="••••••••" required />
            </div>

            <div class="form-group" v-else>
                 <div class="label-row">
                    <label>IDENTITY_FILE</label>
                    <button type="button" class="link-btn" @click="toggleAuth">USE PASSWORD</button>
                </div>
                <div class="key-display">
                    <span class="icon">🔑</span>
                    <span class="name">{{ form.keyName }}</span>
                </div>
                <input type="hidden" v-model="form.keyName" required />
            </div>
            
            <div class="actions">
                <button type="button" class="btn-cancel" @click="$emit('close')">ABORT</button>
                <button type="submit" class="btn-primary" :disabled="loading">
                    {{ loading ? 'NEGOTIATING...' : 'INITIATE_CONNECTION' }}
                </button>
            </div>
            
            <div v-if="error" class="error-msg">
                <span class="blink">⚠</span> {{ error }}
            </div>
        </form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "sass:color";

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.8);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal {
    width: 400px;
    background: var(--bg-panel);
    border: 1px solid var(--accent-cyan);
    box-shadow: 0 0 30px rgba(0, 243, 255, 0.1);
    padding: 2rem;
    position: relative;
    
    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background: var(--accent-cyan);
    }
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    
    h2 {
        margin: 0;
        font-size: 1.2rem;
        color: var(--accent-cyan);
        letter-spacing: 2px;
    }
    
    .icon {
        font-size: 1.5rem;
        color: var(--text-muted);
    }
}

.form-group {
    margin-bottom: 1.5rem;
    
    .label-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
        
        label { margin: 0; }
        .link-btn {
            background: none; border: none; padding: 0;
            color: var(--accent-pink);
            font-size: 0.7rem;
            cursor: pointer;
            text-decoration: underline;
            &:hover { color: #fff; }
        }
    }
    
    label {
        display: block;
        font-size: 0.75rem;
        color: var(--text-muted);
        letter-spacing: 1px;
    }
    
    input {
        width: 100%;
        background: rgba(0,0,0,0.3);
        border: 1px solid var(--border-light);
        color: var(--text-main);
        padding: 0.75rem;
        font-family: var(--font-mono);
        transition: all 0.2s;
        
        &:focus {
            outline: none;
            border-color: var(--accent-cyan);
            box-shadow: 0 0 10px rgba(0, 243, 255, 0.1);
        }
    }
    
    .input-wrapper {
        display: flex;
        align-items: center;
        background: rgba(0,0,0,0.3);
        border: 1px solid var(--border-light);
        
        .prefix {
            padding: 0 0.75rem;
            color: var(--text-muted);
            font-size: 0.9rem;
            font-family: var(--font-mono);
        }
        
        input {
            border: none;
            background: transparent;
            padding-left: 0;
            
            &:focus { box-shadow: none; }
        }
        
        &:focus-within {
            border-color: var(--accent-cyan);
            box-shadow: 0 0 10px rgba(0, 243, 255, 0.1);
        }
    }
}

.key-display {
    padding: 0.75rem;
    background: rgba(0, 255, 100, 0.1);
    border: 1px solid var(--accent-green);
    color: var(--accent-green);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--font-mono);
    
    .name { font-weight: bold; }
}

.actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
    
    button {
        flex: 1;
        padding: 0.75rem;
        border: none;
        cursor: pointer;
        font-family: var(--font-mono);
        font-weight: 600;
        font-size: 0.9rem;
        transition: all 0.2s;
        text-transform: uppercase;
    }
    
    .btn-cancel {
        background: transparent;
        border: 1px solid var(--border-light);
        color: var(--text-muted);
        &:hover {
            color: var(--text-main);
            border-color: var(--text-main);
        }
    }

    .btn-primary {
        background: var(--accent-cyan);
        color: #000;
        &:hover:not(:disabled) {
            background: color.adjust(#00f3ff, $lightness: 10%);
            box-shadow: 0 0 15px rgba(0, 243, 255, 0.4);
        }
        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }
}

.error-msg {
    margin-top: 1rem;
    color: var(--accent-danger);
    font-size: 0.8rem;
    font-family: var(--font-mono);
    text-align: center;
    
    .blink { animation: blink 1s infinite; }
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}
</style>
