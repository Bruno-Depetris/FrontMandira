/**
 * Inclinacion de las tarjetas hacia el cursor.
 *
 * El CSS ya hace la elevacion y la sombra; esto solo agrega los dos angulos, en
 * las variables --rx y --ry que la regla :hover de `.tarjeta` consume. Si este
 * archivo no carga, las variables caen en su valor por defecto (0deg) y la
 * tarjeta sigue subiendo: el efecto se degrada, no se rompe.
 *
 * Tres razones por las que no corre siempre:
 *
 * - Sin cursor fino (telefono, tablet) no hay a donde inclinarse, y encima el
 *   navegador deja el :hover pegado despues de tocar.
 * - Con `prefers-reduced-motion` no se inclina nada.
 * - La inclinacion es de 3 grados y no mas. Pasado eso la foto del producto se
 *   deforma y se lee como un truco, que es lo contrario de lo que se busca.
 *
 * El movimiento se escribe dentro de un requestAnimationFrame: `pointermove`
 * dispara mucho mas seguido que los cuadros que la pantalla puede mostrar, y
 * escribir en cada evento es trabajo tirado.
 */

const GRADOS = 3;

export function activarRelieve(contenedor, selector = ".tarjeta") {
    if(!contenedor || !puedeInclinarse()) {
        return () => {};
    }

    let pendiente = null;

    function alMover(evento) {
        const tarjeta = evento.target.closest(selector);

        if(!tarjeta || !contenedor.contains(tarjeta)) {
            return;
        }

        if(pendiente) {
            window.cancelAnimationFrame(pendiente);
        }

        const { clientX, clientY } = evento;

        pendiente = window.requestAnimationFrame(() => {
            pendiente = null;

            const caja = tarjeta.getBoundingClientRect();

            if(caja.width === 0 || caja.height === 0) {
                return;
            }

            // -1 a 1 desde el centro de la tarjeta.
            const x = (clientX - caja.left) / caja.width * 2 - 1;
            const y = (clientY - caja.top) / caja.height * 2 - 1;

            // El eje X se invierte: el mouse arriba tiene que inclinar la tarjeta
            // hacia atras, no hacia adelante.
            tarjeta.style.setProperty("--rx", (-y * GRADOS).toFixed(2) + "deg");
            tarjeta.style.setProperty("--ry", (x * GRADOS).toFixed(2) + "deg");
        });
    }

    function alSalir(evento) {
        const tarjeta = evento.target.closest(selector);

        if(tarjeta) {
            tarjeta.style.setProperty("--rx", "0deg");
            tarjeta.style.setProperty("--ry", "0deg");
        }
    }

    contenedor.addEventListener("pointermove", alMover, { passive: true });
    contenedor.addEventListener("pointerleave", alSalir, { passive: true, capture: true });

    return () => {
        contenedor.removeEventListener("pointermove", alMover);
        contenedor.removeEventListener("pointerleave", alSalir, { capture: true });

        if(pendiente) {
            window.cancelAnimationFrame(pendiente);
        }
    };
}

function puedeInclinarse() {
    if(!window.matchMedia) {
        return false;
    }

    return window.matchMedia("(hover: hover) and (pointer: fine)").matches
        && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
