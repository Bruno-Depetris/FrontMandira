# FrontMandira — Tienda

Tienda pública de Mandira en HTML + CSS + JavaScript puro, sin build ni dependencias.
Consume MandiraApiREST directamente desde el navegador.

## Puesta en marcha

Los archivos usan módulos ES, así que hay que servirlos por HTTP (abrir el `index.html`
con doble clic **no** funciona). Desde la raíz del workspace (`Mandira/`):

```bash
python3 -m http.server 8000
# tienda: http://localhost:8000/FrontMandira/
```

## Configuración obligatoria

Todo se define en `config.js`:

| Clave | Qué es |
| --- | --- |
| `apiUrl` | URL de MandiraApiREST. Se puede pisar en dev con `localStorage.setItem("mandira.tienda.apiUrl", "http://localhost:5133")`. |
| `googleClientId` | Client ID de Google. Si queda vacío se oculta el botón de Google y queda solo el ingreso con correo y contraseña. |
| `whatsapp` | Número que recibe los pedidos. Hoy: `543564567771`. |

### Cómo sacar el Client ID de Google

1. Entrá a <https://console.cloud.google.com/> y creá un proyecto (o usá uno existente).
2. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo *Externo*, completá
   nombre de la app y correo de soporte. Alcanza con los scopes por defecto
   (`email`, `profile`, `openid`).
3. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**,
   tipo **Aplicación web**.
4. En **Orígenes autorizados de JavaScript** agregá cada origen desde donde se vaya a
   abrir la tienda, por ejemplo:
   - `http://localhost:8000` (desarrollo)
   - `https://tudominio.com` (producción)
   > Google solo acepta `https://` o `http://localhost`. Una IP de LAN como
   > `http://192.168.0.10:8000` **no sirve**.
5. Copiá el *Client ID* (termina en `.apps.googleusercontent.com`) y pegalo en tres lugares:
   - `FrontMandira/config.js` → `googleClientId`
   - `WebMandira/config.js` → `googleClientId`
   - la API → variable de entorno `Google__ClientId`

### Variables de entorno de la API

En Railway (o donde esté la API):

```
Google__ClientId=XXXXXXXX.apps.googleusercontent.com
Google__AdminEmails=tucorreo@gmail.com,otroadmin@gmail.com
Jwt__Clave=<una frase larga y secreta>
```

`Google__AdminEmails` define quién puede administrar el catálogo. Un usuario logueado que
no esté en esa lista puede comprar, pero no tocar productos, stock ni precios.
El panel **solo** acepta tokens de Google: una cuenta de correo y contraseña nunca llega a
administrador, aunque se registre con el correo del admin.

`Jwt__Clave` es el secreto con el que la API firma los tokens de quienes entran con correo y
contraseña. Puede ser cualquier texto largo. Si queda sin configurar la API arranca igual,
pero usa una clave distinta en cada reinicio y las sesiones se cortan en cada deploy.

### La columna de la contraseña

Las contraseñas se guardan hasheadas (PBKDF2-SHA256) en `usuariosweb.contrasena`, y el valor
ocupa 44 caracteres. Si la columna es más corta que eso, el registro falla con un error 500
al escribir. Para asegurarse:

```sql
ALTER TABLE usuariosweb ALTER COLUMN contrasena TYPE varchar(100);
```

## Ingreso de clientes

Hay dos caminos y los dos terminan en la misma fila de `usuariosweb` y en un token Bearer
que la API acepta igual:

- **Google**: el navegador obtiene un `id_token` con Google Identity Services. La primera vez,
  `GET /api/Perfil` crea el `UsuarioWeb` con el correo verificado del token.
- **Correo y contraseña**: `POST /api/Auth/registro` y `POST /api/Auth/login` devuelven un
  token firmado por la API (30 días). El registro pide los campos de la tabla: nombre, correo,
  contraseña, teléfono y dirección (los dos últimos son opcionales).

Quien entró con Google puede ponerle una contraseña a su cuenta desde **Mi cuenta → Contraseña**
(`PUT /api/Perfil/contrasena`) y después entrar por cualquiera de las dos vías. Al revés no:
registrarse con un correo que ya existe se rechaza, porque el correo del registro no está
verificado y permitirlo sería regalarle la cuenta a cualquiera que lo adivine.

## La portada

