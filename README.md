# Gestor de pedidos de material

Práctica de integración de **Desarrollo Web en Entorno Cliente** (sesiones 8-13), 2.º DAW.

Es una aplicación web para ver un catálogo de material informático y de oficina, meter
productos en un carrito y confirmar pedidos. Todo funciona en el navegador con HTML, CSS y
JavaScript. No hay servidor propio, ni base de datos, ni frameworks. Los datos se guardan en
memoria, así que al recargar la página se empieza de cero.

---

## Cómo ejecutarla

Hay que abrirla con un servidor HTTP, **no** haciendo doble clic en el archivo (eso sería
`file://` y no es lo que pide la práctica).

Desde la carpeta del proyecto:

```bash
# Opción 1: con Python (viene instalado en Linux y macOS)
python3 -m http.server 8000

# Opción 2: con Node
npx serve .
```

Luego abro el navegador en <http://localhost:8000>.

En VS Code también sirve la extensión **Live Server**: clic derecho en `index.html` →
*Open with Live Server*.

---

## Estructura de carpetas

```
gestor-pedidos-material/
├── index.html          La página: catálogo, carrito, formulario e historial
├── css/
│   └── estilos.css     Estilos. Solo ordena las secciones y marca los errores
├── js/
│   ├── modelo.js       La clase Producto y los datos de partida
│   ├── calculos.js     Cálculos y validación. No tocan la página
│   └── interfaz.js     Pinta el catálogo, el carrito y el historial, y escucha los eventos
└── README.md
```

Los tres ficheros de JavaScript se cargan en `index.html` con `defer` y en este orden:
`modelo.js`, `calculos.js` e `interfaz.js`. Lo he separado así porque el enunciado pide
diferenciar los cálculos que devuelven datos de las funciones que cambian la página:

- `calculos.js` recibe datos por parámetros y devuelve resultados. Cuando algo no es válido
  devuelve `null`, nunca `NaN`. Se puede probar desde la consola sin abrir el formulario.
- `interfaz.js` es el único que busca elementos con `document.getElementById`, crea nodos y
  registra eventos con `addEventListener`.

---

## Los datos que maneja

Tres colecciones en memoria, todas en `modelo.js`:

| Colección  | Qué guarda |
|------------|------------|
| `catalogo` | 7 productos de 3 categorías (periféricos, papelería, mobiliario), creados como instancias de la clase `Producto` |
| `carrito`  | Una línea por producto: `{ productoId, cantidad }` |
| `pedidos`  | Los pedidos ya confirmados, con su número, fecha, cliente, líneas e importes |

El catálogo trae a propósito un producto agotado (*Teclado mecánico*, stock 0) y dos productos
que pasan de 100 € solos (*Monitor 24 pulgadas* y *Silla de oficina*), para poder probar el
descuento sin tener que añadir veinte cosas.

La clase `Producto` (`modelo.js`) tiene el constructor y tres métodos que usan `this`:

- `hayStock()` → dice si quedan existencias.
- `hayStockSuficiente(cantidad)` → dice si se puede servir esa cantidad. No cambia nada.
- `descontarStock(cantidad)` → resta del stock. Solo se llama al confirmar un pedido.

El constructor lanza un `TypeError` si los datos no valen (id que no es entero, precio que no es
mayor que cero, stock negativo o decimal…), así no se crea un producto imposible.

---

## Qué hace cada funcionalidad y dónde está

### Catálogo

Cada producto se ve con su nombre, categoría, precio, existencias y un campo para decir cuántas
unidades quiero. Las tarjetas se crean con `createElement` y `textContent`, nunca con
`innerHTML`, para no meter en la página texto escrito por el usuario.

- `crearTarjetaProducto(producto)` en `interfaz.js` → monta una tarjeta y la devuelve.
- `pintarCatalogo()` en `interfaz.js` → vacía el contenedor y vuelve a pintar las tarjetas.
- `filtrarCatalogo(catalogo, texto, categoria)` en `calculos.js` → aplica la búsqueda por nombre
  (sin distinguir mayúsculas, con `toLowerCase`) y la categoría. Los dos criterios se combinan y
  si no sale nada se avisa en pantalla.
