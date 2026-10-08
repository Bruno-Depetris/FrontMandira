import { CONFIG } from "../config.js";
import { api } from "./api.js";
import { obtenerItems, fijarCantidad, quitar, importeTotal, vaciar, cantidadTotal } from "./carrito.js";
import { haySesion } from "./sesion.js";
import { dibujarBoton, hayClientIdConfigurado } from "./auth.js";
import { esc, moneda, cargando, panelError, vacio, aviso } from "./ui.js";

// ------------------------------------------------------------------ carrito

export function vistaCarrito(contenedor) {
    const items = obtenerItems();

    if(items.length === 0) {
        contenedor.innerHTML = vacio(
            "Tu carrito está vacío",
            "Cuando agregues productos los vas a ver acá.",
            '<a class="boton-primario" href="#/catalogo">Ver catálogo</a>'
        );
        return;
    }

    contenedor.innerHTML =
        '<section class="seccion"><h2>Tu carrito</h2>' +
        '<div class="tabla-carrito">' +
        items.map(item =>
            '<div class="fila-carrito" data-id="' + item.productoId + '">' +
            '<div class="fila-nombre"><a href="#/producto/' + item.productoId + '">' + esc(item.nombre) + "</a>" +
            '<span class="fila-unitario">' + moneda(item.precio) + " c/u</span></div>" +
            '<div class="fila-cantidad">' +
            '<button data-menos aria-label="Quitar uno">&minus;</button>' +
            "<span>" + item.cantidad + "</span>" +
            '<button data-mas aria-label="Agregar uno">+</button>' +
            "</div>" +
            '<div class="fila-subtotal">' + moneda(item.precio * item.cantidad) + "</div>" +
            '<button class="fila-quitar" data-quitar aria-label="Quitar del carrito">&times;</button>' +
            "</div>").join("") +
        "</div>" +
        '<div class="resumen-carrito">' +
        '<div class="total"><span>Total</span><strong>' + moneda(importeTotal()) + "</strong></div>" +
        '<div class="acciones-carrito">' +
        '<button class="boton-sutil" id="botonVaciar">Vaciar carrito</button>' +
        '<a class="boton-primario" href="#/checkout">Finalizar compra</a>' +
        "</div></div></section>";

    contenedor.querySelector(".tabla-carrito").addEventListener("click", evento => {
        const fila = evento.target.closest(".fila-carrito");

        if(!fila) {
            return;
        }

        const id = Number(fila.dataset.id);
        const item = obtenerItems().find(actual => actual.productoId === id);

        if(!item) {
            return;
        }

        if(evento.target.closest("[data-mas]")) {
            fijarCantidad(id, item.cantidad + 1);
        } else if(evento.target.closest("[data-menos]")) {
            fijarCantidad(id, item.cantidad - 1);
        } else if(evento.target.closest("[data-quitar]")) {
            quitar(id);
        } else {
            return;
        }

        vistaCarrito(contenedor);
    });

    contenedor.querySelector("#botonVaciar").addEventListener("click", () => {
        vaciar();
        vistaCarrito(contenedor);
    });
}

// ------------------------------------------------------------------ checkout