El titulo del inicio, su bajada, la etiqueta de la tarjeta del hero y qué producto va adentro
**salen del panel** (`#portada`), no de `config.js`. Lo que quedó en `config.js` es el respaldo
para cuando la API no contesta: un título es demasiado importante para que dependa de que la red
responda, así que la portada nunca se muestra vacía.

El título se escribe con efecto de **máquina de escribir** (`js/tipeo.js`). Si el panel cargó
varias frases, rotan: se escribe una, se queda un momento, se borra y sigue la siguiente. Con una
sola, se escribe y se queda quieta — no tendría sentido borrar algo que no se reemplaza por nada
distinto.

Dos cuidados que no son decorativos:

- El `<h1>` **reserva de entrada el alto de la frase más larga**. Sin eso la página entera salta
  en cada ciclo, porque un título de dos renglones pasa a uno mientras se borra.
- El texto completo queda en el DOM para los lectores de pantalla, en un elemento visualmente
  oculto, y lo que se anima lleva `aria-hidden`: leer letra por letra no es leer. El cursor es un
  borde que parpadea, no un carácter `|`, porque un carácter se copiaría al seleccionar el título.

Con `prefers-reduced-motion` se muestra la primera frase y no hay animación ni cursor.

El producto destacado es el que eligió el panel. Si no eligieron ninguno, o si el elegido dejó de
estar publicado, cae en el primero que tenga foto, y si ninguno la tiene, el primero igual: la
tarjeta nunca queda vacía.

## Anuncios y leyendas

Dos cosas que se configuran desde el panel y no tocan el código:

**La cinta de anuncios** es la barra de arriba de todo (`js/anuncios.js`). Los mensajes viven
en `/api/Anuncios`, que es público porque la página los muestra sin login. Solo salen los que
están **activos**, en el **orden** que les pongas, y si hay varios rotan cada cinco segundos.
Cada uno puede llevar un enlace opcional. Si no hay ninguno activo la cinta no existe, y si
la API no responde tampoco aparece: un anuncio no vale romper la tienda.

**La leyenda del producto** es una etiqueta corta (`productos.leyenda`, hasta 40 caracteres)
que sale sobre la foto en la grilla y junto al rubro en la ficha: "Oferta", "Nuevo", "2x1".
Se carga en el editor del producto. Vacía significa que ese producto no lleva ninguna.

## Diseño

