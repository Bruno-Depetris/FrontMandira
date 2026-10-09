import { CONFIG } from "../config.js";
import { cargarCatalogo, hayStock } from "./datos.js";
import { agregar } from "./carrito.js";
import { esc, moneda, cargando, panelError, vacio, aviso } from "./ui.js";

const SIN_FOTO = "Assets/isologo.png";

function imagenDe(producto) {
    return producto.fotos.length > 0 ? producto.fotos[0] : SIN_FOTO;
}

function tarjeta(producto) {
    const agotado = !hayStock(producto);
    const imagen = imagenDe(producto);
    const esPlaceholder = producto.fotos.length === 0;

    return (
        '<article class="tarjeta' + (agotado ? " agotada" : "") + '">' +
        '<a class="tarjeta-imagen" href="#/producto/' + producto.id + '">' +
        '<img src="' + esc(imagen) + '" alt="' + esc(producto.nombre) + '"' +
        (esPlaceholder ? ' class="placeholder"' : "") + ' loading="lazy"' +
        ' onerror="this.onerror=null;this.src=\'' + SIN_FOTO + '\';this.classList.add(\'placeholder\')">' +
        (agotado ? '<span class="etiqueta-agotado">Sin stock</span>' : "") +
        "</a>" +
        '<div class="tarjeta-cuerpo">' +
        (producto.categoria ? '<p class="tarjeta-rubro">' + esc(producto.categoria.nombre) + "</p>" : "") +
        '<h3><a href="#/producto/' + producto.id + '">' + esc(producto.nombre) + "</a></h3>" +
        '<p class="tarjeta-precio">' + moneda(producto.precio) + "</p>" +
        '<button class="boton-sutil" data-agregar="' + producto.id + '"' + (agotado ? " disabled" : "") + ">" +
        (agotado ? "Sin stock" : "Agregar") +
        "</button>" +
        "</div></article>"
    );
}

function conectarBotonesAgregar(raiz, porId) {
    raiz.addEventListener("click", evento => {
        const boton = evento.target.closest("[data-agregar]");

        if(!boton) {
            return;
        }

        const producto = porId.get(Number(boton.dataset.agregar));

        if(!producto) {
            return;
        }

        agregar(producto, 1);
        aviso(producto.nombre + " se agregó al carrito.", "exito");
    });
}

// ------------------------------------------------------------------ inicio

export async function vistaInicio(contenedor) {
    // Hero 7/5: el titulo a la izquierda y a la derecha una tarjeta con un producto
    // real adentro. El sistema pide mostrar el producto, no una ilustracion de el.
    contenedor.innerHTML =
        '<section class="hero">' +
        '<div class="hero-texto">' +
        "<h1>" + esc(CONFIG.marca.lema) + "</h1>" +
        "<p>" + esc(CONFIG.marca.descripcion) + "</p>" +
        '<div class="hero-acciones">' +
        '<a class="boton-primario" href="#/catalogo">Ver catálogo</a>' +
        '<a class="boton-sutil" href="#/cuenta">Crear mi cuenta</a>' +
        "</div></div>" +
        '<div class="hero-artefacto" id="heroArtefacto">' +
        '<div class="hero-artefacto-cabecera">' +
        '<img src="' + SIN_FOTO + '" alt=""><span>Recién llegado</span></div>' +
        '<div class="hero-esqueleto"></div>' +
        "</div></section>" +
        '<section class="seccion"><h2>Destacados</h2><div id="destacados">' + cargando() + "</div></section>";

    const zona = contenedor.querySelector("#destacados");
    const artefacto = contenedor.querySelector("#heroArtefacto");

    try {
        const catalogo = await cargarCatalogo();

        if(catalogo.productos.length === 0) {
            artefacto.remove();
            zona.innerHTML = vacio(
                "Todavía no hay productos publicados",
                "Volvé en un rato: estamos cargando la colección."
            );
            return;
        }

        llenarArtefacto(artefacto, catalogo);
        conectarBotonesAgregar(artefacto, catalogo.porId);

        const destacados = catalogo.productos.slice(0, 8);
        zona.innerHTML = '<div class="grilla">' + destacados.map(tarjeta).join("") + "</div>";
        conectarBotonesAgregar(zona, catalogo.porId);
    } catch(error) {
        artefacto.remove();
        zona.innerHTML = panelError("No pudimos cargar los productos", error.message);
    }
}

/**
 * Pone dentro de la tarjeta del hero el primer producto que tenga foto, y si
 * ninguno la tiene, el primero igual. Debajo, las categorias como insignias.
 */
