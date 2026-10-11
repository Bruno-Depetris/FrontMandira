/**
 * Cinta de anuncios arriba de la pagina.
 *
 * Los mensajes los escribe el panel y se guardan en la API, asi que cambiar la
 * promo del fin de semana no toca el codigo. Si hay varios activos, rotan solos;
 * si hay uno, queda quieto; si no hay ninguno, la cinta no existe.
 *
 * Si la API no responde, la cinta simplemente no aparece: un anuncio no vale
 * romper la tienda.
 */
import { api } from "./api.js";
import { esc } from "./ui.js";

const CADA = 5000;

export async function montarAnuncios(contenedor) {
    if(!contenedor) {
        return;
    }

    let anuncios;

    try {
        anuncios = await api.anuncios();
    } catch {
        contenedor.hidden = true;
        return;
    }

    const activos = (anuncios || [])
        .filter(anuncio => anuncio.activo && String(anuncio.texto || "").trim() !== "")
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.id - b.id);

    if(activos.length === 0) {
        contenedor.hidden = true;
        return;
    }

    contenedor.hidden = false;
    contenedor.innerHTML =
        '<div class="cinta-interior">' +
        activos.map((anuncio, indice) => {
            const texto = esc(anuncio.texto.trim());
            const cuerpo = anuncio.enlace
                ? '<a href="' + esc(anuncio.enlace) + '">' + texto + "</a>"
                : texto;

            return '<p class="anuncio' + (indice === 0 ? " visible" : "") + '">' + cuerpo + "</p>";
        }).join("") +
        "</div>";

    if(activos.length === 1) {
        return;
    }

    const mensajes = [...contenedor.querySelectorAll(".anuncio")];
    let actual = 0;

    // Sin animaciones: se enciende uno y se apagan los demas. Es lo que menos
    // molesta en una barra que esta siempre a la vista.
    window.setInterval(() => {
        mensajes[actual].classList.remove("visible");
        actual = (actual + 1) % mensajes.length;
        mensajes[actual].classList.add("visible");
    }, CADA);
}
