<<<<<<< HEAD
# Antigravity 🚀

Bienvenido al repositorio oficial del **Ecosistema Antigravity**. Este proyecto integra control de hardware IoT, inteligencia artificial y una interfaz web moderna para crear asistentes y sistemas de automatización avanzados.

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
=======
# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
>>>>>>> 8f93b77 (Initial commit from Astro)
