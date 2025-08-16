#!/bin/bash

# =================================================================
# WhatsApp Bot API - Ejemplos de Testing con cURL
# =================================================================

echo "🚀 Iniciando pruebas de la API del WhatsApp Bot"
echo "=================================================="

# Configuración
BASE_URL="http://localhost:3000"
TEST_PHONE="1234567890"
TEST_GROUP="123456789-987654321@g.us"

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}📋 ENDPOINTS DISPONIBLES:${NC}"
echo "- GET  /health           - Health check"
echo "- GET  /status           - Estado del bot"
echo "- GET  /get-groups       - Lista de grupos"
echo "- POST /send-to-phone    - Mensaje a teléfono"
echo "- POST /send-to-group    - Mensaje a grupo"
echo "- POST /send-broadcast   - Mensaje masivo"
echo "- POST /send-message     - Mensaje simple"
echo "- POST /send-image       - Enviar imagen"
echo "- POST /send-document    - Enviar documento"
echo "- POST /send-audio       - Enviar audio"
echo "- POST /send-video       - Enviar video"
echo ""

# =================================================================
# FUNCIÓN DE TESTING
# =================================================================
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="$3"
    local data="$4"
    local content_type="$5"
    
    echo -e "${YELLOW}🧪 Probando: $name${NC}"
    echo "   URL: $method $url"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url")
    else
        if [ -n "$content_type" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: $content_type" -d "$data" "$url")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" -d "$data" "$url")
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 207 ]; then
        echo -e "   ${GREEN}✅ Success ($http_code)${NC}"
        echo "   Response: $(echo "$body" | jq -c . 2>/dev/null || echo "$body")"
    else
        echo -e "   ${RED}❌ Failed ($http_code)${NC}"
        echo "   Error: $(echo "$body" | jq -r '.error // .' 2>/dev/null || echo "$body")"
    fi
    echo ""
}

# =================================================================
# TESTS DE ESTADO
# =================================================================
echo -e "${BLUE}🔍 PROBANDO ENDPOINTS DE ESTADO${NC}"
echo "=================================================="

test_endpoint "Health Check" "$BASE_URL/health" "GET"
test_endpoint "Bot Status" "$BASE_URL/status" "GET"
test_endpoint "Lista de Grupos" "$BASE_URL/get-groups" "GET"

# =================================================================
# TESTS DE MENSAJES
# =================================================================
echo -e "${BLUE}📱 PROBANDO ENDPOINTS DE MENSAJES${NC}"
echo "=================================================="

# Mensaje a teléfono
test_endpoint "Mensaje a Teléfono" "$BASE_URL/send-to-phone" "POST" \
    '{"phoneNumber":"'$TEST_PHONE'","message":"🧪 Test desde cURL - Teléfono"}' \
    "application/json"

# Mensaje a grupo (necesita un grupo real)
test_endpoint "Mensaje a Grupo" "$BASE_URL/send-to-group" "POST" \
    '{"groupId":"'$TEST_GROUP'","message":"🧪 Test desde cURL - Grupo"}' \
    "application/json"

# Mensaje broadcast
test_endpoint "Mensaje Broadcast" "$BASE_URL/send-broadcast" "POST" \
    '{"to":["'$TEST_PHONE'","'$TEST_GROUP'"],"message":"🧪 Test desde cURL - Broadcast"}' \
    "application/json"

# Mensaje simple
test_endpoint "Mensaje Simple" "$BASE_URL/send-message" "POST" \
    '{"to":"'$TEST_PHONE'","message":"🧪 Test desde cURL - Simple"}' \
    "application/json"

# =================================================================
# TESTS DE MULTIMEDIA (SIMULADOS)
# =================================================================
echo -e "${BLUE}🎬 PROBANDO ENDPOINTS DE MULTIMEDIA${NC}"
echo "=================================================="
echo -e "${YELLOW}ℹ️  Nota: Tests de multimedia requieren archivos reales${NC}"
echo -e "${YELLOW}   Usa los siguientes comandos con archivos locales:${NC}"
echo ""

echo -e "${GREEN}📸 Envío de Imagen:${NC}"
echo "curl -X POST $BASE_URL/send-image \\"
echo "  -F \"to=$TEST_PHONE\" \\"
echo "  -F \"file=@imagen.jpg\" \\"
echo "  -F \"caption=Test desde cURL\""
echo ""

echo -e "${GREEN}📹 Envío de Video:${NC}"
echo "curl -X POST $BASE_URL/send-video \\"
echo "  -F \"to=$TEST_PHONE\" \\"
echo "  -F \"file=@video.mp4\" \\"
echo "  -F \"caption=Video test\""
echo ""

echo -e "${GREEN}🎵 Envío de Audio:${NC}"
echo "curl -X POST $BASE_URL/send-audio \\"
echo "  -F \"to=$TEST_PHONE\" \\"
echo "  -F \"file=@audio.mp3\" \\"
echo "  -F \"message=Audio test\""
echo ""

echo -e "${GREEN}📄 Envío de Documento:${NC}"
echo "curl -X POST $BASE_URL/send-document \\"
echo "  -F \"to=$TEST_PHONE\" \\"
echo "  -F \"file=@documento.pdf\" \\"
echo "  -F \"message=Documento test\""
echo ""

# =================================================================
# DOCUMENTACIÓN
# =================================================================
echo -e "${BLUE}📚 ACCESO A DOCUMENTACIÓN${NC}"
echo "=================================================="
echo -e "${GREEN}🌐 Swagger UI:${NC} $BASE_URL/api-docs"
echo -e "${GREEN}📖 Docs Redirect:${NC} $BASE_URL/docs"
echo -e "${GREEN}📋 JSON Schema:${NC} $BASE_URL/swagger.json"
echo ""

# =================================================================
# INFORMACIÓN ADICIONAL
# =================================================================
echo -e "${BLUE}💡 INFORMACIÓN ADICIONAL${NC}"
echo "=================================================="
echo -e "${YELLOW}⚠️  Consideraciones Importantes:${NC}"
echo "• El bot debe estar conectado a WhatsApp"
echo "• Los números de teléfono deben existir"
echo "• Para grupos, el bot debe ser miembro"
echo "• Los archivos multimedia tienen límites de tamaño"
echo ""
echo -e "${GREEN}📱 Formatos de Números:${NC}"
echo "• Nacional: 1234567890"
echo "• Internacional: +521234567890"
echo "• El sistema formatea automáticamente"
echo ""
echo -e "${GREEN}👥 Formato de Grupos:${NC}"
echo "• Usar GET /get-groups para obtener IDs"
echo "• Formato: 123456789-987654321@g.us"
echo ""
echo -e "${GREEN}🔄 Códigos de Respuesta:${NC}"
echo "• 200: Éxito completo"
echo "• 207: Éxito parcial (algunos errores)"
echo "• 400: Datos inválidos"
echo "• 503: Bot no disponible"
echo "• 500: Error del servidor"
echo ""

echo -e "${GREEN}✅ Tests completados!${NC}"
echo "=================================================="
