#!/bin/sh
# Pruebas de la tienda que no necesitan navegador: funciones puras.
#
#   sh pruebas/correr.sh
#
# Lo visual (desbordes, contraste, objetivos tactiles) se verifica en un
# navegador real, no aca.
set -e
cd "$(dirname "$0")"
node memoria-scroll.mjs