- Un producto sin stock se sigue viendo, pero su botón y su campo de cantidad salen
  desactivados.
- Después de confirmar un pedido se vuelve a llamar a `pintarCatalogo()`, así se ven las
  existencias nuevas.

### Carrito

- `anadirAlCarrito(productoId, cantidad)` en `interfaz.js` → si el producto ya está en el
  carrito le suma la cantidad (`linea.cantidad = linea.cantidad + cantidad`) en vez de crear otra
  línea; si no está, lo mete con `push`. Antes comprueba con `hayStockSuficiente` que lo que ya
  hay en el carrito más lo nuevo cabe en el stock.
- `quitarDelCarrito(productoId)` en `interfaz.js` → busca la línea con `find`, mira su posición
  con `indexOf` y solo entonces usa `splice`. Compruebo la posición porque `splice(-1, 1)`
  borraría la última línea aunque el producto no estuviera.
- Los botones **Quitar** se atienden con **delegación de eventos**: el `addEventListener` está
  puesto en el contenedor `#lista-carrito` y dentro se mira `event.target` y su atributo
  `data-accion`. Lo mismo hago con los botones **Añadir al carrito** del catálogo, porque también
  se crean y se borran cada vez que se repinta.
- Añadir al carrito **no** descuenta existencias. El stock solo baja cuando el pedido se
  confirma, y justo antes se vuelve a comprobar con `comprobarStockCarrito`.
- Si el carrito está vacío se avisa y el botón de confirmar se queda desactivado.

### Cálculos del dinero

Están en `calculos.js` y no tocan la página:

- `calcularSubtotal(carrito, catalogo)` → suma precio por cantidad de cada línea.
- `porcentajeDescuentoAplicable(subtotal, umbral = 100)` → devuelve 10 si el subtotal llega a
  100 €, y 0 si no llega.
- `calcularDescuento(subtotal, porcentaje = 0)` → devuelve el **importe** de la rebaja, no el
  precio final. Tiene el parámetro por defecto que pide el enunciado: si no le paso porcentaje,
  el descuento es 0.
- `calcularTotal(subtotal, descuento)` → subtotal menos descuento.
- `formatearImporte(importe)` → devuelve el texto con dos decimales y el símbolo del euro. Este
  texto solo se usa para mostrarlo; los cálculos se siguen haciendo con los números.

Los precios del catálogo son finales, no hay que sumar IVA.

### Formulario y confirmación

El formulario (`index.html`) usa etiquetas visibles, `fieldset` y `legend` para la modalidad de
entrega, y lleva `novalidate` para que la validación la coordine yo desde JavaScript.

El envío se atiende en el evento `submit` con `event.preventDefault()`. Después:

1. `recogerDatosFormulario()` recoge los datos con `FormData`. La casilla de aceptación la leo
   con `checked`, porque `FormData` no la incluye si no está marcada.
2. `validarDatosPedido(datos)` (en `calculos.js`) comprueba todo y devuelve una lista de errores
   `{ campo, mensaje }`.
3. `mostrarErrores(errores)` escribe cada mensaje al lado de su campo, se lo pasa al control con
   `setCustomValidity()` y llama a `reportValidity()`.
4. Si la validación pasa, se comprueba también `formularioPedido.checkValidity()` y el stock del
   carrito.
5. Solo si todo está bien se crea el pedido con `crearPedido`, se descuenta el stock con
   `descontarStock`, se guarda en `pedidos` con `push`, se vacía el carrito con `splice` y se
   repintan las tres secciones.

Si algo falla no se cambia ninguna colección y no se pierde lo que haya escrito en el
formulario.

Lo que se comprueba:

