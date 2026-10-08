/**
 * Configuracion de la tienda. Es el unico archivo que hay que tocar para
 * apuntar a otra API o cambiar el numero de WhatsApp.
 */
export const CONFIG = {
    /** URL base de MandiraApiREST. Se puede pisar desde la consola con localStorage. */
    apiUrl: "https://mandiraapirest.up.railway.app",

    /**
     * Client ID de OAuth de Google Cloud Console (tipo "Aplicacion web").
     * Sin esto el login no funciona. Ver README.md para los pasos.
     * Tiene que ser EL MISMO valor que Google__ClientId en la API.
     */
    googleClientId: "",

    /** Numero al que se manda el pedido, con codigo de pais y sin signos. */
    whatsapp: "543564567771",

    /** Datos de la marca que se muestran en la tienda. */
    marca: {
        nombre: "Mandira",
        lema: "Diseño que te acompaña",
        descripcion: "Mochilas y carteras pensadas para todos los días."
    }
};

const CLAVE_API = "mandira.tienda.apiUrl";

/** Permite probar contra una API local sin editar este archivo. */
export function urlApi() {
    try {
        return localStorage.getItem(CLAVE_API) || CONFIG.apiUrl;
    } catch {
        return CONFIG.apiUrl;
    }
}

export function fijarUrlApi(url) {
    try {
        const limpia = (url || "").trim().replace(/\/+$/, "");

        if(limpia === "") {
            localStorage.removeItem(CLAVE_API);
        } else {
            localStorage.setItem(CLAVE_API, limpia);
        }
    } catch {
        // Almacenamiento bloqueado: se sigue usando CONFIG.apiUrl.
    }
}
