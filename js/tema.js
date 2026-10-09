/**
 * Modo dia y noche.
 *
 * El tema se estampa como data-tema en <html> y el CSS resuelve todo desde ahi.
 * Si el usuario nunca eligio, se sigue la preferencia del sistema y se queda
 * escuchando: cambiar el tema del telefono cambia la pagina. En cuanto elige,
 * su eleccion manda y deja de escucharse.
 *
 * El estampado inicial lo hace un script en linea en el <head>, antes de pintar,
 * para que no se vea un parpadeo claro al entrar de noche.
 */
const CLAVE = "mandira.tienda.tema";
const oyentes = new Set();

const consulta = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

export function temaElegido() {
    try {
        const guardado = localStorage.getItem(CLAVE);
        return guardado === "claro" || guardado === "oscuro" ? guardado : null;
    } catch {
        return null;
    }
}

export function temaDelSistema() {
    return consulta && consulta.matches ? "oscuro" : "claro";
}

export function temaActual() {
    return document.documentElement.dataset.tema === "oscuro" ? "oscuro" : "claro";
}

function aplicar(tema) {
    document.documentElement.dataset.tema = tema;

    for(const oyente of oyentes) {
        oyente(tema);
    }
}

export function fijarTema(tema) {
    try {
        localStorage.setItem(CLAVE, tema);
    } catch {
        // Sin almacenamiento la eleccion dura lo que dure la pagina.
    }

    aplicar(tema);
}

export function alternarTema() {
    const siguiente = temaActual() === "oscuro" ? "claro" : "oscuro";
    fijarTema(siguiente);
    return siguiente;
}

export function alCambiarTema(oyente) {
    oyentes.add(oyente);
    return () => oyentes.delete(oyente);
}

export function iniciarTema() {
    aplicar(temaElegido() || temaDelSistema());

    if(consulta && consulta.addEventListener) {
        consulta.addEventListener("change", () => {
            // Solo sigue al sistema mientras el usuario no haya elegido.
            if(!temaElegido()) {
                aplicar(temaDelSistema());
            }
        });
    }
}

/**
 * Conecta un boton al cambio de tema y le mantiene el texto y el aria-label al dia.
 */
export function conectarBotonDeTema(boton) {
    if(!boton) {
        return;
    }

    function refrescar() {
        const oscuro = temaActual() === "oscuro";

        boton.textContent = oscuro ? "Modo claro" : "Modo oscuro";
        boton.setAttribute("aria-label", oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
        boton.setAttribute("aria-pressed", String(oscuro));
    }

    boton.addEventListener("click", () => alternarTema());
    alCambiarTema(refrescar);
    refrescar();
}