| Campo | Reglas |
|-------|--------|
| Nombre y apellidos | Obligatorio, entre 2 y 60 caracteres después de `trim()`. Solo espacios no vale |
| Correo | Obligatorio y con formato aceptable. Que el formato esté bien no significa que la dirección exista |
| Entrega | Recogida o envío. Compruebo que el valor es uno de los dos, no me fío del radio |
| Dirección | Solo si es envío: entre 5 y 100 caracteres |
| Código postal | Solo si es envío: cinco cifras y provincia de 01 a 52, comprobado con `RegExp.test()` |
| Observaciones | Opcional, máximo 200 caracteres, con contador que se actualiza con el evento `input` |
| Aceptación | La casilla tiene que estar marcada |

La expresión regular del código postal es `/^(0[1-9]|[1-4][0-9]|5[0-2])\d{3}$/`: tiene
agrupación con paréntesis y alternativas con `|`, y así solo pasan las provincias de la 01 a la
52.

Si cambio de envío a recogida, la dirección y el código postal dejan de ser obligatorios y se les
borra el error personalizado con `setCustomValidity("")` (función `actualizarCamposEnvio()`).

Para las cantidades uso `valueAsNumber`, pero antes compruebo que el campo no esté vacío con
`entrada.value.trim() === ""`, porque un campo numérico vacío no es un cero.

Las restricciones del HTML (`required`, `type="email"`, `minlength`, `maxlength`, `min`, `max`,
`step`) y la validación de JavaScript funcionan juntas. Para no dejar los mensajes del navegador
en inglés o en otro idioma, leo el objeto `validity` del control en
`mensajeDesdeValidity(control)` y traduzco el motivo (`valueMissing`, `typeMismatch`, `tooShort`,
`rangeOverflow`, `stepMismatch`…). Esa función se usa en dos sitios:

- mientras escribo (evento `input`): si el campo ya cumple todo, su mensaje se borra; si todavía
  no, se ve el motivo;
- al enviar, si `formularioPedido.checkValidity()` devuelve `false`, `mostrarRestriccionesHtml()`
  busca el primer campo que no cumple y escribe su motivo al lado.

Aunque ya se valide mientras se escribe, al pulsar **Confirmar pedido** se vuelve a validar todo
desde cero.

### Historial y exportar a JSON

- Cada pedido confirmado se añade al historial con número, fecha, nombre del cliente, modalidad
  y total. El detalle de las líneas se despliega con un `<details>`.
- Las líneas del pedido guardan el nombre y el precio del momento de la compra, así que el
  historial no cambia aunque luego cambien los precios o el stock.
- `filtrarPedidos(pedidos, modalidad)` filtra por todos, recogida o envío, y `resumirPedidos`
  cuenta los pedidos y suma sus importes **sobre los pedidos filtrados**.
- El botón **Exportar historial** escribe en el `textarea` el resultado de
  `JSON.stringify(filtrados, null, 2)`. Exporta lo que esté mostrando el filtro. El texto se
  puede seleccionar y copiar. No se descarga ningún fichero ni se importa nada.
- Si no hay pedidos, o ninguno cumple el filtro, se avisa y no se muestran números raros.

### Métodos y cosas de JavaScript que he usado

| Qué | Dónde lo uso de verdad |
|-----|------------------------|
| `class` con `constructor` y `this` | `Producto` en `modelo.js` |
| `push` | Meter una línea nueva en el carrito, guardar un pedido, acumular errores de validación |
| `splice` | Quitar una línea del carrito y vaciarlo al confirmar |
| `find` | Buscar un producto por su id (`buscarProductoPorId`) y buscar la línea del carrito |
| `indexOf` | Saber la posición de la línea antes de borrarla, y buscar texto en el nombre |
| `filter` | Filtrar el catálogo y el historial |
| `map` | Crear el catálogo de instancias y las líneas del pedido |
| `forEach` | Pintar tarjetas, líneas y pedidos, descontar stock |
| Función con parámetro por defecto | `calcularDescuento(subtotal, porcentaje = 0)` |
| Funciones flecha | Callbacks de `find`, `filter`, `map`, `forEach` y de los `addEventListener` |
| Delegación de eventos | Botones de añadir y de quitar, que se crean dinámicamente |
| `FormData` | Recoger los datos del pedido |
| Constraint Validation API | `validity`, `setCustomValidity()`, `checkValidity()`, `reportValidity()` |

