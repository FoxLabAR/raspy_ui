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
Esta interfaz web ("raspi_ui") permite administrar tu Raspberry Pi de manera remota, visual y segura.

---

## ✨ Características Principales

### 🖥️ Dashboard de Control
Interfaz unificada para monitorear y controlar tu dispositivo, diseñada con una estética futurista y funcional.

### 📂 Gestor de Archivos (File Manager)
Explora y gestiona el sistema de archivos de tu Raspberry Pi directamente desde el navegador.
*   **Navegación**: Explora directorios de forma fluida.
*   **Gestión**: Crea archivos y carpetas, y elimina elementos no deseados.
*   **Visualización**: Iconos intuitivos y metadatos de archivos.

### ⚙️ Gestor de Servicios (Service Manager)
Administra los servicios del sistema (`systemd`) sin tocar la terminal.
*   **Monitoreo**: Visualiza el estado (activo, inactivo, fallido) y carga de los servicios.
*   **Control**: Inicia, detiene y reinicia servicios con un clic.
*   **Logs**: Visualiza la salida de logs en tiempo real para depuración rápida.
*   **Despliegue**: Crea y despliega nuevos servicios systemd mediante un formulario guiado.

### 📦 Gestor de Repositorios (Repo Manager)
Administra repositorios Git directamente en el servidor.
*   **Visualización**: Lista repositorios Git existentes y su tamaño.
*   **Creación**: Inicializa nuevos repositorios `bare` listos para recibir código.

### 🔐 Seguridad y Conectividad
*   **Auto-SSH**: Configuración automática de claves SSH para comunicación segura.
*   **Smart Keys**: Gestión de credenciales que evita exponer contraseñas en texto plano.

---

## 🏛️ Arquitectura

El sistema utiliza una arquitectura híbrida moderna:

*   **Frontend**: Construido con **Astro** y **Vue 3** para una experiencia reactiva y rápida.
*   **Backend (BFF)**: Endpoints de API en Astro (`src/pages/api/`) que actúan como puente seguro hacia el sistema operativo.
*   **Comunicación**: Ejecución de comandos vía SSH o procesos locales en la Raspberry Pi.

---

## 🛠️ Instalación y Uso

### Requisitos
*   Node.js 18+
*   NPM / PNPM
*   Acceso a una Raspberry Pi (o entorno Linux compatible).

### Pasos

1.  **Clonar el repositorio**:
    ```bash
    git clone <url-del-repo>
    cd raspi_ui
    ```

2.  **Instalar dependencias**:
    ```bash
    npm install
    ```

3.  **Iniciar servidor de desarrollo**:
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:4321`.

4.  **Construir para producción**:
    ```bash
    npm run build
    ```

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
│   ├── components/   # Componentes Vue (FileManager, ServiceManager, RepoManager)
│   ├── layouts/      # Layouts principales de Astro
│   ├── lib/          # Utilidades compartidas (SSH, Stores)
│   ├── pages/        # Rutas y API Endpoints
│   │   └── api/      # Backend for Frontend (System Exec, FS, Git)
│   └── styles/       # Estilos globales (SCSS)
├── astro.config.mjs  # Configuración de Astro
└── package.json      # Dependencias y scripts
```

---
*Copyright (c) 2026 FoxLab. Distribuido bajo la licencia MIT.*
