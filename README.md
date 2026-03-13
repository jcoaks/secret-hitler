# Secret Hitler

Una adaptación web en español de [Secret Hitler](https://secrethitler.com), un juego de mesa de deducción social para hasta 10 jugadores creado por Goat, Wolf & Cabbage.

Juega en: **[secrethitler.lat](https://secrethitler.lat)**

Código fuente: **[github.com/jcoaks/secret-hitler](https://github.com/jcoaks/secret-hitler)**

### El Juego
En el juego, los jugadores se dividen en Liberales, Fascistas y un Hitler secreto. Los Liberales deben trabajar juntos (o no) para descubrir al Hitler secreto escondido entre ellos, mientras los Fascistas intentan elevar al Hitler secreto al poder. Aprueba políticas para lograr la victoria y desbloquea poderes presidenciales para investigar a tus amigos.

¿Puedes encontrar y detener al Hitler Secreto?

### Cómo Jugar
Abre una nueva sala y usa el código de la sala o el enlace proporcionado para invitar a tus amigos. ¡Puedes jugar con hasta 10 jugadores a la vez!

Hay instrucciones sobre cómo jugar el juego proporcionadas en el sitio web, y se ofrecen muchos consejos útiles para jugadores primerizos. El juego se encarga de las reglas por ti, haciéndolo fácil de aprender y jugar.

Para más información, lee el [reglamento oficial aquí](https://www.secrethitler.com/assets/Secret_Hitler_Rules.pdf).

## Acerca de este proyecto

### Características
- ✅ Interfaz completamente en español
- ✅ Soporte para 5-10 jugadores
- ✅ Comunicación en tiempo real vía WebSocket
- ✅ Interfaz optimizada y responsiva

### Detalles Técnicos
El servidor Java está dividido en la [simulación del juego](backend/src/main/java/game) y la [API REST](backend/src/main/java/server). La comunicación entre el servidor y el cliente se realiza mediante websocket y solicitudes HTTP, utilizando la [biblioteca Javalin](https://javalin.io/).

La [página web](frontend) está escrita en [React](https://reactjs.org/), y presenta animaciones creadas con CSS. Los recursos fueron adaptados del juego de mesa original o creados usando [Inkscape](https://inkscape.org/).

## Desarrollo y Despliegue

### Desarrollo Local

Para ejecutar el proyecto localmente:

```bash
# Clonar el repositorio
git clone https://github.com/jcoaks/secret-hitler.git
cd secret-hitler

# Levantar servicios con Docker Compose
docker-compose up
```

El frontend estará disponible en `http://localhost:3000` y el backend en `http://localhost:4040`.

### Despliegue en Producción

Este proyecto está configurado para desplegarse en AWS Lightsail (o cualquier servidor con Docker).

#### Configuración Inicial

1. **Clonar el repositorio en el servidor:**
```bash
git clone https://github.com/jcoaks/secret-hitler.git
cd secret-hitler
```

2. **Configurar variables de entorno:**
```bash
# Editar .env.production con tus credenciales
nano .env.production
```

Asegúrate de cambiar:
- `POSTGRES_PASSWORD`: Password seguro para la base de datos
- `DATABASE_URL`: Actualizar con el mismo password
- `SSL_EMAIL`: Tu email para certificados SSL
- `DOMAIN`: Tu dominio

3. **Inicializar el despliegue:**
```bash
./deploy.sh init
```

#### Actualizar Cambios

Para desplegar nuevos cambios:

```bash
# En tu máquina local
git add .
git commit -m "Descripción de cambios"
git push

# En el servidor
git pull
./deploy.sh update
```

#### Comandos Disponibles

```bash
./deploy.sh init      # Inicializar despliegue (primera vez)
./deploy.sh update    # Actualizar y reconstruir servicios
./deploy.sh restart   # Reiniciar servicios sin reconstruir
./deploy.sh logs      # Ver logs en tiempo real
./deploy.sh status    # Ver estado de servicios
./deploy.sh stop      # Detener todos los servicios
```

#### Puertos Expuestos

- Frontend: `3000`
- Backend: `4040`
- PostgreSQL: `5432` (solo interno)

Para más detalles sobre el despliegue, consulta [DEPLOYMENT_AWS.md](DEPLOYMENT_AWS.md).

## Licencia y Créditos

Este proyecto está licenciado bajo [Creative Commons BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

Basado en:
- Juego de mesa original: [Secret Hitler](https://secrethitler.com) por Goat, Wolf & Cabbage (© 2016-2020)
- Implementación web: [Secret Hitler Online](https://github.com/ShrimpCryptid/Secret-Hitler-Online) por ShrimpCryptid (© 2020-2023)

Este proyecto no está afiliado ni respaldado por Goat, Wolf & Cabbage.