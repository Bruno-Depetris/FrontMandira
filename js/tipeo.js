/**
 * Efecto de maquina de escribir para el titulo de la portada.
 *
 * Escribe una frase letra por letra, la deja quieta un momento, la borra y pasa
 * a la siguiente. Con una sola frase la escribe y la deja: no tendria sentido
 * borrar algo que no se va a reemplazar por nada distinto.
 *
 * Dos cuidados que no son decorativos:
 *
 * - El elemento reserva de entrada el alto de la frase mas larga. Si no, la
 *   pagina entera salta hacia arriba y hacia abajo en cada ciclo, porque un
 *   titulo de dos renglones pasa a uno mientras se borra.
 * - El texto completo queda en el DOM para quien use un lector de pantalla
 *   (en un elemento visualmente oculto), y lo que se anima se marca
 *   `aria-hidden`. Leer letra por letra no es leer.
 *
 * Con `prefers-reduced-motion` no hay animacion: se muestra la primera frase y
 * listo.
 */

const VELOCIDAD_ESCRITURA = 55;
const VELOCIDAD_BORRADO = 28;
const PAUSA_COMPLETA = 2200;
const PAUSA_VACIA = 400;

/**
 * @param elemento  el <h1> donde va el titulo
 * @param frases    una o varias; una sola no rota
 * @returns una funcion para frenarlo (al cambiar de pantalla)
 */
export function tipear(elemento, frases) {
    const limpias = (frases || []).map(f => String(f).trim()).filter(Boolean);

    if(!elemento || limpias.length === 0) {
        return () => {};
    }

    // El texto accesible va completo, no letra por letra.
    elemento.textContent = "";
    const paraLectores = document.createElement("span");
    paraLectores.className = "solo-lectores";
    paraLectores.textContent = limpias.join(". ");

    const visible = document.createElement("span");
    visible.className = "tipeo";
    visible.setAttribute("aria-hidden", "true");

    elemento.append(paraLectores, visible);

    const quietoPorPreferencia = window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if(quietoPorPreferencia || limpias.length === 0) {
        visible.textContent = limpias[0];
        return () => {};
    }

    reservarAlto(elemento, visible, limpias);

    let vivo = true;
    let temporizador = null;

    function esperar(ms, seguir) {
        temporizador = window.setTimeout(() => {
            if(vivo) {
                seguir();
            }
        }, ms);
    }

    function escribir(indice, letras) {
        const frase = limpias[indice];

        if(letras <= frase.length) {
            visible.textContent = frase.slice(0, letras);
            esperar(VELOCIDAD_ESCRITURA, () => escribir(indice, letras + 1));
            return;
        }

        // Una sola frase se escribe y se queda: no hay a que pasar.
        if(limpias.length === 1) {
            return;
        }

        esperar(PAUSA_COMPLETA, () => borrar(indice, frase.length));
    }

    function borrar(indice, letras) {
        if(letras > 0) {
            visible.textContent = limpias[indice].slice(0, letras - 1);
            esperar(VELOCIDAD_BORRADO, () => borrar(indice, letras - 1));
            return;
        }

        esperar(PAUSA_VACIA, () => escribir((indice + 1) % limpias.length, 1));
    }

    escribir(0, 1);

    return () => {
        vivo = false;
        window.clearTimeout(temporizador);
    };
}

/**
 * Mide cuanto ocupa la frase mas alta y lo fija como minimo, para que el resto
 * de la pagina no se mueva mientras el texto crece y se borra.
 */
function reservarAlto(elemento, visible, frases) {
    let maximo = 0;

    for(const frase of frases) {
        visible.textContent = frase;
        maximo = Math.max(maximo, elemento.offsetHeight);
    }

    visible.textContent = "";
    elemento.style.minHeight = maximo + "px";
}
