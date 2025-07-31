# 🔧 Bot Manager Scripts

Esta carpeta contiene todos los scripts organizados por categoría para facilitar el mantenimiento y operación del proyecto.

## 📁 Estructura de Scripts

### 🛠️ Maintenance (`maintenance/`)
Scripts para mantenimiento y limpieza del proyecto:

- **cleanup.sh** - Script de limpieza general
  ```bash
  # Limpieza básica
  npm run cleanup
  
  # Limpieza profunda (incluye node_modules)
  npm run cleanup:deep
  
  # Solo build artifacts
  npm run cleanup:build
  ```

- **organize-files.sh** - Organización de archivos
  ```bash
  # Organización completa
  npm run organize
  
  # Solo mostrar estructura actual
  ./scripts/maintenance/organize-files.sh --show
  ```

### 🚀 Deployment (`deployment/`)
Scripts relacionados con despliegue:

- **deploy.sh** - Script principal de despliegue
- **setup-ssl.sh** - Configuración de SSL

### 🧪 Testing (`testing/`)
Scripts de testing y verificación:

- **test-attachments.sh** - Testing de attachments multimedia
  ```bash
  npm run test:attachments
  ```

- **verify-refactoring.sh** - Verificación del refactoring
  ```bash
  npm run test:verify
  ```

- **test-cicd.sh** - Testing de CI/CD
- **test-default-bot-host.js** - Testing de configuración de host
- **test-pm2-api.ts** - Testing de PM2 API
- **test-spawning.sh** - Testing de spawning de bots

## 🚀 Comandos Rápidos

### Mantenimiento Diario
```bash
# Limpieza básica
npm run cleanup

# Verificar que todo funciona después de cambios
npm run test:verify
npm run test:attachments
```

### Antes de Deployment
```bash
# Limpieza profunda
npm run cleanup:deep

# Reinstalar dependencias
npm run install:all

# Build completo
npm run build

# Testing
npm run test:verify
```

### Organización de Proyecto
```bash
# Ver estructura actual
./scripts/maintenance/organize-files.sh --show

# Reorganizar archivos sueltos
npm run organize
```

## ⚡ Scripts NPM Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run cleanup` | Limpieza básica |
| `npm run cleanup:deep` | Limpieza profunda |
| `npm run cleanup:build` | Limpiar solo builds |
| `npm run organize` | Organizar archivos |
| `npm run test:attachments` | Test attachments |
| `npm run test:verify` | Verificar refactoring |

## 🔧 Personalización

Para añadir nuevos scripts:

1. **Maintenance**: Colocar en `maintenance/` para scripts de limpieza y organización
2. **Testing**: Colocar en `testing/` para scripts de pruebas
3. **Deployment**: Colocar en `deployment/` para scripts de despliegue
4. **Permisos**: No olvides `chmod +x script.sh`
5. **NPM**: Añadir al `package.json` si es de uso frecuente