function llenarArtefacto(artefacto, catalogo) {
    const conFoto = catalogo.productos.find(producto => producto.fotos.length > 0);
    const elegido = conFoto || catalogo.productos[0];
    const usadas = new Set(catalogo.productos.map(p => p.categoria && p.categoria.nombre).filter(Boolean));

    artefacto.querySelector(".hero-esqueleto").outerHTML =
        tarjeta(elegido) +
        (usadas.size > 0
            ? '<div class="hero-rubros">' +
              [...usadas].slice(0, 4).map(nombre => '<span class="insignia">' + esc(nombre) + "</span>").join("") +
              "</div>"
            : "");
}

// ------------------------------------------------------------------ catalogo

export async function vistaCatalogo(contenedor, parametros) {
    contenedor.innerHTML =
        '<section class="seccion"><header class="cabecera-seccion"><h2>Catálogo</h2>' +
        '<input type="search" id="busqueda" placeholder="Buscar un producto…" value="' +
        esc(parametros.q || "") + '"></header>' +
        '<div class="disposicion-catalogo"><aside id="filtros"></aside>' +
        '<div id="resultados">' + cargando() + "</div></div></section>";

    const zonaFiltros = contenedor.querySelector("#filtros");
    const zonaResultados = contenedor.querySelector("#resultados");
    const campoBusqueda = contenedor.querySelector("#busqueda");

    let catalogo;

    try {
        catalogo = await cargarCatalogo();
    } catch(error) {
        zonaResultados.innerHTML = panelError("No pudimos cargar el catálogo", error.message);
        return;
    }

    const estado = {
        categoria: parametros.categoria ? Number(parametros.categoria) : null,
        subcategoria: parametros.subcategoria ? Number(parametros.subcategoria) : null,
        texto: (parametros.q || "").toLowerCase()
    };

    function dibujarFiltros() {
        const usadas = new Set(catalogo.productos.map(p => p.categoria && p.categoria.id).filter(Boolean));
        const categorias = catalogo.categorias.filter(cat => usadas.has(cat.id));

        let html = "<h3>Categorías</h3><ul class='lista-filtros'>";
        html += '<li><button data-categoria="" class="' + (estado.categoria === null ? "activo" : "") + '">Todas</button></li>';

        for(const categoria of categorias) {
            const activa = estado.categoria === categoria.id;
            html += '<li><button data-categoria="' + categoria.id + '" class="' + (activa ? "activo" : "") + '">' +
                esc(categoria.nombre) + "</button>";

            if(activa) {
                const subs = catalogo.subcategorias.filter(sub => sub.categoriaId === categoria.id);
                html += "<ul class='lista-subfiltros'>";
                html += '<li><button data-subcategoria="" class="' + (estado.subcategoria === null ? "activo" : "") + '">Todas</button></li>';

                for(const sub of subs) {
                    html += '<li><button data-subcategoria="' + sub.id + '" class="' +
                        (estado.subcategoria === sub.id ? "activo" : "") + '">' + esc(sub.nombre) + "</button></li>";
                }

                html += "</ul>";
            }

            html += "</li>";
        }

        html += "</ul>";
        zonaFiltros.innerHTML = html;
    }

    function filtrar() {
        return catalogo.productos.filter(producto => {
            if(estado.categoria !== null && (!producto.categoria || producto.categoria.id !== estado.categoria)) {
                return false;
            }

            if(estado.subcategoria !== null && producto.subCategoriaId !== estado.subcategoria) {
                return false;
            }

            if(estado.texto !== "") {
                const heno = (producto.nombre + " " + (producto.descripcion || "")).toLowerCase();

                if(!heno.includes(estado.texto)) {
                    return false;
                }
            }

            return true;
        });
    }

    function dibujarResultados() {
        const encontrados = filtrar();

        if(encontrados.length === 0) {
            zonaResultados.innerHTML = vacio(
                "No encontramos nada",
                "Probá con otra búsqueda o quitá los filtros."
            );
            return;
        }

        zonaResultados.innerHTML =
            '<p class="conteo">' + encontrados.length + (encontrados.length === 1 ? " producto" : " productos") + "</p>" +
            '<div class="grilla">' + encontrados.map(tarjeta).join("") + "</div>";
    }

    function refrescar() {
        dibujarFiltros();
        dibujarResultados();
    }

    zonaFiltros.addEventListener("click", evento => {
        const boton = evento.target.closest("button[data-categoria], button[data-subcategoria]");

        if(!boton) {
            return;
        }

        if(boton.dataset.categoria !== undefined) {
            estado.categoria = boton.dataset.categoria === "" ? null : Number(boton.dataset.categoria);
            estado.subcategoria = null;
        } else {
            estado.subcategoria = boton.dataset.subcategoria === "" ? null : Number(boton.dataset.subcategoria);
        }

        refrescar();
    });

    let temporizador = null;

    campoBusqueda.addEventListener("input", () => {
        window.clearTimeout(temporizador);
        temporizador = window.setTimeout(() => {
            estado.texto = campoBusqueda.value.trim().toLowerCase();
            dibujarResultados();
        }, 180);
    });

    conectarBotonesAgregar(zonaResultados, catalogo.porId);
    refrescar();
}

