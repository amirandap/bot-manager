#!/bin/bash

# 🚀 Script de Migración - Sistema Unificado de Logging
# Automatiza la detección y migración de funciones legacy

echo "🔍 ANÁLISIS DEL CÓDIGO ACTUAL"
echo "=============================="
echo ""

# Función para contar ocurrencias
count_occurrences() {
    local pattern="$1"
    local description="$2"
    local count=$(grep -r "$pattern" src/ --include="*.ts" 2>/dev/null | wc -l)
    echo "📊 $description: $count"
}

# Análisis de funciones legacy
echo "🔍 FUNCIONES LEGACY ENCONTRADAS:"
count_occurrences "logPM2Event" "logPM2Event calls"
count_occurrences "botLogger\." "botLogger calls"
count_occurrences "alertPM2Failure" "alertPM2Failure calls"
count_occurrences "updatePM2Metrics" "updatePM2Metrics calls"
count_occurrences "updatePM2System" "updatePM2System calls"
count_occurrences "logWhatsAppOperation" "logWhatsAppOperation calls"

echo ""
echo "🔍 IMPORTS LEGACY:"
count_occurrences "from.*pm2Utils" "pm2Utils imports"
count_occurrences "from.*loggerWrapper" "loggerWrapper imports"

echo ""
echo "📁 ARCHIVOS MÁS CRÍTICOS PARA MIGRAR:"
echo "======================================"

# Analizar archivos individuales
analyze_file() {
    local file="$1"
    if [ -f "$file" ]; then
        local legacy_calls=$(grep -E "logPM2Event|botLogger\.|alertPM2Failure|updatePM2Metrics" "$file" 2>/dev/null | wc -l)
        if [ "$legacy_calls" -gt 0 ]; then
            echo "🔥 $file: $legacy_calls llamadas legacy"
        fi
    fi
}

# Archivos críticos
analyze_file "src/index.ts"
analyze_file "src/utils/whatsAppUtils.ts"
analyze_file "src/utils/shutdownUtils.ts"
analyze_file "src/utils/startupUtils.ts"
analyze_file "src/utils/apiUtils.ts"
analyze_file "src/utils/browserUtils.ts"

echo ""
echo "🛠️ COMANDOS DE MIGRACIÓN SUGERIDOS:"
echo "===================================="
echo ""

echo "1. 📦 Instalar dependencias:"
echo "   npm install @pm2/io tx2 --save"
echo "   npm install @types/tx2 --save-dev"
echo ""

echo "2. 🔧 Verificar que unifiedLogger.ts existe:"
echo "   ls -la src/utils/unifiedLogger.ts"
echo ""

echo "3. 🔄 Migrar archivo por archivo (empezar con index.ts):"
echo "   # Reemplazar imports:"
echo "   sed -i '' 's/from \"\.\/utils\/pm2Utils_unified\"/from \"\.\/utils\/unifiedLogger\"/g' src/index.ts"
echo "   sed -i '' 's/logPM2Event, alertPM2Failure/logEvent, reportFailure, markComponentReady/g' src/index.ts"
echo ""

echo "4. 🧹 Buscar y reemplazar patrones comunes:"
echo "   # logPM2Event → logEvent"
echo "   find src/ -name '*.ts' -exec sed -i '' 's/logPM2Event(/logEvent(/g' {} +"
echo "   # alertPM2Failure → reportFailure"
echo "   find src/ -name '*.ts' -exec sed -i '' 's/alertPM2Failure(/reportFailure(/g' {} +"
echo ""

echo "5. ✅ Verificar migración:"
echo "   # Ejecutar este script de nuevo para ver progress"
echo "   ./scripts/migration-check.sh"
echo ""

echo "🎯 PRIORIDAD DE MIGRACIÓN:"
echo "=========================="
echo "1. 🔥 src/index.ts (archivo principal)"
echo "2. 🔥 src/utils/whatsAppUtils.ts (más llamadas)"
echo "3. 🔥 src/utils/shutdownUtils.ts (crítico)"
echo "4. ⚠️  src/utils/startupUtils.ts"
echo "5. ⚠️  src/utils/apiUtils.ts"
echo "6. 📝 otros archivos en src/routes/, src/services/"
echo ""

echo "🚨 RECORDATORIOS IMPORTANTES:"
echo "============================"
echo "✅ Cambiar imports a unifiedLogger"
echo "✅ logPM2Event → logEvent"
echo "✅ alertPM2Failure → reportFailure"
echo "✅ botLogger.success → logEvent con 'success'"
echo "✅ Agregar metadata en objeto separado"
echo "✅ Usar markComponentReady para estados ready"
echo "✅ Probar cada archivo después de migrar"
echo ""

echo "📋 PLANTILLA DE MIGRACIÓN:"
echo "=========================="
echo ""
echo "// ❌ ANTES:"
echo "import { logPM2Event, alertPM2Failure } from './utils/pm2Utils_unified';"
echo "import { botLogger } from './utils/loggerWrapper';"
echo ""
echo "logPM2Event('startup', 'info', 'mensaje');"
echo "botLogger.success('Operación exitosa');"
echo "alertPM2Failure(error, 'context', false);"
echo ""
echo "// ✅ DESPUÉS:"
echo "import { logEvent, reportFailure, markComponentReady } from './utils/unifiedLogger';"
echo ""
echo "logEvent('startup', 'info', 'mensaje');"
echo "logEvent('startup', 'success', 'Operación exitosa');"
echo "reportFailure(error, 'startup', false);"
echo ""

# Verificar si unifiedLogger.ts existe
if [ ! -f "src/utils/unifiedLogger.ts" ]; then
    echo "⚠️  WARNING: src/utils/unifiedLogger.ts NO EXISTE"
    echo "   Necesitas crear este archivo primero con la implementación del wrapper"
    echo ""
fi

# Verificar si las dependencias están instaladas
if ! npm list @pm2/io >/dev/null 2>&1; then
    echo "⚠️  WARNING: @pm2/io NO está instalado"
    echo "   Ejecutar: npm install @pm2/io tx2 --save"
    echo ""
fi

echo "🎉 ¡Listo para migrar! Empezar con src/index.ts"
