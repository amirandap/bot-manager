#!/bin/bash

# Script para compilar y reiniciar servicios del bot-manager
# Este script debe ejecutarse desde la raíz del proyecto

echo "🚀 Iniciando compilación y reinicio de servicios bot-manager..."

# Comprobar si estamos en la carpeta raíz del proyecto
if [ ! -d "./bot" ] || [ ! -d "./frontend" ] || [ ! -d "./backend" ]; then
  echo "❌ Error: Este script debe ejecutarse desde la carpeta raíz del proyecto bot-manager"
  exit 1
fi

# Compilar el bot
echo "📦 Compilando el bot..."
cd ./bot
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Error compilando el bot"
  exit 1
fi
echo "✅ Bot compilado correctamente"

# Compilar el frontend
echo "📦 Compilando el frontend..."
cd ../frontend
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Error compilando el frontend"
  exit 1
fi
echo "✅ Frontend compilado correctamente"

# Compilar el backend
echo "📦 Compilando el backend..."
cd ../backend
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Error compilando el backend"
  exit 1
fi
echo "✅ Backend compilado correctamente"

# Reiniciar servicios con PM2 si está disponible
echo "🔄 Intentando reiniciar servicios con PM2..."
if command -v pm2 &> /dev/null; then
    echo "📊 PM2 está instalado, reiniciando servicios..."
    pm2 reload bot-manager-backend
    pm2 reload bot-manager-frontend
    pm2 list
    echo "✅ Servicios reiniciados correctamente con PM2"
else
    echo "⚠️ PM2 no está instalado o no está en el PATH"
    echo "⚠️ Para reiniciar los servicios manualmente:"
    echo "   1. Asegúrate de que PM2 está instalado (npm install -g pm2)"
    echo "   2. Ejecuta 'pm2 reload bot-manager-backend'"
    echo "   3. Ejecuta 'pm2 reload bot-manager-frontend'"
    echo "   4. Si tienes bots corriendo en PM2, también deberás reiniciarlos"
fi

echo "🎉 Proceso completado!"
