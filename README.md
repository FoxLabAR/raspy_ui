# Antigravity 🚀

Bienvenido al repositorio oficial del **Ecosistema Antigravity**. Este proyecto integra control de hardware IoT, inteligencia artificial y una interfaz web moderna para crear asistentes y sistemas de automatización avanzados.

---

## 🏛️ Arquitectura y Flujo de Datos

El sistema se basa en una arquitectura híbrida optimizada para baja latencia y alta disponibilidad.

### 1. Núcleo de Procesamiento (Python) 🐍
*   **Rol**: Cerebro lógico y procesamiento de datos pesados (IA, análisis).
*   **Ubicación**: Raspberry Pi ("Cerebro de Campo").
*   **Regla**: Toda la lógica compleja y el manejo de librerías de IA ocurren aquí.

### 2. Interfaz de Control (Astro + Vue) 🌐
*   **Rol**: Dashboard de usuario y monitoreo en tiempo real.
*   **Tecnologías**: 
    *   **Astro**: Renderizado rápido y estructura estática.
    *   **Vue**: Componentes reactivos para telemetría en vivo.
*   **Ubicación**: Servidor Web (o SSR en la Pi).

### 3. Persistencia Híbrida 💾
*   **MongoDB**: Almacenamiento de logs, telemetría histórica y configuraciones complejas de agentes.
*   **Firebase**:
    *   **Auth**: Autenticación de usuarios.
    *   **Realtime Database/Firestore**: Sincronización instantánea de estados críticos entre Hardware <-> Web.

---

## 📡 Protocolos de Hardware e IoT

### Cerebro de Campo (Raspberry Pi)
Actúa como el nodo central en el mundo físico.
*   **Funciones**:
    *   Ejecución de scripts Python.
    *   Orquestación de la comunicación con la nube.
*   **Restricción**: Uso de CPU limitado al **70%** para garantizar estabilidad del OS.

### Controladores Periféricos (Arduino)
Encargados del "trabajo sucio" de bajo nivel.
*   **Funciones**: Lectura de sensores y control de actuadores.
*   **Comunicación**: Serial (USB) o I2C hacia la Raspberry Pi.
*   **Regla de Oro**: ⚡ **Latencia < 10ms**. Ningún proceso de telemetría debe bloquear el hilo principal.

---

## 🛠️ Configuración y Reglas de Desarrollo

### 1. Estrategias de Agentes
*   **Desacoplamiento**: Los agentes son agnósticos a la DB. Usan una capa de abstracción para decidir dónde escribir (Mongo vs Firebase).
*   **Seguridad**: 
    *   Credenciales en `.env` (NUNCA en código).
    *   `firebase-adminsdk` para procesos de servidor.

### 2. Estándares de Integración
*   **API-First**: Toda funcionalidad de hardware debe ser una API antes de tener UI.
*   **Sincronización**: Cambios de estado (Hardware -> UI) en **< 200ms**.

### 3. Entorno de Desarrollo (Web)
Este repositorio contiene la interfaz servida con **Astro**.

**Requisitos**:
*   Node.js 18+
*   NPM / PNPM

**Comandos**:
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build
```

---

## 🔐 Características de Seguridad Implementadas

### Auto-SSH & Smart Keys
El sistema incluye una utilidad para gestionar claves SSH automáticamente para conectar la interfaz web con la Raspberry Pi sin contraseñas en texto plano.
*   **Generación de Claves**: `ssh-keygen` automático.
*   **Instalación Remota**: Script de autoconfiguración en la Pi.
*   **API Endpoint**: `/api/security/ssh_setup`

---

## 📂 Estructura del Proyecto

```
/
├── src/
│   ├── components/   # Componentes Vue (Control UI)
│   ├── layouts/      # Layouts Astro
│   ├── lib/          # Lógica compartida (API Wrappers, Stores)
│   ├── pages/        # Rutas y API Endpoints
│   │   └── api/      # Backend for Frontend (BFF)
│   └── styles/       # Estilos globales (SCSS)
├── astro.config.mjs  # Configuración de Astro (Vue, Node adapter)
└── package.json      # Dependencias
```

---
*Documentación generada automáticamente por Antigravity AI Agent.*
