# Secret Hitler

Una adaptación web en español de [Secret Hitler](https://secrethitler.com), un juego de mesa de deducción social para hasta 10 jugadores creado por Goat, Wolf & Cabbage.

Este proyecto es un fork de [Secret Hitler Online](https://github.com/ShrimpCryptid/Secret-Hitler-Online) traducido completamente al español.

### El Juego
En el juego, los jugadores se dividen en Liberales, Fascistas y un Hitler secreto. Los Liberales deben trabajar juntos (o no) para descubrir al Hitler secreto escondido entre ellos, mientras los Fascistas intentan elevar al Hitler secreto al poder. Aprueba políticas para lograr la victoria y desbloquea poderes presidenciales para investigar a tus amigos.

¿Puedes encontrar y detener al Hitler Secreto?

### Cómo Jugar
Abre una nueva sala y usa el código de la sala o el enlace proporcionado para invitar a tus amigos. ¡Puedes jugar con hasta 10 jugadores a la vez!

Hay instrucciones sobre cómo jugar el juego proporcionadas en el sitio web, y se ofrecen muchos consejos útiles para jugadores primerizos. El juego se encarga de las reglas por ti, haciéndolo fácil de aprender y jugar.

Para más información, lee el [reglamento oficial aquí](https://www.secrethitler.com/assets/Secret_Hitler_Rules.pdf).

## Acerca de este proyecto

### Cambios en esta versión
- ✅ Interfaz completamente traducida al español
- ✅ Interfaz simplificada y optimizada

### Detalles Técnicos
El servidor Java está dividido en la [simulación del juego](backend/src/main/java/game) y la [API REST](backend/src/main/java/server). La comunicación entre el servidor y el cliente se realiza mediante websocket y solicitudes HTTP, utilizando la [biblioteca Javalin](https://javalin.io/).

La [página web](frontend) está escrita en [React](https://reactjs.org/), y presenta animaciones creadas con CSS. Los recursos fueron adaptados del juego de mesa original o creados usando [Inkscape](https://inkscape.org/).

### Licencia Creative Commons y Créditos
Este proyecto está licenciado bajo [Creative Commons BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), y está adaptado del juego de mesa original lanzado por Goat, Wolf & Cabbage (© 2016-2020).

Secret Hitler Online fue desarrollado originalmente por [ShrimpCryptid](https://github.com/ShrimpCryptid/Secret-Hitler-Online) (© 2020-2023).

*(Este proyecto no está afiliado ni respaldado por Goat, Wolf & Cabbage.)*

#### Cambios respecto al original
- Los gráficos para los tableros, mazo de políticas, tarjetas de identidad, tarjetas de partido e íconos liberal/fascista fueron adaptados para el sitio web con algunas modificaciones menores (redondeo de esquinas, agregado de profundidad, sombras).
- Se agregaron recursos personalizados (hechos en Inkscape) basados en el estilo del original, especialmente para el rastreador de elecciones, ventanas emergentes de revelación de políticas y los íconos y fichas de jugadores.
- Donde fue posible, las fuentes fueron reemplazadas por otras licenciadas bajo la [Open Font License](https://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=OFL), específicamente [Germania One](https://fonts.google.com/specimen/Germania+One) y [Montserrat](https://fonts.google.com/specimen/Montserrat).
- La interfaz web, animaciones y servidor son adiciones nuevas que usan las mismas reglas del juego original.

