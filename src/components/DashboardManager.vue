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
    volt: '0',
    throttled: '0x0',
    clock: '0',
    repos: 0,
    containers: 0,
    services: 0,
    uptime: '--',
    ip: '--',
    os: 'DietPi'
});

const fetchStats = async () => {
    if (!isConnected.value) return;

    const cmd = `
    echo "CPU:$(top -bn1 | grep 'Cpu(s)' | awk '{print $2 + $4}')"
    echo "MEM:$(free -m | grep Mem | awk '{print $3 "/" $2}')"
    echo "DISK:$(df -h / | grep / | awk '{print $3 "/" $2}')"
    echo "TEMP:$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || vcgencmd measure_temp 2>/dev/null)"
    echo "VOLT:$(vcgencmd measure_volts core 2>/dev/null || echo '0')"
    echo "THROTTLED:$(vcgencmd get_throttled 2>/dev/null || echo '0x0')"
    echo "CLOCK:$(vcgencmd measure_clock arm 2>/dev/null || echo 'frequency(48)=0')"
    echo "REPOS:$(find ~ -maxdepth 3 -name '.git' 2>/dev/null | wc -l)"
    echo "DOCKER:$(docker ps -q 2>/dev/null | wc -l)"
    echo "SERVICES:$(systemctl list-units --type=service --state=running --no-legend 2>/dev/null | wc -l)"
    echo "UPTIME:$(uptime -p)"
    echo "IP:$(hostname -I | awk '{print $1}')"
    `;

    const res = await sendCommand(cmd, true); // silent execution

    if (res && res.stdout) {
        if (!isConnected.value) setConnected(true);

        const lines = res.stdout.split('\n');
        lines.forEach((line: string) => {
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
            if (key === 'VOLT') {
                const v = parseFloat(val.replace('volt=', '').replace('V', ''));
                stats.value.volt = v.toFixed(2);
            }
            if (key === 'THROTTLED') {
                // throttled=0x0
                stats.value.throttled = val.replace('throttled=', '').trim();
            }
            if (key === 'CLOCK') {
                // frequency(48)=1800000000
                const hz = parseInt(val.split('=')[1] || '0');
                // Convert to GHz
                stats.value.clock = (hz / 1000000000).toFixed(1);
            }
            if (key === 'REPOS') stats.value.repos = parseInt(val) || 0;
            if (key === 'DOCKER') stats.value.containers = parseInt(val) || 0;
            if (key === 'SERVICES') stats.value.services = parseInt(val) || 0;

            if (key === 'UPTIME') stats.value.uptime = val.replace('up ', '');
            if (key === 'IP') stats.value.ip = val;
        });
    }
};

let interval: ReturnType<typeof setInterval>;

const startPolling = () => {
    stopPolling();
    interval = setInterval(() => {
        if (isConnected.value) fetchStats();
    }, 5000);
};

const stopPolling = () => {
    if (interval) clearInterval(interval);
};

