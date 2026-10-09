import { api, urlDeImagen } from "./api.js";

/**
 * Cache del catalogo. La tienda pide todo junto una sola vez y despues
 * resuelve categorias, fotos y stock en memoria.
 */
let cache = null;
let enVuelo = null;

export function invalidar() {
    cache = null;
    enVuelo = null;
}

export function cargarCatalogo() {
    if(cache) {
        return Promise.resolve(cache);
    }

    if(enVuelo) {
        return enVuelo;
    }

    enVuelo = construir()
        .then(datos => {
            cache = datos;
            enVuelo = null;
            return datos;
        })
        .catch(error => {
            enVuelo = null;
            throw error;
        });

    return enVuelo;
}

async function construir() {
    const [productos, categorias, subcategorias, fotos, disponibilidad] = await Promise.all([
        api.productos(),
        api.categorias(),
        api.subcategorias(),
        api.fotos().catch(() => []),
        api.disponibilidad().catch(() => [])
    ]);

    const fotosPorProducto = new Map();

    // La galeria se respeta en el orden que fijo el panel; la primera es la principal.
    const ordenadas = [...fotos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.id - b.id);

    for(const foto of ordenadas) {
        if(!fotosPorProducto.has(foto.productoId)) {
            fotosPorProducto.set(foto.productoId, []);
        }

        fotosPorProducto.get(foto.productoId).push(urlDeImagen(foto.direccionUrl));
    }

    const stockPorProducto = new Map();

    for(const fila of disponibilidad) {
        stockPorProducto.set(fila.productoId, fila.cantidad);
    }

    const subPorId = new Map(subcategorias.map(sub => [sub.id, sub]));
    const catPorId = new Map(categorias.map(cat => [cat.id, cat]));

    // Solo se muestran los productos publicados: `publicado` es la bandera de vidriera.
    const visibles = productos
        .filter(producto => producto.publicado)
        .map(producto => {
            const sub = subPorId.get(producto.subCategoriaId) || null;
            const cat = sub ? catPorId.get(sub.categoriaId) || null : null;

            return {
                ...producto,
                subCategoria: sub,
                categoria: cat,
                fotos: fotosPorProducto.get(producto.id) || [],
                // Sin registros de stock se asume disponible: la tienda no deberia
                // esconder un producto publicado solo porque nadie cargo el stock.
                stock: stockPorProducto.has(producto.id) ? stockPorProducto.get(producto.id) : null
            };
        });

    return {
        productos: visibles,
        categorias,
        subcategorias,
        porId: new Map(visibles.map(producto => [producto.id, producto]))
    };
}

export function hayStock(producto) {
    return producto.stock === null || producto.stock > 0;
}
