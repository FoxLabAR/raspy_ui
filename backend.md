# raspy_api

Backend del asistente hogareño para Raspberry Pi Zero 2W.
**Stack**: FastAPI · DuckDB · JWT · WebSocket · UV

---

## Estructura

```
raspy_api/
├── main.py                    # Entrypoint FastAPI
├── core/
│   ├── config.py              # Configuración (pydantic-settings)
│   └── security.py            # JWT + hashing
├── db/
│   └── database.py            # DuckDB: init + conexión
├── routers/
│   ├── auth.py                # POST /auth/login
│   ├── system.py              # GET /system/snapshot, /history, WS /system/ws
│   ├── services.py            # GET/POST /services/
│   ├── logs.py                # GET /logs/system, /service/{name}, /docker/{name}
│   ├── assistant.py           # WS /assistant/ws + historial
│   └── display.py             # POST /display/state — control ST7789
├── services/
│   ├── system_service.py      # Lectura de métricas (arregla NaN/ERR)
│   ├── services_manager.py    # Control systemd + Docker
│   └── llm_client.py          # Cliente Ollama / Anthropic / OpenAI
├── data/                      # DuckDB database (auto-creado)
├── requirements.txt
├── .env.example
├── raspy-api.service          # Systemd unit
└── sudoers-raspy              # Permisos sudo sin contraseña
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | Login → JWT |
| GET | `/system/snapshot` | Métricas actuales |
| GET | `/system/history` | Historial de métricas |
| WS | `/system/ws` | Métricas en tiempo real |
| GET | `/services/` | Lista servicios + contenedores |
| POST | `/services/control` | start/stop/restart |
| GET | `/logs/system` | Logs del sistema |
| GET | `/logs/service/{name}` | Logs de un servicio |
| GET | `/logs/docker/{name}` | Logs de un contenedor |
| WS | `/assistant/ws` | Chat con LLM (streaming) |
| GET | `/assistant/history` | Historial de conversaciones |
| POST | `/display/state` | Cambia estado del ST7789 |

Swagger UI disponible en: `http://192.168.1.36:8000/docs`

---

## Instalación en DietPi

```bash
# 1. Clonar / copiar el proyecto
cd /home/dietpi
git clone https://github.com/TU_USUARIO/raspy_api
cd raspy_api

# 2. Instalar UV (si no está instalado)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 3. Sincronizar entorno y dependencias
uv sync

# 4. Configurar entorno
cp .env.example .env
nano .env   # Editar SECRET_KEY, ADMIN_PASSWORD, OLLAMA_BASE_URL

# 5. Generar SECRET_KEY segura
uv run python -c "import secrets; print(secrets.token_hex(32))"

# 6. Crear directorio de datos
mkdir -p data

# 7. Probar manualmente
uv run python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 8. Instalar como servicio
# Nota: Ajustar raspy-api.service para usar `uv run`
sudo cp raspy-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable raspy-api
sudo systemctl start raspy-api
```

## Protocolo WebSocket — Métricas

```js
const ws = new WebSocket('ws://192.168.1.36:8000/system/ws')
ws.onopen = () => ws.send(JSON.stringify({ token: 'JWT_TOKEN' }))
ws.onmessage = (e) => {
  const metrics = JSON.parse(e.data)
  // { cpu_temp, cpu_load, memory_pct, disk_pct, voltage_fmt, cpu_freq_fmt, health, ... }
}
```

## Protocolo WebSocket — Asistente

```js
const ws = new WebSocket('ws://192.168.1.36:8000/assistant/ws')
ws.onopen = () => ws.send(JSON.stringify({ token: 'JWT_TOKEN', session_id: null }))
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  // msg.type === 'ready'   → { session_id }
  // msg.type === 'token'   → { content: "fragmento de respuesta" }
  // msg.type === 'done'    → { content: "respuesta completa" }
  // msg.type === 'error'   → { content: "mensaje de error" }
}
// Enviar mensaje:
ws.send(JSON.stringify({ type: 'message', content: '¿Cuánta memoria libre hay?' }))
```

## Configuración LLM

### Opción A — Ollama en tu PC de desarrollo (recomendado)

```bash
# En tu PC:
ollama serve
ollama pull phi3:mini   # ~2GB, funciona muy bien para asistente de sistema

# En .env de la Pi:
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://192.168.1.XXX:11434
OLLAMA_MODEL=phi3:mini
```

### Opción B — API de Anthropic

```bash
# En .env:
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```