// ------------------------------------------------------------------ detalle

export async function vistaProducto(contenedor, parametros) {
    contenedor.innerHTML = cargando("Buscando el producto");

    let catalogo;

    try {
        catalogo = await cargarCatalogo();
    } catch(error) {
        contenedor.innerHTML = panelError("No pudimos cargar el producto", error.message);
        return;
    }

    const producto = catalogo.porId.get(Number(parametros.id));

    if(!producto) {
        contenedor.innerHTML = vacio(
            "No encontramos ese producto",
            "Puede que ya no esté publicado.",
            '<a class="boton-primario" href="#/catalogo">Volver al catálogo</a>'
        );
        return;
    }

    const agotado = !hayStock(producto);
    const imagenes = producto.fotos.length > 0 ? producto.fotos : [SIN_FOTO];

    contenedor.innerHTML =
        '<nav class="miga"><a href="#/catalogo">Catálogo</a>' +
        (producto.categoria ? " / " + esc(producto.categoria.nombre) : "") +
        (producto.subCategoria ? " / " + esc(producto.subCategoria.nombre) : "") +
        "</nav>" +
        '<section class="detalle">' +
        '<div class="detalle-galeria">' +
        '<img id="fotoPrincipal" src="' + esc(imagenes[0]) + '" alt="' + esc(producto.nombre) + '"' +
        (producto.fotos.length === 0 ? ' class="placeholder"' : "") +
        ' onerror="this.onerror=null;this.src=\'' + SIN_FOTO + '\';this.classList.add(\'placeholder\')">' +
        (imagenes.length > 1
            ? '<div class="miniaturas">' + imagenes.map((url, indice) =>
                '<button data-foto="' + esc(url) + '" class="' + (indice === 0 ? "activa" : "") + '">' +
                '<img src="' + esc(url) + '" alt=""></button>').join("") + "</div>"
            : "") +
        "</div>" +
        '<div class="detalle-info">' +
        (producto.categoria ? '<p class="tarjeta-rubro">' + esc(producto.categoria.nombre) + "</p>" : "") +
        "<h1>" + esc(producto.nombre) + "</h1>" +
        '<p class="detalle-precio">' + moneda(producto.precio) + "</p>" +
        (producto.descripcion
            ? '<p class="detalle-descripcion">' + esc(producto.descripcion) + "</p>"
            : '<p class="detalle-descripcion vacia">Sin descripción.</p>') +
        (agotado
            ? '<p class="marca-agotado">Por ahora no tenemos stock de este producto.</p>'
            : '<div class="detalle-compra">' +
              '<label for="cantidad">Cantidad</label>' +
              '<input type="number" id="cantidad" value="1" min="1" max="' +
              (producto.stock === null ? 99 : producto.stock) + '">' +
              '<button class="boton-primario" id="botonAgregar">Agregar al carrito</button>' +
              "</div>" +
              (producto.stock !== null && producto.stock <= 5
                  ? '<p class="poco-stock">Quedan ' + producto.stock + " unidades.</p>"
                  : "")) +
        "</div></section>";

    const miniaturas = contenedor.querySelector(".miniaturas");

    if(miniaturas) {
        miniaturas.addEventListener("click", evento => {
            const boton = evento.target.closest("button[data-foto]");

            if(!boton) {
                return;
            }

            contenedor.querySelector("#fotoPrincipal").src = boton.dataset.foto;

            for(const otra of miniaturas.querySelectorAll("button")) {
                otra.classList.toggle("activa", otra === boton);
            }
        });
    }

    const botonAgregar = contenedor.querySelector("#botonAgregar");

    if(botonAgregar) {
        botonAgregar.addEventListener("click", () => {
            const campo = contenedor.querySelector("#cantidad");
            const cantidad = Math.max(1, Number.parseInt(campo.value, 10) || 1);

            agregar(producto, cantidad);
            aviso(producto.nombre + " se agregó al carrito.", "exito");
        });
    }
}