---

## Casos de prueba

Todos se hacen en el navegador, con la aplicación recién recargada salvo que diga otra cosa.

### 1. Carrito vacío

1. Recargo la página.
2. Miro la sección **Carrito**.

**Resultado esperado:** sale el aviso «El carrito está vacío. Añade productos para hacer un
pedido.», el subtotal, el descuento y el total están a `0.00 €` y el botón **Confirmar pedido**
está desactivado, así que no se puede confirmar nada.

### 2. Suma de cantidades en vez de línea duplicada

1. En *Ratón USB* pongo cantidad **2** y pulso **Añadir al carrito**.
2. Vuelvo a poner cantidad **3** en el mismo producto y pulso **Añadir al carrito**.

**Resultado esperado:** en el carrito hay **una sola línea** de *Ratón USB* con 5 unidades,
unidades totales 5 y subtotal `62.50 €` (5 × 12,50).

### 3. Stock insuficiente

1. Con las 5 unidades de *Ratón USB* del caso anterior en el carrito (stock 8), pongo cantidad
   **5** y pulso **Añadir al carrito**.

**Resultado esperado:** no se añade nada y sale el aviso «No hay existencias suficientes de Ratón
USB. Quedan 8 y en el carrito ya tienes 5.». El carrito se queda con 5 unidades.

También: si pongo cantidad **0**, o dejo el campo vacío, o escribo **1.5**, tampoco se añade y
sale un aviso explicándolo.

### 4. Producto agotado

1. Miro la tarjeta de *Teclado mecánico* (stock 0).

**Resultado esperado:** la tarjeta se ve, pone **Agotado** y el campo de cantidad y el botón
**Añadir al carrito** están desactivados, así que no hay forma de meterlo en el carrito.

### 5. Umbral de 100 € (descuento del 10 %)

1. Añado **1** unidad de *Mesa de escritorio* (89,90 €).
2. Miro el resumen del carrito.
3. Añado **1** unidad de *Carpeta de anillas* (3,20 €) y vuelvo a mirar.
4. Añado **1** unidad de *Paquete de folios A4* (4,75 €) y vuelvo a mirar.

**Resultado esperado:**

| Paso | Subtotal | Descuento | Total |
|------|----------|-----------|-------|
| 1 | `89.90 €` | `0.00 € (0 %)` | `89.90 €` |
| 3 | `93.10 €` | `0.00 € (0 %)` | `93.10 €` |
| 4 | `97.85 €` | `0.00 € (0 %)` | `97.85 €` |

5. Ahora, sobre esos 97,85 €, añado **1** unidad de *Silla de oficina* (105 €).

**Resultado esperado del paso 5:** subtotal `202.85 €`, descuento `20.29 € (10 %)` y total
`182.57 €`. Hasta los 100 € el descuento es `0.00 €` y en cuanto se llega aparece el 10 %.

Otra forma de verlo justo en el límite: con 1 *Mesa de escritorio* y 1 *Carpeta de anillas*
(93,10 €) no hay descuento, y si añado 1 *Silla de oficina* el subtotal pasa a `198.10 €`, el
descuento a `19.81 €` y el total a `178.29 €`.

### 6. Eliminación de líneas del carrito

1. Añado 2 *Ratón USB* y 1 *Carpeta de anillas*.
2. Pulso **Quitar** en la línea del *Ratón USB*.

**Resultado esperado:** desaparece solo esa línea, queda la carpeta, el subtotal pasa de
`28.20 €` a `3.20 €`, las unidades pasan de 3 a 1 y sale el aviso «Se ha quitado Ratón USB del
carrito.». Si quito también la última línea, vuelve el aviso de carrito vacío.

### 7. Correo inválido

1. Añado cualquier producto al carrito.
2. Escribo nombre **Marcos Martínez**, correo **marcos.com**, marco la casilla de confirmación y
   pulso **Confirmar pedido**.

**Resultado esperado:** no se crea el pedido. Debajo del campo del correo sale «El correo no
tiene un formato válido, por ejemplo nombre@dominio.com.», el navegador enseña el aviso del
propio campo (`reportValidity`) y el carrito y el formulario se quedan como estaban. En cuanto
corrijo el correo, el mensaje desaparece.