La tienda implementa el sistema de `DESIGN-cal.md` (el análisis de Cal.com). Todo vive en
`css/estilos.css`, con los tokens del documento como variables CSS en `:root`: canvas blanco,
CTA casi negro (`--primary` #111111), display con tracking negativo, tarjetas de radio 12px,
ritmo vertical de 96px entre bandas y **un solo fondo oscuro**, el pie, que cierra la página.

Lo que decidí al aplicarlo, con el porqué:

| Decisión | Motivo |
| --- | --- |
| **Manrope 700** para los títulos | Cal Sans es propietaria de Cal.com; el documento autoriza Manrope 700 como sustituto. Inter para interfaz y cuerpo. |
| El **isologo va en un chip oscuro** | Los tres archivos de `Assets/` son arte rosa pálido sobre carbón **sólido, sin transparencia**: sobre canvas blanco serían recuadros oscuros. En vez de alterar la marca, el isologo se usa dentro de su propio cuadrado oscuro (cabecera, muro de login) y el pie, que ya es oscuro por sistema, lo muestra nativo. |
| Tarjetas de producto **blancas con filete**, no grises | El documento reserva la tarjeta gris para afirmaciones abstractas y la blanca para mostrar el producto real. Un producto con foto es lo segundo. |
| El hero muestra **un producto de verdad** | El sistema pide mostrar el producto en lugar de ilustrarlo. El artefacto del hero trae la primera ficha con foto; si no hay ninguna, la primera igual. |
| `--warning-texto` y `--error-texto` | Los semánticos del documento no llegan a 4.5:1 como texto sobre blanco (warning queda en 2.15:1 y error en 3.76:1). Sirven para bordes e iconos; cuando el color es texto se usan estas variantes, de 7.09:1 y 6.47:1. |
| `--brand-accent` y `--badge-orange` quedan declarados sin uso | El sistema es casi monocromo en la capa de acción y prohíbe el acento en los CTAs. Quedan documentados para quien quiera extenderlo. |

### Profundidad: la desviación grande

`DESIGN-cal.md` pide superficies **planas**, sin degradados decorativos y con sombras apenas
insinuadas. El sistema de profundidad que hay hoy lo **contradice de frente**, y se agregó a
pedido explícito del dueño ("moderno, minimalista, estilo 3D"). Dejo acá cómo está construido
para que se pueda revertir o ajustar sin leer todo el CSS.

Cada superficie elevada son **tres cosas a la vez**, y hacen falta las tres: si falta una, se ve
plano con una mancha abajo.

1. **El relleno** (`--relleno-superficie`): un degradado vertical de apenas 2% entre arriba y
   abajo. Es la cara que recibe la luz. Más que eso se lee como degradado decorativo.
2. **El canto** (`--canto`): un filete claro arriba, como `inset` y no como `border`, para no
   sumar al tamaño de la caja ni pelearse con el radio. Es la luz pegándole al borde.
3. **La sombra** (`--sombra-1` a `--sombra-4`): en dos partes, un contacto corto y oscuro —el
   punto donde el objeto toca— y una difusa y larga. Una sombra sola se lee como una mancha
   pegada al objeto.

**La luz viene siempre de arriba.** Si una sombra sale hacia otro lado, el ojo lee dos fuentes
de luz y la escena deja de ser creíble.

| Decisión | Motivo |
| --- | --- |
| Los **campos van hundidos**, no elevados | Un botón sobresale porque se aprieta; un campo es un hueco donde se mete algo. La sombra interior lo dice sin una palabra. |
| El **artefacto del hero es el único en `--sombra-4`** | En un sistema de profundidad el nivel máximo tiene que ser uno solo. Si varias cosas flotan a la misma altura, ninguna flota. |
| Adentro del hero la tarjeta **no se vuelve a elevar** | Ya está apoyada sobre algo que flota. Apilar elevaciones aplana las dos. |
| `--relleno-hundido` arranca en `#f9fafb`, no en un gris más marcado | Medido, no estético: sobre `#f3f4f6` el token `--muted` cae a **4.39:1** y deja de cumplir AA. En `#f9fafb` da 4.63:1. Lo que hace leer el hueco es la sombra interior, no lo oscuro del relleno. |
| En **oscuro** la profundidad la carga el canto | Sobre `#121212` no hay contraste contra el que proyectar una sombra. Las sombras quedan solo para despegar el objeto del fondo. |
| La **inclinación es de 3 grados** y no más | Pasado eso la foto del producto se deforma y el efecto se lee como un truco. |
| En el **teléfono no hay inclinación ni elevación al tocar** | Sin cursor no hay a dónde inclinarse, y el navegador deja el `:hover` pegado después de tocar: la tarjeta se quedaba levantada. Queda la elevación quieta, que es la parte que funciona sin puntero. |
| La **cabecera proyecta sombra solo al scrollear** | Pegada arriba con la página sin mover, una sombra flotaría sobre nada. |

`js/relieve.js` sólo escribe los dos ángulos en `--rx` y `--ry`. Si ese archivo no carga, las
variables caen en `0deg` y la tarjeta igual sube: el efecto **se degrada, no se rompe**. No corre
sin puntero fino ni con `prefers-reduced-motion`, y escribe dentro de un `requestAnimationFrame`
porque `pointermove` dispara más seguido que los cuadros que la pantalla puede mostrar.

Para revertir todo esto: borrar el bloque de elevación de `:root`, volver `--sombra-1`/`--sombra-2`
a sus valores de una sola capa, y sacar el import de `relieve.js` en `js/vistas-tienda.js`.

### Modo día y noche

El documento describe un sistema claro, así que la paleta oscura es una **derivación**, no
algo que esté ahí. Lo que se mantiene es la lógica: la capa de acción sigue siendo monocroma
y de máximo contraste — en claro el CTA es casi negro sobre blanco, en oscuro casi blanco
sobre negro. Un CTA casi negro sobre fondo oscuro desaparecería. El pie sigue siendo la
superficie más oscura, que es con lo que el sistema cierra la página.

El tema vive en `js/tema.js` y se estampa como `data-tema` en `<html>`; el CSS lo resuelve
todo desde ahí, con los tokens oscuros en un único bloque `:root[data-tema="oscuro"]`. Si el
usuario nunca eligió se sigue la preferencia del sistema **y se queda escuchando**: cambiar
el tema del teléfono cambia la página. En cuanto toca el botón, su elección manda y deja de
escucharse. Un script en línea en el `<head>` estampa el tema antes de pintar, para que
entrar de noche no muestre un parpadeo claro.

Los nueve pares de color del modo oscuro miden 4.74:1 o más.

### El fondo animado

Cuatro manchas de color muy grandes y desenfocadas que se mueven despacio detrás de todo,
tipo lámpara de lava. Es CSS puro: no hay JavaScript, no hay librerías, y se saca borrando
el bloque `.fondo-lava` del HTML y su regla del CSS.

**Va en contra del documento de diseño**, que pide "sin gradientes decorativos, sin fondos
atmosféricos". Se agregó por pedido expreso, con tres cuidados:

- **La opacidad no se eligió a ojo, se midió.** Cada mancha usa la opacidad más alta que
  todavía deja el texto `--muted` —el de menor contraste del sistema— en 4.5:1 sobre ella.
  En modo día quedan entre 0.35 y 0.40; en noche, entre 0.44 y 0.70, porque sobre casi negro
  hay más margen. Si se suben, hay texto secundario que deja de cumplir AA.
- **Solo se anima `transform`.** Nada de animar `filter` ni `background`, que obligan a
  repintar en cada cuadro.
- **`prefers-reduced-motion` deja el fondo quieto**, no sin fondo. Si el fondo se ve lindo
  pero inmóvil, eso es lo primero que hay que descartar: es la opción "reducir movimiento"
  del sistema operativo.

Cada mancha recorre un **circuito cerrado de cuatro puntos** a velocidad constante (`linear`,
ciclos de 20 a 29 segundos), y vuelve al punto de partida para que el bucle enlace sin salto.
El primer intento usaba `ease-in-out` con `alternate`, y eso frenaba del todo en cada extremo
y arrancaba casi quieto: en los primeros segundos parecía estático.

Las manchas se llaman `.mancha`, no `.burbuja`: esa clase ya era la del contador del carrito
en la cabecera.

Las tarjetas conservan su fondo opaco, así que el efecto se ve sobre todo por los márgenes
y entre secciones.

El conmutador de *Ya tengo cuenta / Crear cuenta* y, en pantallas chicas, los filtros del
catálogo usan el `nav-pill-group` del sistema: envoltorio gris de radio pastilla con la
pastilla activa en blanco y sombra suave.

### En el teléfono

Lo que hacía el catálogo inusable: a una sola columna, cada tarjeta medía 508px de alto y los 44
productos sumaban **22.405px de scroll** — veintiséis pantallas de teléfono. Ahora son dos columnas
con la foto en cuadrado: la misma lista entra en 8.587px.

Los filtros se envolvían en una caja de 87px de alto con radio de píldora, que no se leía como un
grupo de filtros y empujaba los productos abajo del pliegue. Pasaron a ser una tira horizontal que
se desliza, de alto constante (44px), con `scroll-snap`. Nada de sangrarla hasta el borde con
márgenes negativos: eso la hace más ancha que su celda de grilla y estira el documento entero.

El encabezado desbordaba **apenas se agregaba algo al carrito**: la burbuja del contador sumaba
20px y la fila pasaba a 402px sobre un viewport de 373, así que el teléfono quedaba con scroll
horizontal. El botón del carrito se quedó con su ícono, como el de día/noche, y la marca es lo
único que puede ceder ancho (se recorta con puntos suspensivos por debajo de ~370px). Los dos
enlaces ya tenían `aria-label`, así que esconder la palabra no les saca el nombre accesible.

Los objetivos de dedo que medían menos de 40px —el botón de menú (36x29), el − y el + del carrito
(34x38), la cruz de quitar (36x36), las pestañas de ingreso (36) y la casilla de recordarme (13)—
pasaron a 40px o más.

La fila del carrito usa áreas de grilla explícitas: con dos columnas automáticas la cruz terminaba
suelta debajo de la cantidad. Ahora la cruz va al lado del nombre, que es lo que se quiere borrar,
y abajo quedan la cantidad y su importe, que es lo que se compara.

Verificado en inicio, catálogo, detalle, carrito, checkout y cuenta, a 390, 360 y 320px, con un
producto en el carrito.

#### Lo anterior

El encabezado entero no entra en un celular: con las tres etiquetas completas la fila medía
438px sobre un viewport de 375 y aparecía scroll horizontal, que es lo que corría toda la
página de los márgenes. Por debajo de 760px el botón de día/noche se queda **solo con el
ícono** (su `aria-label` sigue nombrando lo que hace, así que no pierde accesibilidad) y la
barra achica el gap. Con eso entra hasta en 345px.

El otro causante era la regla de apilado del fondo animado, que listaba `.avisos` y le pisaba
su `position: fixed` con `relative`: los avisos salían de la esquina, entraban al flujo y el
`right: 16px` pasaba a leerse como corrimiento, dejando el bloque 16px fuera del borde
izquierdo. `.avisos` ya tiene su propio `z-index`, así que no necesita estar en esa lista.

## Cómo está armada

| Archivo | Qué hace |
| --- | --- |
| `config.js` | Única fuente de configuración. |
| `js/sesion.js` | Guarda el token de la sesión (de Google o de la API), lo decodifica y lo vence solo. |
| `js/auth.js` | Carga el SDK de Google y dibuja el botón oficial de ingreso. |
| `js/acceso.js` | Panel de ingreso compartido: botón de Google + formularios de login y registro. |
| `js/anuncios.js` | La cinta de mensajes de arriba, configurable desde el panel. |
| `js/tema.js` | Modo día y noche. |
| `js/api.js` | Cliente HTTP; agrega el `Bearer` y traduce los errores de la API. |
| `js/datos.js` | Cache del catálogo: cruza productos, categorías, fotos y stock. |
| `js/carrito.js` | Carrito en `localStorage` con sus totales. |
| `js/vistas-tienda.js` | Inicio, catálogo con filtros y detalle de producto. |
| `js/vistas-carrito.js` | Carrito, checkout y armado del mensaje de WhatsApp. |
| `js/vistas-cuenta.js` | Perfil editable, contraseña e historial de pedidos. |
| `js/app.js` | Router por hash y cabecera. |

## El checkout

El pago no es automático: se coordina por WhatsApp. Al confirmar, la tienda:

1. guarda nombre, teléfono y dirección en el perfil (`PUT /api/Perfil`);
2. crea el `Carrito` y un `DetalleCarrito` por producto;
3. crea la `Compra` con el importe total (incluye el recargo de la forma de pago);
4. abre `wa.me/543564567771` con el número de pedido y el detalle;
5. vacía el carrito.

Si el navegador bloquea la pestaña nueva, la pantalla de confirmación deja el botón
para abrir WhatsApp a mano.

**Para que el checkout funcione tiene que haber al menos una forma de pago y un modo de
entrega cargados** en el panel de administración: `Compra` los exige por clave foránea.

## Qué ve cada quien

| | Visitante | Cliente logueado | Admin |
| --- | --- | --- | --- |
| Ver catálogo, fotos, precios y stock | sí | sí | sí |
| Carrito | sí | sí | sí |
| Finalizar compra | no | sí | sí |
| Ver sus pedidos | no | sí | sí |
| Ver pedidos de otros | no | no | sí |
| Editar catálogo, stock y precios | no | no | sí |

El precio de costo (`Stock.precioCosto`) nunca se expone a la tienda: la disponibilidad
llega por `GET /api/Productos/disponibilidad`, que solo informa cantidades.

## Limitaciones conocidas

- Los productos se muestran si tienen `publicado = true`. Sin registros de stock se
  asume disponible, para no esconder un producto recién cargado.
- Un producto sin fotos muestra el isologo como marcador.
- La sesión vive en `sessionStorage` (dura lo que dura la pestaña) salvo que se marque
  *Mantenerme conectado*, y ahí pasa a `localStorage`. El token de Google dura alrededor de
  una hora; el de correo y contraseña, 30 días.
- El correo del registro no se verifica: no hay envío de mails configurado. Por eso no se
  puede tomar una cuenta que ya existe, y tampoco hay "olvidé mi contraseña" (hoy la
  recupera el admin desde el panel).
- El freno de `/api/Auth` es por IP y en memoria: con varias instancias de la API cada una
  lleva su propia cuenta.
