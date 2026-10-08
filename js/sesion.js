/**
 * Guarda el id_token de Google y lo deja disponible para el cliente HTTP.
 * Vive aparte de auth.js para que api.js pueda leer el token sin depender
 * del SDK de Google (y sin importaciones circulares).
 */
const CLAVE_TOKEN = "mandira.tienda.token";
const oyentes = new Set();

let token = leerGuardado();

function leerGuardado() {
    try {
        return sessionStorage.getItem(CLAVE_TOKEN);
    } catch {
        return null;
    }
}

/** Decodifica el payload del JWT. Solo para mostrar datos: la verdad la valida la API. */
export function datosDelToken(crudo) {
    if(!crudo) {
        return null;
    }

    const partes = crudo.split(".");

    if(partes.length !== 3) {
        return null;
    }

    try {
        const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
        const binaria = atob(base64);
        const bytes = Uint8Array.from(binaria, caracter => caracter.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
        return null;
    }
}

function venció(datos) {
    if(!datos || typeof datos.exp !== "number") {
        return true;
    }

    // Se considera vencido 30 s antes para no mandar un token que expira en pleno viaje.
    return Date.now() >= (datos.exp * 1000) - 30000;
}

export function obtenerToken() {
    if(!token) {
        return null;
    }

    if(venció(datosDelToken(token))) {
        cerrarSesion();
        return null;
    }

    return token;
}

export function usuarioActual() {
    const vigente = obtenerToken();

    if(!vigente) {
        return null;
    }

    const datos = datosDelToken(vigente);

    if(!datos) {
        return null;
    }

    return {
        correo: datos.email,
        nombre: datos.name || datos.email,
        foto: datos.picture || null
    };
}

export function haySesion() {
    return obtenerToken() !== null;
}

export function guardarToken(nuevo) {
    token = nuevo;

    try {
        sessionStorage.setItem(CLAVE_TOKEN, nuevo);
    } catch {
        // Sin almacenamiento la sesion dura lo que dure la pestaña.
    }

    avisar();
}

export function cerrarSesion() {
    token = null;

    try {
        sessionStorage.removeItem(CLAVE_TOKEN);
    } catch {
        // nada que limpiar
    }

    avisar();
}

export function alCambiarSesion(oyente) {
    oyentes.add(oyente);
    return () => oyentes.delete(oyente);
}

function avisar() {
    for(const oyente of oyentes) {
        oyente(usuarioActual());
    }
}
