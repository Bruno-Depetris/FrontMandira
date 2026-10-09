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

El conmutador de *Ya tengo cuenta / Crear cuenta* y, en pantallas chicas, los filtros del
catálogo usan el `nav-pill-group` del sistema: envoltorio gris de radio pastilla con la
pastilla activa en blanco y sombra suave.

## Cómo está armada

| Archivo | Qué hace |
| --- | --- |
| `config.js` | Única fuente de configuración. |
| `js/sesion.js` | Guarda el token de la sesión (de Google o de la API), lo decodifica y lo vence solo. |
| `js/auth.js` | Carga el SDK de Google y dibuja el botón oficial de ingreso. |
| `js/acceso.js` | Panel de ingreso compartido: botón de Google + formularios de login y registro. |
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
