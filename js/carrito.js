/**
 * Carrito local. Vive en localStorage hasta que se confirma la compra:
 * recien ahi se escriben Carrito + DetalleCarrito + Compra en la API.
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

export function agregar(producto, cantidad = 1) {
    const existente = items.find(item => item.productoId === producto.id);

    if(existente) {
        existente.cantidad += cantidad;
        existente.precio = producto.precio;
    } else {
        items.push({
            productoId: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad
        });
    }

    guardar();
}

export function fijarCantidad(productoId, cantidad) {
    const item = items.find(actual => actual.productoId === productoId);

    if(!item) {
        return;
    }

    if(cantidad <= 0) {
        quitar(productoId);
        return;
    }

    item.cantidad = cantidad;
    guardar();
}

export function quitar(productoId) {
    items = items.filter(item => item.productoId !== productoId);
    guardar();
}

export function vaciar() {
    items = [];
    guardar();
}