const checkConnection = async () => {
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

const navigate = (path: string) => {
    window.location.href = path;
};
</script>

<template>
    <div class="dashboard-wrap">
        <div v-if="!isConnected" class="empty-state">
            <div class="glass-panel center-msg">
                <i class="ri-wifi-off-line huge-icon"></i>
                <h2>OFFLINE</h2>
                <p>Raspberry Pi is unreachable.</p>
                <button class="btn-glow" @click="showLogin = true">CONNECT</button>
            </div>
        </div>

        <div v-else class="dashboard-content">
            <!-- TOP HEADER: Weather Metaphor Stats -->
            <header class="stats-header">
                <div class="stat-group">
                    <div class="stat-value">{{ stats.temp }}°</div>
                    <div class="stat-meta">
                        <i class="ri-fire-line icon-warm" v-if="stats.temp > 60"></i>
                        <i class="ri-temp-cold-line icon-cool" v-else></i>
                        <span>CPU Temp</span>
                    </div>
                </div>

                <div class="stat-group">
                    <div class="stat-value">{{ stats.cpu }}<small>%</small></div>
                    <div class="stat-meta">
                        <i class="ri-pulse-line"></i>
                        <span>Load</span>
                    </div>
                </div>

                <div class="stat-group">
                    <div class="stat-value">{{ Math.round((stats.mem.used / stats.mem.total) * 100) }}<small>%</small>
                    </div>
                    <div class="stat-meta">
                        <i class="ri-ram-2-fill"></i>
                        <span>Memory</span>
                    </div>
                </div>

                <div class="stat-group">
                    <div class="stat-value">{{ stats.disk.used }}</div>
                    <div class="stat-meta">
                        <i class="ri-hard-drive-2-line"></i>
                        <span>Disc Usage</span>
                    </div>
                </div>

                <div class="stat-group">
                    <div class="stat-value">{{ stats.volt }}<small>V</small></div>
                    <div class="stat-meta">
                        <i class="ri-flashlight-fill"></i>
                        <span>Voltage</span>
                    </div>
                </div>

                <div class="stat-group">
                    <div class="stat-value" :class="{ 'text-danger': stats.throttled !== '0x0' }">
                        {{ stats.throttled === '0x0' ? 'OK' : 'ERR' }}
                    </div>
                    <div class="stat-meta">
                        <i class="ri-heart-pulse-fill" :class="{ 'icon-warm': stats.throttled !== '0x0' }"></i>
                        <span>Health</span>
                    </div>
                </div>

                <div class="stat-group">
                    <div class="stat-value">{{ stats.clock }}<small>GHz</small></div>
                    <div class="stat-meta">
                        <i class="ri-speed-up-line"></i>
                        <span>Speed</span>
                    </div>
                </div>
            </header>

            <div class="main-layout">
                <!-- CENTER: Device Cards -->
                <div class="device-grid">

                    <div class="cards-container">
                        <div class="dev-card" @click="navigate('/repos')">
                            <div class="card-header">
                                <i class="ri-git-branch-line"></i>
                                <span class="counter">{{ stats.repos }}</span>
                            </div>
                            <div class="card-body">
                                <h4>Git Repos</h4>
                                <p>Manage codebases</p>
                            </div>
                        </div>

                        <div class="dev-card active" @click="navigate('/files')">
                            <div class="card-header">
                                <i class="ri-sd-card-mini-fill"></i>
                                <div class="status-dot"></div>
                            </div>
                            <div class="card-body">
                                <h4>File System</h4>
                                <p>{{ stats.disk.size }} Total</p>
                            </div>
                        </div>

                        <div class="dev-card" @click="navigate('/services')">
                            <div class="card-header">
                                <i class="ri-server-line"></i>
                                <span class="counter">{{ stats.containers }}</span>
                            </div>
                            <div class="card-body">
                                <h4>Docker</h4>
                                <p>Active Containers</p>
                            </div>
                        </div>

                        <div class="dev-card" @click="navigate('/settings')">
                            <div class="card-header">
                                <i class="ri-settings-3-line"></i>
                                <span class="counter">{{ stats.services }}</span>
                            </div>
                            <div class="card-body">
                                <h4>Services</h4>
                                <p>Running Systemd</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SIDEBAR: Quick Actions -->
                <aside class="quick-sidebar">
                    <div class="quick-header">
                        <h3>Quick Actions</h3>
                        <i class="ri-flashlight-line"></i>
                    </div>

                    <div class="quick-card action-card danger">
                        <div class="content">
                            <span class="label">Reboot System</span>
                            <span class="sub">DietPi OS</span>
                        </div>
                        <button class="btn-icon"><i class="ri-restart-line"></i></button>
                    </div>

                    <div class="quick-card info-card">
                        <div class="card-top">
                            <span>Connected to</span>
                            <i class="ri-wifi-line"></i>
                        </div>
                        <h3>{{ stats.ip }}</h3>
                        <div class="uptime-ring">
                            <svg viewBox="0 0 36 36" class="circular-chart">
                                <path class="circle-bg" d="M18 2.0845
                                  a 15.9155 15.9155 0 0 1 0 31.831
                                  a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path class="circle" stroke-dasharray="100, 100" d="M18 2.0845
                                  a 15.9155 15.9155 0 0 1 0 31.831
                                  a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <div class="uptime-text">
                                <span>UPTIME</span>
                                <small>{{ stats.uptime.split(',')[0] }}</small>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>

        <ConnectionModal v-if="showLogin" @close="showLogin = false"
            @connected="setConnected(true); startPolling(); fetchStats()" />
    </div>
</template>

<style lang="scss" scoped>
.dashboard-wrap {
    height: 100%;
    overflow-y: auto;
    padding: 2rem;
    color: #fff;
}

/* Header Stats */
.stats-header {
    display: flex;
    gap: 3rem;
    padding-bottom: 2rem;
    margin-bottom: 1rem;

    .stat-group {
        .stat-value {
            font-size: 3rem;
            font-weight: 300;
            line-height: 1;
            font-family: 'Inter', sans-serif;
            margin-bottom: 0.5rem;

            small {
                font-size: 1.5rem;
                opacity: 0.7;
            }
        }

        .stat-meta {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--text-muted);
            font-size: 0.9rem;

            i {
                font-size: 1.2rem;
            }

            .icon-warm {
                color: #ff6b6b;
            }

            .icon-cool {
                color: #4dabf7;
            }
        }

        .text-danger {
            color: #ff4444 !important;
            font-weight: bold;
        }
    }
}