### 8. Código postal inválido

1. Añado un producto al carrito y elijo **Envío a domicilio**.
2. Escribo nombre y correo correctos, dirección **Calle Tiro de Línea 10** y código postal
   **99123**. Marco la casilla y pulso **Confirmar pedido**.

**Resultado esperado:** no se crea el pedido y sale «El código postal son cinco cifras y la
provincia va de 01 a 52.». Con **41013** sí se confirma. También fallan `4101` (cuatro cifras),
`410134` (seis) y `00123` (provincia 00).

### 9. Cambio de modalidad de entrega

1. Elijo **Envío a domicilio**: aparecen la dirección y el código postal.
2. Los dejo vacíos y pulso **Confirmar pedido**: salen sus errores.
3. Vuelvo a marcar **Recogida en tienda**.

**Resultado esperado:** los campos de envío se ocultan, dejan de ser obligatorios y sus mensajes
de error desaparecen. Con el carrito lleno y el nombre, el correo y la casilla bien, el pedido se
confirma sin pedir ningún dato postal, y en el historial sale como **Recogida** y sin dirección.

### 10. Nombre con solo espacios

1. Escribo en el nombre tres espacios y pulso **Confirmar pedido**.

**Resultado esperado:** sale «Escribe tu nombre y apellidos.» y no se confirma, porque el nombre
se comprueba después de `trim()`.

### 11. Contador de observaciones

1. Escribo en el cuadro de observaciones.

**Resultado esperado:** el contador de debajo va subiendo mientras escribo (evento `input`) y el
campo no deja pasar de 200 caracteres.

### 12. Pedido correcto y actualización del stock

1. Añado **2** *Silla de oficina* (stock 3, 105 € cada una).
2. Nombre **Marcos Martínez**, correo **marcos@correo.com**, **Recogida en tienda**, marco la
   casilla y pulso **Confirmar pedido**.

**Resultado esperado:** sale en verde «Pedido n.º 1 confirmado. Total: 189.00 €.» (subtotal
210 €, descuento 21 €), el carrito se vacía, la tarjeta de la silla pasa a **Existencias: 1** y en
el historial aparece el pedido n.º 1. Si despliego **Ver detalle** veo «Silla de oficina: 2 x
105.00 € = 210.00 €» y los importes.

### 13. Filtros del historial sin resultados

1. Con un solo pedido de **recogida** en el historial, cambio el filtro de modalidad a **Envío**.

**Resultado esperado:** no se lista ningún pedido, sale «Ningún pedido coincide con esa
modalidad.» y el resumen pone 0 pedidos e importe `0.00 €` (sin `NaN`).

### 14. Filtros del catálogo sin resultados

1. Escribo **silla** en la búsqueda y elijo la categoría **perifericos**.

**Resultado esperado:** no se ve ninguna tarjeta y sale «Ningún producto coincide con la
búsqueda.». Con **Limpiar filtros** vuelven los 7 productos. Buscar **RATÓN** en mayúsculas
encuentra *Ratón USB*, porque la búsqueda no distingue mayúsculas.

### 15. Exportar el historial a JSON

1. Con al menos un pedido, pulso **Exportar historial**.

**Resultado esperado:** en el cuadro de abajo aparece el JSON de los pedidos que muestra el
filtro, con sus líneas, subtotal, descuento y total, y se puede seleccionar y copiar. Con el
filtro puesto en una modalidad sin pedidos, el cuadro se queda vacío y sale «No hay pedidos que
exportar con ese filtro.».

### 16. Se vuelve a comprobar el stock antes de confirmar

Esta prueba sirve para ver que el stock se comprueba otra vez justo antes de tocar el catálogo,
y no solo al añadir al carrito.

1. Añado **1** *Silla de oficina* al carrito.
2. Abro la consola de DevTools y escribo:
   `catalogo.find(producto => producto.id === 106).stock = 0;`
