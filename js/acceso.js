/**
 * Panel de ingreso de la tienda, compartido por "Mi cuenta" y por el checkout.
 *
 * Ofrece los dos caminos que acepta la API: el boton de Google (que devuelve un
 * id_token) y el formulario de correo y contrasena (que pega en /api/Auth y
 * devuelve un token emitido por la API). En los dos casos termina en
 * guardarToken() y se avisa por el callback.
 */
import { api } from "./api.js";
import { guardarToken, alCambiarSesion } from "./sesion.js";
import { dibujarBoton, hayClientIdConfigurado } from "./auth.js";
import { esc } from "./ui.js";

const CAMPOS_REGISTRO = [
    { clave: "nombre", etiqueta: "Nombre y apellido", tipo: "text", requerido: true, autocompletar: "name" },
    { clave: "correo", etiqueta: "Correo", tipo: "email", requerido: true, autocompletar: "email" },
    { clave: "contrasena", etiqueta: "Contraseña", tipo: "password", requerido: true, autocompletar: "new-password", ayuda: "Mínimo 8 caracteres." },
    { clave: "telefono", etiqueta: "Teléfono", tipo: "tel", requerido: false, autocompletar: "tel", ayuda: "Para avisarte por WhatsApp cuando salga tu pedido." },
    { clave: "direccion", etiqueta: "Dirección", tipo: "text", requerido: false, autocompletar: "street-address", ayuda: "Si preferís retirar en el local podés dejarla vacía." }
];

/**
 * Dibuja el panel dentro del contenedor dado.
 * opciones: { titulo, texto, pie, alIngresar }
 *
 * alIngresar se dispara una sola vez, tanto si entro con Google como con
 * contrasena: las dos vias terminan en guardarToken(), asi que se escucha el
 * cambio de sesion en lugar de avisar desde cada camino.
 */
export function panelAcceso(contenedor, opciones = {}) {
    const titulo = opciones.titulo || "Entrá a tu cuenta";
    const texto = opciones.texto || "Mirá tus pedidos y guardá tus datos para comprar más rápido.";

    contenedor.innerHTML =
        '<section class="seccion muro-login">' +
        '<img class="muro-marca" src="Assets/isologo.png" alt="">' +
        "<h2>" + esc(titulo) + "</h2>" +
        "<p>" + esc(texto) + "</p>" +
        '<div class="caja-acceso">' +
        '<div id="zonaGoogle" class="zona-boton-google"></div>' +
        '<p id="avisoGoogle" class="ayuda" hidden></p>' +
        '<div class="separador-o"><span>o</span></div>' +
        '<div class="pestanas-acceso" role="tablist">' +
        '<button type="button" class="pestana-acceso activa" data-modo="login" role="tab">Ya tengo cuenta</button>' +
        '<button type="button" class="pestana-acceso" data-modo="registro" role="tab">Crear cuenta</button>' +
        "</div>" +
        '<div id="zonaFormulario"></div>' +
        "</div>" +
        (opciones.pie || "") +
        "</section>";

    escucharIngreso(contenedor, opciones);
    conectarGoogle(contenedor);
    dibujarFormulario(contenedor, "login");

    for(const pestana of contenedor.querySelectorAll(".pestana-acceso")) {
        pestana.addEventListener("click", () => {
            if(pestana.classList.contains("activa")) {
                return;
            }

            for(const otra of contenedor.querySelectorAll(".pestana-acceso")) {
                otra.classList.toggle("activa", otra === pestana);
            }

            dibujarFormulario(contenedor, pestana.dataset.modo);
        });
    }
}

function escucharIngreso(contenedor, opciones) {
    const dejarDeEscuchar = alCambiarSesion(usuario => {
        if(!usuario) {
            return;
        }

        dejarDeEscuchar();

        // Si el usuario ya se fue a otra vista, este panel quedo viejo y no hay
        // nada que avisar.
        if(!contenedor.isConnected || typeof opciones.alIngresar !== "function") {
            return;
        }

        opciones.alIngresar(usuario);
    });
}