/* Main Layout */
.main-layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 2rem;
    height: calc(100% - 100px);
}

/* Tabs */
.room-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    background: rgba(255, 255, 255, 0.05);
    padding: 0.25rem;
    border-radius: 50px;
    width: fit-content;

    .tab {
        background: transparent;
        border: none;
        color: var(--text-muted);
        padding: 0.5rem 1.5rem;
        border-radius: 25px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s;

        &.active {
            background: #fff;
            color: #000;
        }

        &:hover:not(.active) {
            color: #fff;
        }
    }
}

/* Device Cards */
.cards-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1.5rem;
}

.dev-card {
    background: rgba(30, 30, 35, 0.6);
    border-radius: 16px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 160px;

    &:hover {
        background: rgba(40, 40, 45, 0.8);
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    }

    &.active {
        background: rgba(var(--accent-cyan-rgb), 0.1);
        border-color: var(--accent-cyan);

        .card-header i {
            color: var(--accent-cyan);
        }
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        font-size: 1.5rem;
        color: #fff;

        .arrow {
            font-size: 1.2rem;
            opacity: 0.5;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            background: #00ff66;
            border-radius: 50%;
            box-shadow: 0 0 10px #00ff66;
        }

        .counter {
            font-size: 1.2rem;
            font-weight: 700;
            font-family: 'JetBrains Mono', monospace;
            opacity: 0.8;
            background: rgba(255, 255, 255, 0.1);
            padding: 2px 8px;
            border-radius: 4px;
        }
    }

    .card-body {
        h4 {
            margin: 0;
            font-weight: 600;
            font-size: 1.1rem;
        }

        p {
            margin: 0.25rem 0 0;
            font-size: 0.8rem;
            color: var(--text-muted);
        }
    }
}

/* Sidebar */
.quick-sidebar {
    background: transparent;
    padding-left: 2rem;
    border-left: 1px solid rgba(255, 255, 255, 0.05);

    .quick-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;

        h3 {
            margin: 0;
            font-size: 1rem;
            color: var(--text-muted);
            font-weight: 500;
        }

        i {
            opacity: 0.5;
        }
    }
}

.quick-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 1.25rem;
    margin-bottom: 1rem;

    &.action-card {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .content {
            display: flex;
            flex-direction: column;

            .label {
                font-weight: 600;
                font-size: 0.95rem;
            }

            .sub {
                font-size: 0.75rem;
                color: var(--text-muted);
            }
        }

        .btn-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            transition: 0.2s;

            &:hover {
                background: #fff;
                color: #000;
            }
        }

        &.danger:hover .btn-icon {
            background: #ff4444;
            color: #fff;
        }
    }

    &.info-card {
        .card-top {
            display: flex;
            justify-content: space-between;
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-bottom: 0.5rem;
        }

        h3 {
            margin: 0 0 1.5rem;
            font-family: 'JetBrains Mono';
            font-weight: normal;
        }

        .uptime-ring {
            position: relative;
            width: 100px;
            height: 100px;
            margin: 0 auto;

            .circular-chart {
                display: block;
                margin: 0 auto;
                max-width: 100%;
                max-height: 100%;
            }

            .circle-bg {
                fill: none;
                stroke: rgba(255, 255, 255, 0.05);
                stroke-width: 2.5;
            }

            .circle {
                fill: none;
                stroke: #00ff66;
                stroke-width: 2.5;
                stroke-linecap: round;
            }

            .uptime-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                display: flex;
                flex-direction: column;

                span {
                    font-size: 0.7rem;
                    color: var(--text-muted);
                }

                small {
                    font-weight: bold;
                    font-size: 1rem;
                }
            }
        }
    }
}

/* Empty State */
.empty-state {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    .glass-panel {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        padding: 3rem;
        border-radius: 20px;
        text-align: center;
        border: 1px solid rgba(255, 255, 255, 0.1);

        .huge-icon {
            font-size: 4rem;
            color: #ff4444;
            opacity: 0.8;
            margin-bottom: 1rem;
            display: block;
        }

        h2 {
            margin: 0;
            font-weight: 300;
            letter-spacing: 2px;
        }

        p {
            color: var(--text-muted);
            margin-bottom: 2rem;
        }

        .btn-glow {
            background: var(--accent-cyan);
            color: #000;
            border: none;
            padding: 0.8rem 2.5rem;
            border-radius: 50px;
            font-weight: bold;
            font-size: 1rem;
            cursor: pointer;
            box-shadow: 0 0 20px rgba(var(--accent-cyan-rgb), 0.3);
            transition: 0.3s;

            &:hover {
                box-shadow: 0 0 40px rgba(var(--accent-cyan-rgb), 0.5);
                transform: scale(1.05);
            }
        }
    }
}
</style>
