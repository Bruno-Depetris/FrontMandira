import { CONFIG } from "../config.js";
import { guardarToken, cerrarSesion, haySesion } from "./sesion.js";

const URL_SDK = "https://accounts.google.com/gsi/client";

let cargandoSdk = null;
let iniciado = false;
let resolverLogin = null;

export function hayClientIdConfigurado() {
    return typeof CONFIG.googleClientId === "string" && CONFIG.googleClientId.trim() !== "";
}

function cargarSdk() {
    if(cargandoSdk) {
        return cargandoSdk;
    }

    cargandoSdk = new Promise((resolver, rechazar) => {
        if(window.google && window.google.accounts) {
            resolver();
            return;
        }

        const etiqueta = document.createElement("script");
        etiqueta.src = URL_SDK;
        etiqueta.async = true;
        etiqueta.defer = true;
        etiqueta.onload = () => resolver();
        etiqueta.onerror = () => rechazar(new Error("No se pudo cargar el inicio de sesión de Google."));
        document.head.appendChild(etiqueta);
    });

    return cargandoSdk;
}

async function iniciar() {
    if(!hayClientIdConfigurado()) {
        throw new Error(
            "Falta configurar el Client ID de Google en config.js. " +
            "Mirá el README para crearlo en Google Cloud Console."
        );
    }

    await cargarSdk();

    if(iniciado) {
        return;
    }

    window.google.accounts.id.initialize({
        client_id: CONFIG.googleClientId.trim(),
        callback: respuesta => {
            if(respuesta && respuesta.credential) {
                guardarToken(respuesta.credential);

                if(resolverLogin) {
                    resolverLogin(true);
                    resolverLogin = null;
                }
            }
        },
        auto_select: false,
        cancel_on_tap_outside: true
    });

    iniciado = true;
}

/**
 * Dibuja el boton oficial de Google dentro del contenedor dado.
 * Google exige usar su boton: no se puede disparar el login desde un boton propio.
 */
export async function dibujarBoton(contenedor, opciones = {}) {
    await iniciar();

    contenedor.innerHTML = "";

    window.google.accounts.id.renderButton(contenedor, {
        type: "standard",
        theme: "filled_black",
        size: "large",
        text: opciones.texto || "signin_with",
        shape: "pill",
        locale: "es",
        width: opciones.ancho || 260
    });
}

/** Promesa que se resuelve cuando el usuario termina de loguearse. */
export function esperarLogin() {
    if(haySesion()) {
        return Promise.resolve(true);
    }

    return new Promise(resolver => {
        resolverLogin = resolver;
    });
}

export function salir() {
    cerrarSesion();

    try {
        if(window.google && window.google.accounts && window.google.accounts.id) {
            window.google.accounts.id.disableAutoSelect();
        }
    } catch {
        // El SDK puede no haberse cargado nunca.
    }
}