function conectarGoogle(contenedor) {
    const zona = contenedor.querySelector("#zonaGoogle");
    const aviso = contenedor.querySelector("#avisoGoogle");

    if(!hayClientIdConfigurado()) {
        zona.hidden = true;
        aviso.hidden = false;
        aviso.innerHTML = "El ingreso con Google no está configurado. Podés entrar con correo y contraseña.";
        return;
    }

    dibujarBoton(zona, { texto: "continue_with" }).catch(error => {
        zona.hidden = true;
        aviso.hidden = false;
        aviso.textContent = error.message;
    });
}

function dibujarFormulario(contenedor, modo) {
    const zona = contenedor.querySelector("#zonaFormulario");
    const esRegistro = modo === "registro";
    const campos = esRegistro
        ? CAMPOS_REGISTRO
        : [
            { clave: "correo", etiqueta: "Correo", tipo: "email", requerido: true, autocompletar: "email" },
            { clave: "contrasena", etiqueta: "Contraseña", tipo: "password", requerido: true, autocompletar: "current-password" }
        ];

    zona.innerHTML =
        '<form class="form-acceso" id="formAcceso" novalidate>' +
        campos.map(campo =>
            '<div class="campo"><label for="acceso_' + campo.clave + '">' + esc(campo.etiqueta) +
            (campo.requerido ? ' <span class="req">*</span>' : "") + "</label>" +
            '<input type="' + campo.tipo + '" id="acceso_' + campo.clave + '" name="' + campo.clave +
            '" autocomplete="' + campo.autocompletar + '"' + (campo.requerido ? " required" : "") + ">" +
            (campo.ayuda ? '<p class="ayuda">' + esc(campo.ayuda) + "</p>" : "") +
            "</div>").join("") +
        '<label class="campo-casilla"><input type="checkbox" id="acceso_recordar" checked>' +
        "<span>Mantenerme conectado en este dispositivo</span></label>" +
        '<p id="errorAcceso" class="error-form" hidden></p>' +
        '<button type="submit" class="boton-primario" id="botonAcceso">' +
        (esRegistro ? "Crear mi cuenta" : "Ingresar") + "</button>" +
        "</form>";

    const formulario = zona.querySelector("#formAcceso");
    const zonaError = zona.querySelector("#errorAcceso");
    const boton = zona.querySelector("#botonAcceso");

    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();

        const valores = {};

        for(const campo of campos) {
            valores[campo.clave] = zona.querySelector("#acceso_" + campo.clave).value.trim();
        }

        const problema = validar(valores, esRegistro);

        if(problema) {
            mostrarError(zonaError, problema);
            return;
        }

        zonaError.hidden = true;
        boton.disabled = true;
        boton.textContent = esRegistro ? "Creando…" : "Ingresando…";

        try {
            const sesion = esRegistro
                ? await api.registro({
                    correo: valores.correo,
                    contrasena: valores.contrasena,
                    nombre: valores.nombre,
                    direccion: valores.direccion || null,
                    telefono: valores.telefono || null
                })
                : await api.login({ correo: valores.correo, contrasena: valores.contrasena });

            if(!sesion || !sesion.token) {
                throw new Error("La tienda no devolvió una sesión válida.");
            }

            // Dispara el oyente de escucharIngreso(), que es quien avisa.
            guardarToken(sesion.token, zona.querySelector("#acceso_recordar").checked);
        } catch(error) {
            mostrarError(zonaError, error.message);
            boton.disabled = false;
            boton.textContent = esRegistro ? "Crear mi cuenta" : "Ingresar";
        }
    });
}

function validar(valores, esRegistro) {
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valores.correo)) {
        return "Revisá el correo: no parece una dirección válida.";
    }

    if(esRegistro) {
        if(valores.nombre === "") {
            return "Necesitamos tu nombre para preparar el pedido.";
        }

        if(valores.contrasena.length < 8) {
            return "La contraseña tiene que tener al menos 8 caracteres.";
        }

        return null;
    }

    if(valores.contrasena === "") {
        return "Escribí tu contraseña.";
    }

    return null;
}

function mostrarError(zonaError, mensaje) {
    zonaError.textContent = mensaje;
    zonaError.hidden = false;
}
