import { CONFIG } from "../config.js";
import { vistaInicio, vistaCatalogo, vistaProducto } from "./vistas-tienda.js";
import { vistaCarrito, vistaCheckout } from "./vistas-carrito.js";
import { vistaCuenta } from "./vistas-cuenta.js";
import { alCambiarCarrito, cantidadTotal } from "./carrito.js";
import { alCambiarSesion, usuarioActual } from "./sesion.js";
import { esc } from "./ui.js";
import { iniciarTema, conectarBotonDeTema } from "./tema.js";

const contenido = document.getElementById("contenido");

const RUTAS = [
    { patron: /^\/?$/, vista: vistaInicio },
    { patron: /^\/catalogo$/, vista: vistaCatalogo },
    { patron: /^\/producto\/(\d+)$/, vista: vistaProducto, claves: ["id"] },
    { patron: /^\/carrito$/, vista: vistaCarrito },
    { patron: /^\/checkout$/, vista: vistaCheckout },
    { patron: /^\/cuenta$/, vista: vistaCuenta }
];

function leerRuta() {
    const crudo = window.location.hash.replace(/^#/, "") || "/";
    const [camino, consulta] = crudo.split("?");
    const parametros = {};

    if(consulta) {
        for(const [clave, valor] of new URLSearchParams(consulta)) {
            parametros[clave] = valor;
        }
    }

    return { camino, parametros };
}

async function enrutar() {
    const { camino, parametros } = leerRuta();

    for(const ruta of RUTAS) {
        const coincidencia = camino.match(ruta.patron);

        if(!coincidencia) {
            continue;
        }

        if(ruta.claves) {
            ruta.claves.forEach((clave, indice) => {
                parametros[clave] = coincidencia[indice + 1];
            });
        }

        marcarNavegacionActiva(camino);
        window.scrollTo({ top: 0, behavior: "instant" });

        try {
            await ruta.vista(contenido, parametros);
        } catch(error) {
            console.error("Error dibujando la vista:", error);
            contenido.innerHTML =
                '<div class="panel-error"><h3>Algo salió mal</h3><p>' + esc(error.message) + "</p></div>";
        }

        return;
    }

    contenido.innerHTML =
        '<div class="panel-vacio"><h3>Página no encontrada</h3>' +
        '<p>El enlace que seguiste no existe.</p>' +
        '<a class="boton-primario" href="#/">Ir al inicio</a></div>';
}

function marcarNavegacionActiva(camino) {
    for(const enlace of document.querySelectorAll(".nav-enlace")) {
        const destino = enlace.getAttribute("href").replace(/^#/, "");
        enlace.classList.toggle("activo", destino === camino);
    }
}

function refrescarCarritoEnCabecera() {
    const total = cantidadTotal();
    const burbuja = document.getElementById("burbujaCarrito");

    burbuja.textContent = total;
    burbuja.hidden = total === 0;
}

function refrescarCuentaEnCabecera() {
    const usuario = usuarioActual();
    const enlace = document.getElementById("enlaceCuenta");

    if(usuario) {
        enlace.innerHTML = usuario.foto
            ? '<img class="avatar-mini" src="' + esc(usuario.foto) + '" alt=""><span>Mi cuenta</span>'
            : "<span>Mi cuenta</span>";
        enlace.title = usuario.correo;
    } else {
        enlace.innerHTML = "<span>Ingresar</span>";
        enlace.title = "Iniciar sesión";
    }
}

function conectarMenuMovil() {
    const boton = document.getElementById("botonMenu");
    const navegacion = document.getElementById("navegacion");

    boton.addEventListener("click", () => navegacion.classList.toggle("abierta"));
    navegacion.addEventListener("click", evento => {
        if(evento.target.closest("a")) {
            navegacion.classList.remove("abierta");
        }
    });
}

function conectarBusquedaDeCabecera() {
    const formulario = document.getElementById("formBusqueda");

    formulario.addEventListener("submit", evento => {
        evento.preventDefault();
        const texto = document.getElementById("busquedaCabecera").value.trim();
        window.location.hash = texto === ""
            ? "#/catalogo"
            : "#/catalogo?q=" + encodeURIComponent(texto);
    });
}

document.getElementById("anioActual").textContent = new Date().getFullYear();

const enlaceWhatsapp = "https://wa.me/" + CONFIG.whatsapp + "?text=" +
    encodeURIComponent("Hola, quiero hacer una consulta.");

for(const id of ["enlaceWhatsappPie", "enlaceWhatsappCta"]) {
    const enlace = document.getElementById(id);

    if(enlace) {
        enlace.href = enlaceWhatsapp;
    }
}

alCambiarCarrito(refrescarCarritoEnCabecera);
alCambiarSesion(refrescarCuentaEnCabecera);
window.addEventListener("hashchange", enrutar);

iniciarTema();
conectarBotonDeTema(document.getElementById("botonTema"));
conectarMenuMovil();
conectarBusquedaDeCabecera();
refrescarCarritoEnCabecera();
refrescarCuentaEnCabecera();
enrutar();
