import { urlApi } from "../config.js";
import { obtenerToken, cerrarSesion } from "./sesion.js";

/**
 * Las fotos subidas al panel guardan una ruta propia y relativa ("/api/Fotos/12/imagen")
 * en lugar de una url absoluta: si se guardara absoluta, cambiar de dominio dejaria
 * todas las fotos rotas. Hay que resolverla contra la API, no contra esta pagina.
 */
export function urlDeImagen(direccion) {
    if(!direccion) {
        return direccion;
    }

    if(direccion.startsWith("/")) {
        return urlApi() + direccion;
    }

    return direccion;
}

export class ErrorApi extends Error {
    constructor(mensaje, estado) {
        super(mensaje);
        this.name = "ErrorApi";
        this.estado = estado;
    }

    get esDeSesion() {
        return this.estado === 401;
    }

    get esDePermisos() {
        return this.estado === 403;
    }
}

async function pedir(metodo, ruta, cuerpo) {
    const configuracion = { method: metodo, headers: {} };
    const token = obtenerToken();

    if(token) {
        configuracion.headers["Authorization"] = "Bearer " + token;
    }

    if(cuerpo !== undefined) {
        configuracion.headers["Content-Type"] = "application/json";
        configuracion.body = JSON.stringify(cuerpo);
    }

    let respuesta;

    try {
        respuesta = await fetch(urlApi() + ruta, configuracion);
    } catch {
        throw new ErrorApi(
            "No se pudo contactar la tienda. Revisá tu conexión o volvé a intentar en un momento.",
            0
        );
    }

    if(respuesta.status === 401) {
        // El token vencio o no es valido: se cierra la sesion para que vuelva a entrar.
        cerrarSesion();
        throw new ErrorApi("Tu sesión expiró. Iniciá sesión de nuevo.", 401);
    }

    if(respuesta.status === 204) {
        return null;
    }

    const texto = await respuesta.text();
    let datos = null;

    if(texto !== "") {
        try {
            datos = JSON.parse(texto);
        } catch {
            datos = null;
        }
    }

    if(!respuesta.ok) {
        throw new ErrorApi(mensajeDeError(datos, respuesta.status), respuesta.status);
    }

    return datos;
}

function mensajeDeError(datos, estado) {
    if(datos && typeof datos.detail === "string" && datos.detail !== "") {
        return datos.detail;
    }

    if(datos && datos.errors) {
        const partes = [];

        for(const campo of Object.keys(datos.errors)) {
            partes.push(datos.errors[campo].join(" "));
        }

        if(partes.length > 0) {
            return partes.join(" ");
        }
    }

    if(estado === 403) {
        return "No tenés permiso para hacer esta acción.";
    }

    if(estado === 404) {
        // Sin "detail" un 404 casi siempre significa que la API publicada es anterior
        // a este endpoint, no que falte el dato.
        return "Esta función todavía no está disponible en el servidor. Volvé a intentar en unos minutos.";
    }

    if(estado === 429) {
        return "Probaste demasiadas veces seguidas. Esperá un minuto y volvé a intentar.";
    }

    return "La tienda respondió con un error (" + estado + ").";
}

export const api = {
    // --- catalogo publico ---
    categorias: () => pedir("GET", "/api/Categorias"),
    subcategorias: () => pedir("GET", "/api/SubCategorias"),
    productos: () => pedir("GET", "/api/Productos"),
    producto: id => pedir("GET", "/api/Productos/" + encodeURIComponent(id)),
    disponibilidad: () => pedir("GET", "/api/Productos/disponibilidad"),
    fotos: () => pedir("GET", "/api/Fotos"),
    formasDePago: () => pedir("GET", "/api/FormaPagos"),
    entregas: () => pedir("GET", "/api/Entregas"),

    // --- cuenta propia (correo y contrasena) ---
    registro: cuerpo => pedir("POST", "/api/Auth/registro", cuerpo),
    login: cuerpo => pedir("POST", "/api/Auth/login", cuerpo),
    cambiarContrasena: cuerpo => pedir("PUT", "/api/Perfil/contrasena", cuerpo),

    // --- sesion ---
    perfil: () => pedir("GET", "/api/Perfil"),
    actualizarPerfil: cuerpo => pedir("PUT", "/api/Perfil", cuerpo),
    misCompras: () => pedir("GET", "/api/Perfil/compras"),

    // --- compra ---
    crearCarrito: cuerpo => pedir("POST", "/api/Carritos", cuerpo),
    crearDetalleCarrito: cuerpo => pedir("POST", "/api/DetalleCarritos", cuerpo),
    crearCompra: cuerpo => pedir("POST", "/api/Compras", cuerpo)
};
