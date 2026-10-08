/**
 * Guarda el token de la sesion y lo deja disponible para el cliente HTTP.
 * Sirve igual para el id_token de Google y para el que emite la API cuando
 * el cliente entra con correo y contrasena.
 *
 * Vive aparte de auth.js para que api.js pueda leer el token sin depender
 * del SDK de Google (y sin importaciones circulares).
 *
 * Se guarda en sessionStorage (dura lo que dura la pestaña) salvo que el
 * usuario pida que lo recordemos, y ahi pasa a localStorage.
 */
const CLAVE_TOKEN = "mandira.tienda.token";
const oyentes = new Set();

let token = leerGuardado();

function leerGuardado() {
    for(const deposito of depositos()) {
        try {
            const guardado = deposito.getItem(CLAVE_TOKEN);

            if(guardado) {
                return guardado;
            }
        } catch {
            // Deposito bloqueado: se prueba el siguiente.
        }
    }

    return null;
}

function depositos() {
    const lista = [];

    try {
        lista.push(sessionStorage);
    } catch {
        // sin sessionStorage
    }

    try {
        lista.push(localStorage);
    } catch {
        // sin localStorage
    }

    return lista;
}

function olvidarEnTodos() {
    for(const deposito of depositos()) {
        try {
            deposito.removeItem(CLAVE_TOKEN);
        } catch {
            // nada que limpiar
        }
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

export function guardarToken(nuevo, recordar = false) {
    token = nuevo;
    olvidarEnTodos();

    try {
        const deposito = recordar ? localStorage : sessionStorage;
        deposito.setItem(CLAVE_TOKEN, nuevo);
    } catch {
        // Sin almacenamiento la sesion dura lo que dure la pagina.
    }

    avisar();
}

export function cerrarSesion() {
    token = null;
    olvidarEnTodos();
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
