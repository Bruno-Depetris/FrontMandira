import { api } from "./api.js";
import { haySesion, usuarioActual } from "./sesion.js";
import { dibujarBoton, hayClientIdConfigurado, salir } from "./auth.js";
import { esc, moneda, cargando, panelError, vacio, aviso } from "./ui.js";

export async function vistaCuenta(contenedor) {
    if(!haySesion()) {
        contenedor.innerHTML =
            '<section class="seccion muro-login">' +
            '<img class="muro-marca" src="Assets/isologo.png" alt="">' +
            "<h2>Entrá a tu cuenta</h2>" +
            "<p>Mirá tus pedidos y guardá tus datos para comprar más rápido.</p>" +
            '<div id="botonGoogleCuenta" class="zona-boton-google"></div>' +
            '<p id="avisoCuenta" class="ayuda"></p>' +
            "</section>";

        const avisoCuenta = contenedor.querySelector("#avisoCuenta");

        if(!hayClientIdConfigurado()) {
            avisoCuenta.innerHTML =
                "Falta configurar <code>googleClientId</code> en <code>config.js</code> para habilitar el ingreso.";
            return;
        }

        dibujarBoton(contenedor.querySelector("#botonGoogleCuenta")).catch(error => {
            avisoCuenta.textContent = error.message;
        });
        return;
    }

    const usuario = usuarioActual();

    contenedor.innerHTML =
        '<section class="seccion"><header class="cabecera-cuenta">' +
        (usuario.foto ? '<img class="avatar" src="' + esc(usuario.foto) + '" alt="">' : "") +
        "<div><h2>Hola, " + esc(primerNombre(usuario.nombre)) + "</h2>" +
        '<p class="ayuda">' + esc(usuario.correo) + "</p></div>" +
        '<button class="boton-sutil" id="botonSalir">Cerrar sesión</button>' +
        "</header>" +
        '<div class="disposicion-cuenta">' +
        '<div id="zonaPerfil">' + cargando("Cargando tus datos") + "</div>" +
        '<div id="zonaPedidos">' + cargando("Buscando tus pedidos") + "</div>" +
        "</div></section>";

    contenedor.querySelector("#botonSalir").addEventListener("click", () => {
        salir();
        aviso("Cerraste sesión.", "info");
        window.location.hash = "#/";
    });

    await Promise.all([
        dibujarPerfil(contenedor.querySelector("#zonaPerfil")),
        dibujarPedidos(contenedor.querySelector("#zonaPedidos"))
    ]);
}

function primerNombre(nombre) {
    return (nombre || "").split(" ")[0] || nombre;
}

async function dibujarPerfil(zona) {
    let perfil;

    try {
        perfil = await api.perfil();
    } catch(error) {
        zona.innerHTML = panelError("No pudimos cargar tus datos", error.message);
        return;
    }

    zona.innerHTML =
        '<form class="tarjeta-panel" id="formPerfil" novalidate><h3>Mis datos</h3>' +
        '<div class="campo"><label for="perfilNombre">Nombre <span class="req">*</span></label>' +
        '<input type="text" id="perfilNombre" value="' + esc(perfil.nombre || "") + '"></div>' +
        '<div class="campo"><label for="perfilTelefono">Teléfono</label>' +
        '<input type="tel" id="perfilTelefono" value="' + esc(perfil.telefono || "") + '"></div>' +
        '<div class="campo"><label for="perfilDireccion">Dirección</label>' +
        '<input type="text" id="perfilDireccion" value="' + esc(perfil.direccion || "") + '"></div>' +
        '<p id="errorPerfil" class="error-form" hidden></p>' +
        '<button type="submit" class="boton-primario" id="botonGuardarPerfil">Guardar cambios</button>' +
        "</form>";

    const formulario = zona.querySelector("#formPerfil");
    const zonaError = zona.querySelector("#errorPerfil");

    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();

        const boton = zona.querySelector("#botonGuardarPerfil");
        const nombre = zona.querySelector("#perfilNombre").value.trim();

        if(nombre === "") {
            zonaError.textContent = "El nombre no puede quedar vacío.";
            zonaError.hidden = false;
            return;
        }

        zonaError.hidden = true;
        boton.disabled = true;
        boton.textContent = "Guardando…";

        try {
            await api.actualizarPerfil({
                nombre,
                telefono: zona.querySelector("#perfilTelefono").value.trim() || null,
                direccion: zona.querySelector("#perfilDireccion").value.trim() || null
            });

            aviso("Guardamos tus datos.", "exito");
        } catch(error) {
            zonaError.textContent = error.message;
            zonaError.hidden = false;
        } finally {
            boton.disabled = false;
            boton.textContent = "Guardar cambios";
        }
    });
}

async function dibujarPedidos(zona) {
    let compras;

    try {
        compras = await api.misCompras();
    } catch(error) {
        zona.innerHTML = panelError("No pudimos cargar tus pedidos", error.message);
        return;
    }

    if(compras.length === 0) {
        zona.innerHTML =
            '<div class="tarjeta-panel"><h3>Mis pedidos</h3>' +
            vacio("Todavía no hiciste pedidos", "Cuando compres te van a aparecer acá.",
                '<a class="boton-sutil" href="#/catalogo">Ver catálogo</a>') +
            "</div>";
        return;
    }

    zona.innerHTML =
        '<div class="tarjeta-panel"><h3>Mis pedidos</h3>' +
        '<ul class="lista-pedidos">' + compras.map(compra =>
            '<li><div><strong>Pedido #' + compra.id + "</strong>" +
            '<span class="ayuda">Carrito #' + compra.carritoId + "</span></div>" +
            "<strong>" + moneda(compra.importe) + "</strong></li>").join("") +
        "</ul>" +
        '<p class="ayuda">Para ver el estado de un pedido escribinos por WhatsApp con el número de pedido.</p>' +
        "</div>";
}
