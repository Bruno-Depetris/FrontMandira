import { api } from "./api.js";
import { haySesion, usuarioActual } from "./sesion.js";
import { salir } from "./auth.js";
import { panelAcceso } from "./acceso.js";
import { esc, moneda, cargando, panelError, vacio, aviso } from "./ui.js";

export async function vistaCuenta(contenedor) {
    if(!haySesion()) {
        panelAcceso(contenedor, {
            titulo: "Entrá a tu cuenta",
            texto: "Mirá tus pedidos y guardá tus datos para comprar más rápido.",
            alIngresar: () => vistaCuenta(contenedor)
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
        '<div><div id="zonaPerfil">' + cargando("Cargando tus datos") + "</div>" +
        '<div id="zonaContrasena"></div></div>' +
        '<div id="zonaPedidos">' + cargando("Buscando tus pedidos") + "</div>" +
        "</div></section>";

    contenedor.querySelector("#botonSalir").addEventListener("click", () => {
        salir();
        aviso("Cerraste sesión.", "info");
        window.location.hash = "#/";
    });

    dibujarContrasena(contenedor.querySelector("#zonaContrasena"));

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

/**
 * Deja poner o cambiar la contrasena. Quien entro con Google la usa para habilitar
 * tambien el ingreso con correo y contrasena: en ese caso no hay contrasena actual
 * que pedirle, asi que el campo es opcional y la API no lo exige.
 */
function dibujarContrasena(zona) {
    zona.innerHTML =
        '<form class="tarjeta-panel" id="formContrasena" novalidate><h3>Contraseña</h3>' +
        '<p class="ayuda">Si entrás con Google podés ponerle una contraseña para ingresar también ' +
        "sin Google. Dejá vacía la actual si todavía no tenés una.</p>" +
        '<div class="campo"><label for="contrasenaActual">Contraseña actual</label>' +
        '<input type="password" id="contrasenaActual" autocomplete="current-password"></div>' +
        '<div class="campo"><label for="contrasenaNueva">Contraseña nueva <span class="req">*</span></label>' +
        '<input type="password" id="contrasenaNueva" autocomplete="new-password">' +
        '<p class="ayuda">Mínimo 8 caracteres.</p></div>' +
        '<p id="errorContrasena" class="error-form" hidden></p>' +
        '<button type="submit" class="boton-sutil" id="botonGuardarContrasena">Guardar contraseña</button>' +
        "</form>";

    const formulario = zona.querySelector("#formContrasena");
    const zonaError = zona.querySelector("#errorContrasena");

    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();

        const boton = zona.querySelector("#botonGuardarContrasena");
        const nueva = zona.querySelector("#contrasenaNueva").value;

        if(nueva.length < 8) {
            zonaError.textContent = "La contraseña nueva tiene que tener al menos 8 caracteres.";
            zonaError.hidden = false;
            return;
        }

        zonaError.hidden = true;
        boton.disabled = true;
        boton.textContent = "Guardando…";

        try {
            await api.cambiarContrasena({
                contrasenaActual: zona.querySelector("#contrasenaActual").value,
                contrasenaNueva: nueva
            });

            formulario.reset();
            aviso("Listo, ya podés entrar con tu correo y esta contraseña.", "exito");
        } catch(error) {
            zonaError.textContent = error.message;
            zonaError.hidden = false;
        } finally {
            boton.disabled = false;
            boton.textContent = "Guardar contraseña";
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