export async function vistaCheckout(contenedor) {
    if(cantidadTotal() === 0) {
        contenedor.innerHTML = vacio(
            "No hay nada para comprar",
            "Agregá productos al carrito antes de finalizar.",
            '<a class="boton-primario" href="#/catalogo">Ver catálogo</a>'
        );
        return;
    }

    if(!haySesion()) {
        mostrarMuroDeLogin(contenedor);
        return;
    }

    contenedor.innerHTML = '<section class="seccion"><h2>Finalizar compra</h2>' +
        '<div id="zonaCheckout">' + cargando("Preparando tu pedido") + "</div></section>";

    const zona = contenedor.querySelector("#zonaCheckout");

    let perfil;
    let formasDePago;
    let entregas;

    try {
        [perfil, formasDePago, entregas] = await Promise.all([
            api.perfil(),
            api.formasDePago(),
            api.entregas()
        ]);
    } catch(error) {
        if(error.esDeSesion) {
            mostrarMuroDeLogin(contenedor);
            return;
        }

        zona.innerHTML = panelError("No pudimos preparar el pedido", error.message);
        return;
    }

    if(formasDePago.length === 0 || entregas.length === 0) {
        zona.innerHTML = panelError(
            "Falta configurar la tienda",
            "Todavía no hay " +
            (formasDePago.length === 0 ? "formas de pago" : "") +
            (formasDePago.length === 0 && entregas.length === 0 ? " ni " : "") +
            (entregas.length === 0 ? "modos de entrega" : "") +
            " cargados en el panel de administración. Sin eso no se puede registrar el pedido."
        );
        return;
    }

    const items = obtenerItems();

    zona.innerHTML =
        '<form id="formCheckout" class="checkout" novalidate>' +
        '<div class="checkout-datos">' +
        "<h3>Tus datos</h3>" +
        '<div class="campo"><label for="nombre">Nombre y apellido <span class="req">*</span></label>' +
        '<input type="text" id="nombre" value="' + esc(perfil.nombre || "") + '" required></div>' +
        '<div class="campo"><label for="telefono">Teléfono <span class="req">*</span></label>' +
        '<input type="tel" id="telefono" value="' + esc(perfil.telefono || "") + '" placeholder="3564 55-1234" required></div>' +
        '<div class="campo"><label for="direccion">Dirección</label>' +
        '<input type="text" id="direccion" value="' + esc(perfil.direccion || "") + '" placeholder="Calle 123, Ciudad"></div>' +
        '<p class="ayuda">Entramos con <strong>' + esc(perfil.correo) + "</strong>.</p>" +
        "<h3>Entrega</h3>" +
        '<div class="opciones">' + entregas.map((entrega, indice) =>
            '<label class="opcion"><input type="radio" name="entrega" value="' + entrega.id + '"' +
            (indice === 0 ? " checked" : "") + "><span>" + esc(entrega.nombre) + "</span></label>").join("") +
        "</div>" +
        "<h3>Forma de pago</h3>" +
        '<div class="opciones">' + formasDePago.map((forma, indice) =>
            '<label class="opcion"><input type="radio" name="pago" value="' + forma.id +
            '" data-recargo="' + forma.recargo + '"' + (indice === 0 ? " checked" : "") + "><span>" +
            esc(forma.nombre) +
            (Number(forma.recargo) > 0 ? ' <small>+' + moneda(forma.recargo) + "</small>" : "") +
            "</span></label>").join("") +
        "</div>" +
        "</div>" +
        '<aside class="checkout-resumen">' +
        "<h3>Tu pedido</h3>" +
        '<ul class="resumen-items">' + items.map(item =>
            "<li><span>" + item.cantidad + "&times; " + esc(item.nombre) + "</span><strong>" +
            moneda(item.precio * item.cantidad) + "</strong></li>").join("") +
        "</ul>" +
        '<div class="resumen-linea"><span>Subtotal</span><span id="subtotal">' + moneda(importeTotal()) + "</span></div>" +
        '<div class="resumen-linea"><span>Recargo</span><span id="recargo">' + moneda(0) + "</span></div>" +
        '<div class="total"><span>Total</span><strong id="totalFinal">' + moneda(importeTotal()) + "</strong></div>" +
        '<p id="errorCheckout" class="error-form" hidden></p>' +
        '<button type="submit" class="boton-primario ancho" id="botonConfirmar">Confirmar y enviar por WhatsApp</button>' +
        '<p class="ayuda">Al confirmar registramos tu pedido y se abre WhatsApp con el detalle para coordinar el pago.</p>' +
        "</aside></form>";

    const formulario = zona.querySelector("#formCheckout");
    const zonaError = zona.querySelector("#errorCheckout");

    function recargoElegido() {
        const elegido = formulario.querySelector('input[name="pago"]:checked');
        return elegido ? Number(elegido.dataset.recargo) || 0 : 0;
    }

    function refrescarTotales() {
        const recargo = recargoElegido();
        zona.querySelector("#recargo").textContent = moneda(recargo);
        zona.querySelector("#totalFinal").textContent = moneda(importeTotal() + recargo);
    }

    formulario.addEventListener("change", evento => {
        if(evento.target.name === "pago") {
            refrescarTotales();
        }
    });

    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();
        await confirmar({ formulario, zona, zonaError, perfil, entregas, formasDePago, recargoElegido });
    });

    refrescarTotales();
}

function mostrarMuroDeLogin(contenedor) {
    contenedor.innerHTML =
        '<section class="seccion muro-login">' +
        '<img class="muro-marca" src="Assets/isologo.png" alt="">' +
        "<h2>Iniciá sesión para terminar la compra</h2>" +
        "<p>Necesitamos identificarte para registrar el pedido y que puedas seguirlo después.</p>" +
        '<div id="botonGoogleCheckout" class="zona-boton-google"></div>' +
        '<p id="avisoLogin" class="ayuda"></p>' +
        '<a class="boton-sutil" href="#/carrito">Volver al carrito</a>' +
        "</section>";

    const zonaBoton = contenedor.querySelector("#botonGoogleCheckout");
    const avisoLogin = contenedor.querySelector("#avisoLogin");

    if(!hayClientIdConfigurado()) {
        avisoLogin.innerHTML =
            "El inicio de sesión todavía no está configurado: falta el <code>googleClientId</code> en " +
            "<code>config.js</code>. Mirá el README para crearlo.";
        return;
    }

    dibujarBoton(zonaBoton, { texto: "continue_with" }).catch(error => {
        avisoLogin.textContent = error.message;
    });
}

