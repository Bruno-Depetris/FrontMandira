/**
 * Pruebas de la memoria de scroll.
 *
 * `decidirDestino` es pura: recibe la ruta, lo guardado, si se esta volviendo y
 * el alto actual, y devuelve un numero. Se prueba sin navegador.
 *
 * Lo que importa verificar no es el caso feliz sino los bordes: que ir a una
 * pantalla a proposito NO restaure, y que una posicion guardada deje de valer
 * cuando la pagina cambio de tamaño.
 */
import { decidirDestino } from "../js/memoria-scroll.js";

let ok = 0;
let mal = 0;

function comprobar(nombre, obtenido, esperado) {
    if(JSON.stringify(obtenido) === JSON.stringify(esperado)) { ok += 1; return; }
    mal += 1;
    console.log("  FALLA " + nombre + "\n    esperado " + JSON.stringify(esperado) +
                "\n    obtenido " + JSON.stringify(obtenido));
}

const conCatalogo = () => new Map([["/catalogo", { y: 6000, alto: 8600 }]]);

// --- la regla principal
comprobar("volviendo al catalogo, vuelve a donde estaba",
    decidirDestino("/catalogo", conCatalogo(), true, 8600), 6000);

comprobar("entrando a proposito, empieza arriba",
    decidirDestino("/catalogo", conCatalogo(), false, 8600), 0);

comprobar("volviendo a una pantalla nunca visitada, arriba",
    decidirDestino("/cuenta", conCatalogo(), true, 3000), 0);

comprobar("sin nada guardado, arriba",
    decidirDestino("/catalogo", new Map(), true, 8600), 0);

// --- una posicion de cero no es una posicion que valga la pena restaurar
comprobar("si estaba arriba, queda arriba",
    decidirDestino("/catalogo", new Map([["/catalogo", { y: 0, alto: 8600 }]]), true, 8600), 0);

// --- la pagina cambio de tamaño: la posicion vieja ya no significa lo mismo
comprobar("si la pagina se achico mucho, arriba",
    decidirDestino("/catalogo", conCatalogo(), true, 2000), 0);

comprobar("si la pagina crecio mucho, arriba",
    decidirDestino("/catalogo", conCatalogo(), true, 20000), 0);

comprobar("un cambio chico de alto no invalida nada",
    decidirDestino("/catalogo", conCatalogo(), true, 8900), 6000);

comprobar("justo en el limite de tolerancia todavia vale",
    decidirDestino("/catalogo", new Map([["/catalogo", { y: 500, alto: 1000 }]]), true, 1340), 500);

comprobar("pasado el limite, no",
    decidirDestino("/catalogo", new Map([["/catalogo", { y: 500, alto: 1000 }]]), true, 1360), 0);

// --- nunca mas abajo de donde se puede llegar
comprobar("no se pasa del fondo de la pagina",
    decidirDestino("/catalogo", new Map([["/catalogo", { y: 900, alto: 1000 }]]), true, 1000), 900);

// Si la pagina se acorto poco y la posicion guardada queda mas abajo del nuevo
// fondo, se topea al fondo. Mandar al tope seria peor: quedaba cerca de ahi.
comprobar("una pagina un poco mas corta topea al fondo, no al tope",
    decidirDestino("/catalogo", new Map([["/catalogo", { y: 980, alto: 1000 }]]), true, 800), 799);

// --- sin alto guardado (primera vez que se mide) se confia igual
comprobar("sin alto guardado, se restaura igual",
    decidirDestino("/catalogo", new Map([["/catalogo", { y: 400, alto: 0 }]]), true, 5000), 400);

// --- cada pantalla recuerda la suya
const dos = new Map([
    ["/catalogo", { y: 6000, alto: 8600 }],
    ["/", { y: 1200, alto: 3400 }]
]);
comprobar("el catalogo recuerda la suya", decidirDestino("/catalogo", dos, true, 8600), 6000);
comprobar("la portada recuerda la suya", decidirDestino("/", dos, true, 3400), 1200);

console.log(`\n${ok} pruebas pasadas, ${mal} falladas`);
process.exit(mal ? 1 : 0);
