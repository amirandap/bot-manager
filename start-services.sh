#!/bin/bash

# Bot Manager - Startup Script
# Este script inicia los servicios del bot manager

# Configurar entorno
export PATH=$PATH:/home/linuxuser/.nvm/versions/node/v22.18.0/bin
export PM2_HOME=/home/linuxuser/.pm2

# Navegar al directorio del proyecto
cd /home/linuxuser/bot-manager

# Asegurar que PM2 esté corriendo
pm2 ping

# Iniciar backend
cd backend && pm2 start ecosystem.config.js

# Iniciar frontend
cd ../frontend && pm2 start ecosystem.config.cjs

# Guardar configuración actual
pm2 save

echo "Bot Manager services started successfully"
