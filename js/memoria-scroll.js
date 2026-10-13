/**
 * Memoria de la posicion de scroll entre pantallas.
 *
 * El router hacia `scrollTo(0)` en toda navegacion. En un catalogo de 44
 * productos, que en un telefono mide mas de 8.000px, eso significa: bajas
 * buscando, entras a un producto, volves... y apareces arriba de todo, con todo
 * el recorrido por hacer de nuevo. Es la clase de friccion que hace abandonar
 * una compra.
 *
 * La regla es la que espera cualquiera sin pensarla:
 *
 * - Si VOLVES (boton atras del navegador, o el gesto de volver), apareces donde
 *   estabas.
 * - Si vas a una pantalla a proposito (tocando un enlace), empezas arriba. Nadie
 *   quiere entrar al catalogo desde el menu y aparecer en la mitad.
 *
 * La diferencia entre las dos se sabe por `popstate`, que el navegador dispara
 * solo en atras y adelante, nunca cuando el codigo cambia el hash. Esa es toda
 * la señal: no hace falta llevar una pila de historial propia.
 *
 * La logica de decidir esta separada del DOM a proposito, en `decidirDestino`,
 * para poder probarla sin navegador.
 */

/** Cuanto puede haber cambiado el alto de la pagina y aun asi confiar en lo
    guardado. Mas que esto, el contenido es otro y la posicion ya no significa
    lo mismo. */
const TOLERANCIA = 0.35;

/**
 * Decide a que altura dejar la pantalla nueva.
 *
 * @param ruta       la pantalla a la que se va
 * @param memoria    Map de ruta -> { y, alto }
 * @param esVuelta   true si el navegador disparo popstate (atras/adelante)
 * @param altoAhora  alto del documento ya dibujado, para detectar que cambio
 * @returns la posicion en px
 */
export function decidirDestino(ruta, memoria, esVuelta, altoAhora) {
    if(!esVuelta) {
        return 0;
    }

    const guardado = memoria.get(ruta);

    if(!guardado || !(guardado.y > 0)) {
        return 0;
    }

    // Si la pagina cambio de tamaño de forma importante (se publicaron productos,
    // se vacio el carrito), la posicion vieja apunta a otra cosa. Mejor arriba
    // que en un lugar arbitrario.
    if(guardado.alto > 0 && altoAhora > 0) {
        const cambio = Math.abs(altoAhora - guardado.alto) / guardado.alto;

        if(cambio > TOLERANCIA) {
            return 0;
        }
    }

    // Nunca mas abajo de donde se puede llegar.
    return Math.min(guardado.y, Math.max(0, altoAhora - 1));
}

/**
 * Engancha la memoria al documento. Devuelve los dos ganchos que el router
 * necesita llamar: uno antes de cambiar de pantalla y otro despues de dibujarla.
 */
export function crearMemoriaDeScroll(ventana = window) {
    const memoria = new Map();
    let esVuelta = false;

    // Sin esto el navegador tambien intenta restaurar por su cuenta y pelea con
    // lo que hacemos aca.
    if(ventana.history && "scrollRestoration" in ventana.history) {
        ventana.history.scrollRestoration = "manual";
    }

    ventana.addEventListener("popstate", () => {
        esVuelta = true;
    });

    return {
        /** Antes de dibujar la pantalla nueva: guarda donde quedaba la anterior. */
        guardar(ruta) {
            if(ruta == null) {
                return;
            }

            memoria.set(ruta, {
                y: ventana.scrollY,
                alto: ventana.document.documentElement.scrollHeight
            });
        },

        /** Despues de dibujarla: la deja en la altura que corresponde. */
        restaurar(ruta) {
            const alto = ventana.document.documentElement.scrollHeight;
            const destino = decidirDestino(ruta, memoria, esVuelta, alto);

            esVuelta = false;
            ventana.scrollTo({ top: destino, behavior: "instant" });
        }
    };
}