3. Relleno el formulario bien y pulso **Confirmar pedido**.

**Resultado esperado:** no se crea el pedido, sale «De Silla de oficina pides 1 y solo quedan
0.», el carrito no se vacía y el historial no cambia.

---

## Evidencia de depuración con un punto de interrupción

**[Pegar aquí la captura de DevTools con el breakpoint parado]**

Pasos para reproducirla:

1. Abro DevTools con **F12** y voy a la pestaña **Sources** (o *Depurador* en Firefox).
2. Abro `js/calculos.js` y pongo un punto de interrupción en la línea del `return` de
   `calcularDescuento`.
3. En la aplicación añado **1** *Silla de oficina* (105 €) al carrito.
4. La ejecución se para en esa línea.

Qué se ve y qué comprobé: en el panel de variables locales `subtotal` vale `105` y `porcentaje`
vale `10`, y en la pila de llamadas (*Call stack*) aparece que a `calcularDescuento` la ha
llamado `pintarCarrito`. Si paso el ratón por la expresión `subtotal * porcentaje / 100` me sale
`10.5`. Al pulsar **Step over** la función devuelve ese valor y después en pantalla el descuento
sale como `10.50 €`. Con esto compruebo que el umbral de los 100 € se está aplicando donde toca y
que el descuento es el importe de la rebaja, no el precio final.

## Evidencia de la carga por HTTP en la pestaña Network

**[Pegar aquí la captura de la pestaña Network]**

Pasos para reproducirla:

1. Abro DevTools en la pestaña **Network** (*Red*) y recargo con **Ctrl+F5**.
2. Busco la fila de `js/calculos.js`.

Qué se ve: el fichero se pide a `http://localhost:8000/js/calculos.js`, con método **GET**,
estado **200**, tipo **script** y su tamaño. En la fila de `index.html` el tipo es **document**.
Esto demuestra que la aplicación se está sirviendo por HTTP y no abierta con `file://`. En la
pestaña **Console** no aparece ningún error de JavaScript.

---

## Conversaciones con IA

**[Pegar aquí los enlaces de las conversaciones]**

Resumen de para qué la he usado y qué decidí yo:

- **Separar los ficheros de JavaScript.** Pregunté cómo organizar el código y decidí dejar los
  cálculos y la validación en `calculos.js`, sin que toquen la página, y todo lo del DOM en
  `interfaz.js`. Así puedo probar los cálculos desde la consola.
- **Dónde poner el umbral de los 100 €.** El enunciado da la firma
  `calcularDescuento(subtotal, porcentaje = 0)`. Opté por dejar esa función solo para calcular el
  importe de la rebaja y sacar la decisión del 10 % a `porcentajeDescuentoAplicable`, para que
  cada función haga una cosa.
- **Cómo borrar una línea del carrito.** Lo hago con `find` para localizar la línea, `indexOf`
  para su posición y `splice` para quitarla, comprobando antes que la posición no sea `-1`.
- **Devolver `null` cuando los datos no valen.** Las funciones de cálculo devuelven `null` en vez
  de `NaN`, como en los apuntes, y quien las llama comprueba `=== null`. Así en pantalla no
  aparece nunca `NaN`.
- **Delegación de eventos.** En vez de poner un `addEventListener` a cada botón nuevo, pongo uno
  en el contenedor y miro `event.target`. Esto hace falta porque las tarjetas y las líneas se
  borran y se vuelven a crear al repintar.

## Subirlo a GitHub

```bash
git init
git add .
git commit -m "Gestor de pedidos de material"
git branch -M main
git remote add origin https://github.com/USUARIO/gestor-pedidos-material.git
git push -u origin main
```

El repositorio tiene que ser público (o estar compartido con el profesor) y el último commit de
la versión que entrego tiene que ser anterior al domingo 22/11/2026 a las 15:59.

## Lo que no entra en la práctica

No hay backend, ni base de datos, ni APIs, ni `localStorage`, ni cookies, ni frameworks. Tampoco
pagos ni usuarios. Al recargar la página se pierden el carrito y los pedidos, que es lo que pide
el enunciado.