/** Escribe el pedido en la API y abre WhatsApp con el detalle. */
async function confirmar({ formulario, zona, zonaError, perfil, entregas, formasDePago, recargoElegido }) {
    const boton = zona.querySelector("#botonConfirmar");
    const nombre = formulario.querySelector("#nombre").value.trim();
    const telefono = formulario.querySelector("#telefono").value.trim();
    const direccion = formulario.querySelector("#direccion").value.trim();

    if(nombre === "") {
        return mostrarError(zonaError, "Necesitamos tu nombre para el pedido.");
    }

    if(telefono === "") {
        return mostrarError(zonaError, "Dejanos un teléfono para poder coordinar.");
    }

    const entregaId = Number(formulario.querySelector('input[name="entrega"]:checked').value);
    const formaPagoId = Number(formulario.querySelector('input[name="pago"]:checked').value);
    const items = obtenerItems();
    const recargo = recargoElegido();
    const total = importeTotal() + recargo;

    zonaError.hidden = true;
    boton.disabled = true;
    boton.textContent = "Registrando tu pedido…";

    try {
        // 1) los datos de contacto quedan en el perfil para la proxima compra
        await api.actualizarPerfil({ nombre, direccion: direccion || null, telefono });

        // 2) carrito + detalle + compra, en ese orden por las claves foraneas
        const carrito = await api.crearCarrito({
            usuarioWebId: perfil.id,
            fechaCreacion: new Date().toISOString().slice(0, 19)
        });

        for(const item of items) {
            await api.crearDetalleCarrito({
                carritoId: carrito.id,
                productoId: item.productoId,
                cantidad: item.cantidad
            });
        }

        const compra = await api.crearCompra({
            importe: total,
            carritoId: carrito.id,
            entregaId,
            formaPagoId,
            usuarioWebId: perfil.id
        });

        const entrega = entregas.find(actual => actual.id === entregaId);
        const formaPago = formasDePago.find(actual => actual.id === formaPagoId);

        const enlace = armarEnlaceWhatsApp({
            compra, items, total, recargo, nombre, telefono, direccion,
            entrega: entrega ? entrega.nombre : "",
            formaPago: formaPago ? formaPago.nombre : ""
        });

        vaciar();
        mostrarConfirmacion(zona.closest("main") || document.getElementById("contenido"), compra, enlace);

        // Se abre en otra pestaña; si el navegador la bloquea queda el boton de la confirmacion.
        window.open(enlace, "_blank", "noopener");
    } catch(error) {
        boton.disabled = false;
        boton.textContent = "Confirmar y enviar por WhatsApp";

        if(error.esDeSesion) {
            return mostrarError(zonaError, "Tu sesión expiró. Iniciá sesión de nuevo para confirmar.");
        }

        mostrarError(zonaError, "No pudimos registrar el pedido: " + error.message);
    }
}

function mostrarError(zonaError, mensaje) {
    zonaError.textContent = mensaje;
    zonaError.hidden = false;
    aviso(mensaje, "error");
}

function armarEnlaceWhatsApp({ compra, items, total, recargo, nombre, telefono, direccion, entrega, formaPago }) {
    const lineas = [
        "Hola Mandira, acabo de hacer el pedido #" + compra.id + ".",
        "",
        "*Detalle*"
    ];

    for(const item of items) {
        lineas.push("• " + item.cantidad + "x " + item.nombre + " — " + moneda(item.precio * item.cantidad));
    }

    if(recargo > 0) {
        lineas.push("Recargo: " + moneda(recargo));
    }

    lineas.push("*Total: " + moneda(total) + "*");
    lineas.push("");
    lineas.push("*Entrega:* " + entrega);
    lineas.push("*Pago:* " + formaPago);
    lineas.push("");
    lineas.push("*Mis datos*");
    lineas.push("Nombre: " + nombre);
    lineas.push("Teléfono: " + telefono);

    if(direccion !== "") {
        lineas.push("Dirección: " + direccion);
    }

    return "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(lineas.join("\n"));
}

function mostrarConfirmacion(contenedor, compra, enlace) {
    contenedor.innerHTML =
        '<section class="seccion confirmacion">' +
        '<div class="tilde">&check;</div>' +
        "<h2>¡Listo! Tu pedido es el #" + compra.id + "</h2>" +
        "<p>Ya lo registramos. Te abrimos WhatsApp para que termines de coordinar el pago y la entrega " +
        "con nosotros. Si no se abrió solo, usá el botón.</p>" +
        '<a class="boton-primario" href="' + esc(enlace) + '" target="_blank" rel="noopener">Abrir WhatsApp</a>' +
        '<div class="acciones-confirmacion">' +
        '<a class="boton-sutil" href="#/cuenta">Ver mis pedidos</a>' +
        '<a class="boton-sutil" href="#/catalogo">Seguir comprando</a>' +
        "</div></section>";
}
