const formateadorMoneda = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2
});

export function esc(valor) {
    if(valor === null || valor === undefined) {
        return "";
    }

    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

export function moneda(valor) {
    return formateadorMoneda.format(Number(valor) || 0);
}

export function aviso(mensaje, tipo = "info") {
    const contenedor = document.getElementById("avisos");
    const elemento = document.createElement("div");

    elemento.className = "aviso aviso-" + tipo;
    elemento.textContent = mensaje;
    contenedor.appendChild(elemento);

    window.setTimeout(() => {
        elemento.classList.add("saliendo");
        window.setTimeout(() => elemento.remove(), 260);
    }, tipo === "error" ? 6000 : 3000);
}

export function cargando(texto = "Cargando") {
    return '<div class="cargando"><span class="girando"></span>' + esc(texto) + "&hellip;</div>";
}

export function panelError(titulo, detalle, accion = "") {
    return (
        '<div class="panel-error"><h3>' + esc(titulo) + "</h3><p>" + esc(detalle) + "</p>" + accion + "</div>"
    );
}

export function vacio(titulo, detalle, accion = "") {
    return (
        '<div class="panel-vacio"><h3>' + esc(titulo) + "</h3><p>" + esc(detalle) + "</p>" + accion + "</div>"
    );
}

/** Convierte una fecha ISO en algo legible, o devuelve vacio si no se puede. */
export function fechaLegible(valor) {
    const fecha = new Date(valor);

    if(Number.isNaN(fecha.getTime())) {
        return "";
    }

    return fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}
