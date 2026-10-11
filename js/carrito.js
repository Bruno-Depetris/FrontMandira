/**
 * Carrito local. Vive en localStorage hasta que se confirma la compra:
 * recien ahi se escriben Carrito + DetalleCarrito + Compra en la API.
 *
 * El tope de stock se aplica aca y no en el input del formulario: el atributo
 * `max` de un input solo lo respeta la validacion nativa de un formulario, no un
 * boton que lee `.value`. Por eso antes se podian pedir 33333 unidades de algo
 * que tenia una. La API tambien lo valida, porque esto es el navegador del
 * cliente y no se le puede creer.
 *
 * Cada item guarda el stock que tenia el producto al agregarlo, para poder topear
 * sin volver a pedir el catalogo.
 */
const CLAVE = "mandira.tienda.carrito";
const oyentes = new Set();

let items = leer();

function leer() {
    try {
        const crudo = localStorage.getItem(CLAVE);

        if(!crudo) {
            return [];
        }

        const datos = JSON.parse(crudo);
        return Array.isArray(datos) ? datos.filter(esItemValido) : [];
    } catch {
        return [];
    }
}

function esItemValido(item) {
    return item
        && Number.isInteger(item.productoId)
        && typeof item.cantidad === "number"
        && item.cantidad > 0;
}

/** Stock disponible de un item, o null si el producto no lleva inventario. */
function topeDe(item) {
    return typeof item.stock === "number" ? item.stock : null;
}

/**
 * Recorta una cantidad al stock disponible.
 * Devuelve { cantidad, topeado, tope }: topeado dice si hubo que recortar, para
 * que la vista pueda avisarlo en lugar de cambiar el numero en silencio.
 */
function recortar(cantidad, tope) {
    const pedida = Math.max(1, Math.floor(Number(cantidad) || 0));

    if(tope === null || tope === undefined) {
        return { cantidad: pedida, topeado: false, tope: null };
    }

    if(tope <= 0) {
        return { cantidad: 0, topeado: true, tope: 0 };
    }

    return pedida > tope
        ? { cantidad: tope, topeado: true, tope }
        : { cantidad: pedida, topeado: false, tope };
}

function guardar() {
    try {
        localStorage.setItem(CLAVE, JSON.stringify(items));
    } catch {
        // Sin almacenamiento el carrito dura lo que dure la pagina.
    }

    for(const oyente of oyentes) {
        oyente(items);
    }
}

export function alCambiarCarrito(oyente) {
    oyentes.add(oyente);
    return () => oyentes.delete(oyente);
}

export function obtenerItems() {
    return items.map(item => ({ ...item }));
}

export function cantidadTotal() {
    return items.reduce((suma, item) => suma + item.cantidad, 0);
}

export function importeTotal() {
    return items.reduce((suma, item) => suma + (item.precio * item.cantidad), 0);
}

export function cantidadDe(productoId) {
    const item = items.find(actual => actual.productoId === productoId);
    return item ? item.cantidad : 0;
}

/**
 * Suma unidades al carrito, sin pasar el stock.
 * Devuelve { cantidad, topeado, tope } con lo que realmente quedo en el carrito.
 */
export function agregar(producto, cantidad = 1) {
    const tope = typeof producto.stock === "number" ? producto.stock : null;
    const existente = items.find(item => item.productoId === producto.id);
    const yaHabia = existente ? existente.cantidad : 0;
    const resultado = recortar(yaHabia + cantidad, tope);

    if(resultado.cantidad === 0) {
        if(existente) {
            quitar(producto.id);
        }

        return resultado;
    }

    if(existente) {
        existente.cantidad = resultado.cantidad;
        existente.precio = producto.precio;
        existente.stock = tope;
    } else {
        items.push({
            productoId: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: resultado.cantidad,
            stock: tope
        });
    }

    guardar();
    return resultado;
}

/**
 * Fija la cantidad de un item, sin pasar su stock.
 * Devuelve { cantidad, topeado, tope }, o null si el item no esta en el carrito.
 */
export function fijarCantidad(productoId, cantidad) {
    const item = items.find(actual => actual.productoId === productoId);

    if(!item) {
        return null;
    }

    if(cantidad <= 0) {
        quitar(productoId);
        return { cantidad: 0, topeado: false, tope: topeDe(item) };
    }

    const resultado = recortar(cantidad, topeDe(item));

    if(resultado.cantidad === 0) {
        quitar(productoId);
        return resultado;
    }

    item.cantidad = resultado.cantidad;
    guardar();
    return resultado;
}

/**
 * Pone al dia el stock y el precio guardados con lo que dice el catalogo hoy, y
 * recorta lo que ya no alcanza. Se llama al abrir el carrito y el checkout: el
 * carrito vive en localStorage y puede tener dias, con stock que ya cambio.
 *
 * Devuelve la lista de ajustes para poder avisarlos.
 */
export function sincronizarConCatalogo(porId) {
    const ajustes = [];
    const quedan = [];

    for(const item of items) {
        const producto = porId.get(item.productoId);

        if(!producto) {
            ajustes.push({ nombre: item.nombre, motivo: "ya no esta disponible" });
            continue;
        }

        const tope = typeof producto.stock === "number" ? producto.stock : null;
        const resultado = recortar(item.cantidad, tope);

        if(resultado.cantidad === 0) {
            ajustes.push({ nombre: producto.nombre, motivo: "se quedo sin stock" });
            continue;
        }

        if(resultado.topeado) {
            ajustes.push({
                nombre: producto.nombre,
                motivo: "quedaban " + resultado.tope + ", se ajusto la cantidad"
            });
        }

        quedan.push({
            ...item,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: resultado.cantidad,
            stock: tope
        });
    }

    items = quedan;
    guardar();
    return ajustes;
}

export function quitar(productoId) {
    items = items.filter(item => item.productoId !== productoId);
    guardar();
}

export function vaciar() {
    items = [];
    guardar();
}
