#!/bin/bash

# Script de despliegue para Secret Hitler en AWS Lightsail
# Uso: ./deploy.sh [init|update|ssl|restart|logs|stop]

set -e

# Cargar variables de entorno de forma segura
if [ -f .env.production ]; then
    set -a
    source .env.production
    set +a
fi

DOMAIN="${DOMAIN:-secrethitler.lat}"
EMAIL="${SSL_EMAIL:-admin@secrethitler.lat}"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que existe .env.production
check_env() {
    if [ ! -f .env.production ]; then
        log_error "No existe .env.production. Créalo primero."
        exit 1
    fi
    
    if grep -q "CHANGE_THIS_PASSWORD" .env.production; then
        log_error "Debes cambiar las contraseñas en .env.production"
        exit 1
    fi
}

# Inicializar el proyecto (primera vez)
init_deploy() {
    log_info "Inicializando despliegue..."
    
    check_env
    
    # Crear directorios necesarios
    mkdir -p nginx/ssl certbot/conf certbot/www
    
    # Obtener certificado SSL temporal para iniciar nginx
    log_info "Configurando SSL temporal..."
    docker-compose -f docker-compose.prod.yml up -d nginx
    
    log_info "Solicitando certificado SSL de Let's Encrypt..."
    docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        -d www.$DOMAIN
    
    # Reiniciar nginx con SSL real
    docker-compose -f docker-compose.prod.yml restart nginx
    
    log_info "Levantando todos los servicios..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
    
    log_info "✅ Despliegue inicial completado"
    log_info "Verifica el estado con: ./deploy.sh logs"
}

# Actualizar el proyecto (pull + rebuild)
update_deploy() {
    log_info "Actualizando proyecto..."
    
    check_env
    
    log_info "Deteniendo servicios..."
    docker-compose -f docker-compose.prod.yml down
    
    log_info "Reconstruyendo imágenes..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache
    
    log_info "Levantando servicios..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
    
    log_info "✅ Actualización completada"
}

# Renovar certificado SSL
renew_ssl() {
    log_info "Renovando certificado SSL..."
    docker-compose -f docker-compose.prod.yml run --rm certbot renew
    docker-compose -f docker-compose.prod.yml restart nginx
    log_info "✅ Certificado renovado"
}

# Reiniciar servicios
restart_services() {
    log_info "Reiniciando servicios..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production restart
    log_info "✅ Servicios reiniciados"
}

# Ver logs
show_logs() {
    docker-compose -f docker-compose.prod.yml logs -f --tail=100
}

# Detener servicios
stop_services() {
    log_info "Deteniendo servicios..."
    docker-compose -f docker-compose.prod.yml down
    log_info "✅ Servicios detenidos"
}

# Mostrar estado
show_status() {
    log_info "Estado de los servicios:"
    docker-compose -f docker-compose.prod.yml ps
}

# Menú principal
case "${1:-}" in
    init)
        init_deploy
        ;;
    update)
        update_deploy
        ;;
    ssl)
        renew_ssl
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs
        ;;
    stop)
        stop_services
        ;;
    status)
        show_status
        ;;
    *)
        echo "Uso: $0 {init|update|ssl|restart|logs|stop|status}"
        echo ""
        echo "Comandos:"
        echo "  init     - Inicializar despliegue (primera vez)"
        echo "  update   - Actualizar proyecto (rebuild)"
        echo "  ssl      - Renovar certificado SSL"
        echo "  restart  - Reiniciar servicios"
        echo "  logs     - Ver logs en tiempo real"
        echo "  stop     - Detener todos los servicios"
        echo "  status   - Ver estado de servicios"
        exit 1
        ;;
esac
