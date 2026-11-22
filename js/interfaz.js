"use strict";

const campoBusqueda = document.getElementById("busqueda");
const selectCategoria = document.getElementById("filtro-categoria");
const botonLimpiarFiltros = document.getElementById("limpiar-filtros");
const listaCatalogo = document.getElementById("lista-catalogo");
const avisoCatalogo = document.getElementById("aviso-catalogo");

const listaCarrito = document.getElementById("lista-carrito");
const avisoCarrito = document.getElementById("aviso-carrito");
const carritoUnidades = document.getElementById("carrito-unidades");
const carritoSubtotal = document.getElementById("carrito-subtotal");
const carritoDescuento = document.getElementById("carrito-descuento");
const carritoTotal = document.getElementById("carrito-total");

const formularioPedido = document.getElementById("formulario-pedido");
const datosEnvio = document.getElementById("datos-envio");
const campoDireccion = document.getElementById("direccion");
const campoCodigoPostal = document.getElementById("codigo-postal");
const campoObservaciones = document.getElementById("observaciones");
const contadorObservaciones = document.getElementById("contador-observaciones");
const botonConfirmar = document.getElementById("boton-confirmar");
const avisoPedido = document.getElementById("aviso-pedido");

const selectModalidad = document.getElementById("filtro-modalidad");
const botonExportar = document.getElementById("exportar-historial");
const listaHistorial = document.getElementById("lista-historial");
const avisoHistorial = document.getElementById("aviso-historial");
const historialCantidad = document.getElementById("historial-cantidad");
const historialSuma = document.getElementById("historial-suma");
const jsonHistorial = document.getElementById("json-historial");

// Campos del formulario que pueden llevar un mensaje de error propio.
const CAMPOS_CON_ERROR = ["nombre", "correo", "entrega", "direccion", "codigoPostal",
  "observaciones", "acepta"];

/**
 * Escribe un aviso en un párrafo y le pone el color según si es bueno o malo.
 * @param {HTMLElement} elemento Párrafo donde se escribe.
 * @param {string} texto Mensaje. Si está vacío, el aviso desaparece.
 * @param {string} tipo "bien", "mal" o cadena vacía.
 * @returns {void}
 */
function mostrarAviso(elemento, texto, tipo = "") {
  elemento.textContent = texto;
  elemento.classList.remove("bien");
  elemento.classList.remove("mal");
  if (tipo !== "") elemento.classList.add(tipo);
}

/**
 * Crea un elemento con su texto dentro, para no repetir tres líneas cada vez.
 * @param {string} etiqueta Nombre de la etiqueta, por ejemplo "p" o "span".
 * @param {string} texto Texto que se mete con textContent.
 * @param {string} clase Clase CSS opcional.
 * @returns {HTMLElement} El elemento ya creado, todavía sin añadir a la página.
 */
function crearElemento(etiqueta, texto, clase = "") {
  const elemento = document.createElement(etiqueta);
  elemento.textContent = texto;
  if (clase !== "") elemento.className = clase;
  return elemento;
}

/**
 * Vacía un contenedor antes de volver a pintarlo.
 * @param {HTMLElement} contenedor Elemento que se queda sin hijos.
 * @returns {void}
 */
function vaciar(contenedor) {
  contenedor.textContent = "";
}


/**
 * Rellena el select de categorías con las categorías que hay en el catálogo.
 * @returns {void}
 */
function pintarCategorias() {
  obtenerCategorias(catalogo).forEach(categoria => {
    const opcion = document.createElement("option");
    opcion.value = categoria;
    opcion.textContent = categoria;
    selectCategoria.append(opcion);
  });
}

/**
 * Crea la tarjeta de un producto con sus datos y su control de cantidad.
 * No lee el DOM: recibe el producto y devuelve el elemento ya montado.
 * @param {Producto} producto Producto del catálogo.
 * @returns {HTMLElement} El artículo de la tarjeta.
 */
function crearTarjetaProducto(producto) {
  const tarjeta = document.createElement("article");
  tarjeta.className = producto.hayStock() ? "tarjeta" : "tarjeta agotado";

  tarjeta.append(crearElemento("h3", producto.nombre));
  tarjeta.append(crearElemento("p", producto.categoria, "categoria"));
  tarjeta.append(crearElemento("p", formatearImporte(producto.precio), "precio"));

  const textoStock = producto.hayStock()
    ? "Existencias: " + producto.stock
    : "Agotado";
  tarjeta.append(crearElemento("p", textoStock, "stock"));

  const compra = document.createElement("div");
  compra.className = "compra";

  const etiqueta = document.createElement("label");
  etiqueta.setAttribute("for", "cantidad-" + producto.id);
  etiqueta.textContent = "Cantidad";

  const entradaCantidad = document.createElement("input");
  entradaCantidad.type = "number";
  entradaCantidad.id = "cantidad-" + producto.id;
  entradaCantidad.min = "1";
  entradaCantidad.max = String(producto.stock);
  entradaCantidad.step = "1";
  entradaCantidad.value = producto.hayStock() ? "1" : "";

  const boton = document.createElement("button");
  boton.type = "button";
  boton.textContent = "Añadir al carrito";
  // Guardo el id en un atributo data para poder leerlo desde la delegación.
  boton.setAttribute("data-accion", "anadir");
  boton.setAttribute("data-id", String(producto.id));

  // Un producto sin existencias se ve, pero no se puede añadir.
  if (!producto.hayStock()) {
    entradaCantidad.disabled = true;
    boton.disabled = true;
  }

  compra.append(etiqueta);
  compra.append(entradaCantidad);
  compra.append(boton);
  tarjeta.append(compra);

  return tarjeta;
}

/**
 * Pinta el catálogo aplicando los dos filtros: el texto y la categoría.
 * @returns {void}
 */
function pintarCatalogo() {
  const encontrados = filtrarCatalogo(catalogo, campoBusqueda.value, selectCategoria.value);

  vaciar(listaCatalogo);
  encontrados.forEach(producto => {
    listaCatalogo.append(crearTarjetaProducto(producto));
  });

  if (encontrados.length === 0) {
    mostrarAviso(avisoCatalogo, "Ningún producto coincide con la búsqueda.", "mal");
  } else {
    mostrarAviso(avisoCatalogo, "");
  }
}

/**
 * Añade una cantidad de un producto al carrito, o la suma si ya estaba.
 * No descuenta existencias: eso solo pasa al confirmar el pedido.
 * @param {number} productoId Identificador del producto.
 * @param {number} cantidad Entero mayor que cero.
 * @returns {{correcto: boolean, mensaje: string}} Resultado de la operación.
 */
function anadirAlCarrito(productoId, cantidad) {
  const producto = buscarProductoPorId(catalogo, productoId);
  if (producto === undefined) {
    return { correcto: false, mensaje: "Ese producto ya no está en el catálogo." };
  }
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return { correcto: false, mensaje: "Escribe una cantidad entera mayor que cero." };
  }
  if (!producto.hayStock()) {
    return { correcto: false, mensaje: producto.nombre + " está agotado." };
  }

  const linea = carrito.find(elemento => elemento.productoId === productoId);
  const yaPedidas = linea === undefined ? 0 : linea.cantidad;

  // Compruebo el total que quedaría en el carrito, no solo lo que añado ahora.
  if (!producto.hayStockSuficiente(yaPedidas + cantidad)) {
    return {
      correcto: false,
      mensaje: "No hay existencias suficientes de " + producto.nombre +
        ". Quedan " + producto.stock + " y en el carrito ya tienes " + yaPedidas + "."
    };
  }

  if (linea === undefined) {
    carrito.push({ productoId: productoId, cantidad: cantidad });
  } else {
    linea.cantidad = linea.cantidad + cantidad;
  }

  const texto = cantidad === 1 ? " unidad de " : " unidades de ";
  return {
    correcto: true,
    mensaje: "Añadida" + (cantidad === 1 ? " " : "s ") + cantidad + texto + producto.nombre + "."
  };
}

/**
 * Quita del carrito la línea completa de un producto.
 * @param {number} productoId Identificador del producto.
 * @returns {boolean} true si se ha retirado una línea.
 */
function quitarDelCarrito(productoId) {
  const linea = carrito.find(elemento => elemento.productoId === productoId);
  if (linea === undefined) return false;

  // Compruebo la posición antes de usar splice: con -1 borraría la última línea.
  const posicion = carrito.indexOf(linea);
  if (posicion === -1) return false;

  carrito.splice(posicion, 1);
  return true;
}

/**
 * Crea la fila de una línea del carrito con su botón de quitar.
 * @param {Object} linea Línea { productoId, cantidad }.
 * @returns {HTMLElement|null} La fila, o null si el producto no está en el catálogo.
 */
function crearLineaCarrito(linea) {
  const producto = buscarProductoPorId(catalogo, linea.productoId);
  if (producto === undefined) return null;

  const fila = document.createElement("div");
  fila.className = "linea-carrito";

  const importe = producto.precio * linea.cantidad;
  const datos = document.createElement("div");
  datos.className = "datos";
  datos.append(crearElemento("strong", producto.nombre));
  datos.append(crearElemento("span",
    " · " + linea.cantidad + " x " + formatearImporte(producto.precio) +
    " = " + formatearImporte(importe)));

  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "secundario";
  boton.textContent = "Quitar";
  boton.setAttribute("data-accion", "quitar");
  boton.setAttribute("data-id", String(producto.id));

  fila.append(datos);
  fila.append(boton);
  return fila;
}

/**
 * Pinta el carrito y su resumen económico, y activa o desactiva el botón de confirmar.
 * @returns {void}
 */
function pintarCarrito() {
  vaciar(listaCarrito);

  carrito.forEach(linea => {
    const fila = crearLineaCarrito(linea);
    if (fila !== null) listaCarrito.append(fila);
  });

  const subtotal = calcularSubtotal(carrito, catalogo);
  const unidades = contarUnidades(carrito);

  if (carrito.length === 0 || subtotal === null || unidades === null) {
    mostrarAviso(avisoCarrito, "El carrito está vacío. Añade productos para hacer un pedido.", "mal");
    carritoUnidades.textContent = "0";
    carritoSubtotal.textContent = formatearImporte(0);
    carritoDescuento.textContent = formatearImporte(0);
    carritoTotal.textContent = formatearImporte(0);
    botonConfirmar.disabled = true;
    return;
  }

  const porcentaje = porcentajeDescuentoAplicable(subtotal);
  const descuento = calcularDescuento(subtotal, porcentaje);
  const total = calcularTotal(subtotal, descuento);

  mostrarAviso(avisoCarrito, "");
  carritoUnidades.textContent = String(unidades);
  carritoSubtotal.textContent = formatearImporte(subtotal);
  carritoDescuento.textContent = formatearImporte(descuento) + " (" + porcentaje + " %)";
  carritoTotal.textContent = formatearImporte(total);
  botonConfirmar.disabled = false;
}

/**
 * Crea la entrada del historial de un pedido, con su detalle desplegable.
 * @param {Object} pedido Pedido confirmado.
 * @returns {HTMLElement} El bloque del pedido.
 */
function crearEntradaPedido(pedido) {
  const bloque = document.createElement("div");
  bloque.className = "pedido";

  const resumen = document.createElement("div");
  resumen.className = "datos";
  resumen.append(crearElemento("strong", "Pedido n.º " + pedido.numero));
  resumen.append(crearElemento("span",
    " · " + pedido.fecha + " · " + pedido.cliente.nombre +
    " · " + (pedido.entrega === "envio" ? "Envío" : "Recogida") +
    " · " + formatearImporte(pedido.total)));

  const detalle = document.createElement("details");
  detalle.append(crearElemento("summary", "Ver detalle"));

  const lista = document.createElement("ul");
  lista.className = "detalle-pedido";
  pedido.lineas.forEach(linea => {
    lista.append(crearElemento("li",
      linea.nombre + ": " + linea.cantidad + " x " + formatearImporte(linea.precio) +
      " = " + formatearImporte(linea.importe)));
  });
  detalle.append(lista);

  detalle.append(crearElemento("p",
    "Subtotal: " + formatearImporte(pedido.subtotal) +
    " · Descuento: " + formatearImporte(pedido.descuento) +
    " · Total: " + formatearImporte(pedido.total)));

  if (pedido.entrega === "envio") {
    detalle.append(crearElemento("p",
      "Envío a: " + pedido.direccion + " (" + pedido.codigoPostal + ")"));
  }
  if (pedido.observaciones !== "") {
    detalle.append(crearElemento("p", "Observaciones: " + pedido.observaciones));
  }

  bloque.append(resumen);
  bloque.append(detalle);
  return bloque;
}

/**
 * Pinta el historial con el filtro de modalidad y su resumen.
 * El número de pedidos y la suma se calculan sobre los pedidos filtrados.
 * @returns {void}
 */
function pintarHistorial() {
  const filtrados = filtrarPedidos(pedidos, selectModalidad.value);
  const resumen = resumirPedidos(filtrados);

  vaciar(listaHistorial);
  filtrados.forEach(pedido => {
    listaHistorial.append(crearEntradaPedido(pedido));
  });

  historialCantidad.textContent = String(resumen.cantidad);
  historialSuma.textContent = formatearImporte(resumen.suma);

  if (pedidos.length === 0) {
    mostrarAviso(avisoHistorial, "Todavía no hay pedidos confirmados.", "mal");
  } else if (filtrados.length === 0) {
    mostrarAviso(avisoHistorial, "Ningún pedido coincide con esa modalidad.", "mal");
  } else {
    mostrarAviso(avisoHistorial, "");
  }
}

/**
 * Recoge los datos del formulario con FormData y los deja en un objeto normal.
 * @returns {Object} Datos del pedido tal como los ha escrito el cliente.
 */
function recogerDatosFormulario() {
  const datos = new FormData(formularioPedido);
  const controles = formularioPedido.elements;

  return {
    nombre: String(datos.get("nombre")),
    correo: String(datos.get("correo")),
    entrega: datos.get("entrega") === null ? "" : String(datos.get("entrega")),
    direccion: datos.get("direccion") === null ? "" : String(datos.get("direccion")),
    codigoPostal: datos.get("codigoPostal") === null ? "" : String(datos.get("codigoPostal")),
    observaciones: String(datos.get("observaciones")),
    // El checkbox lo leo con checked: FormData no lo incluye si no está marcado.
    acepta: controles.acepta.checked === true
  };
}

/**
 * Borra los mensajes de error y los errores personalizados de todos los campos.
 * @returns {void}
 */
function limpiarErrores() {
  CAMPOS_CON_ERROR.forEach(campo => {
    const hueco = document.getElementById("error-" + campo);
    if (hueco !== null) hueco.textContent = "";

    const control = formularioPedido.elements[campo];
    if (control !== undefined && typeof control.setCustomValidity === "function") {
      control.setCustomValidity("");
    }
  });
  mostrarAviso(avisoPedido, "");
}

/**
 * Escribe en pantalla los errores que ha devuelto la validación y los asocia al control.
 * @param {Array<Object>} errores Lista de { campo, mensaje }.
 * @returns {void}
 */
function mostrarErrores(errores) {
  errores.forEach(error => {
    const hueco = document.getElementById("error-" + error.campo);
    if (hueco !== null) hueco.textContent = error.mensaje;

    const control = formularioPedido.elements[error.campo];
    if (control !== undefined && typeof control.setCustomValidity === "function") {
      control.setCustomValidity(error.mensaje);
    }
  });

  formularioPedido.reportValidity();
}

/**
 * Traduce a un mensaje en castellano el motivo por el que el navegador
 * considera inválido un control. Lee el objeto validity del control.
 * @param {HTMLElement} control Campo del formulario.
 * @returns {string} Mensaje para ese campo, o cadena vacía si el campo es válido.
 */
function mensajeDesdeValidity(control) {
  const estado = control.validity;

  if (estado.valid) return "";
  if (estado.valueMissing) return "Este campo es obligatorio.";
  if (estado.typeMismatch) return "El formato de este campo no es correcto.";
  if (estado.tooShort) return "Escribe al menos " + control.minLength + " caracteres.";
  if (estado.tooLong) return "No puedes pasar de " + control.maxLength + " caracteres.";
  if (estado.rangeUnderflow) return "El valor mínimo es " + control.min + ".";
  if (estado.rangeOverflow) return "El valor máximo es " + control.max + ".";
  if (estado.stepMismatch) return "Tiene que ser un número entero.";
  if (estado.patternMismatch) return "El formato de este campo no es correcto.";
  return "Revisa este campo.";
}

/**
 * Busca el primer control que no cumple las restricciones del HTML y escribe su
 * motivo al lado del campo. Se usa cuando checkValidity() del formulario falla.
 * @returns {void}
 */
function mostrarRestriccionesHtml() {
  const controles = formularioPedido.elements;

  for (const control of controles) {
    if (typeof control.checkValidity !== "function") continue;
    if (control.checkValidity()) continue;

    const hueco = document.getElementById("error-" + control.name);
    if (hueco !== null && hueco.textContent === "") {
      hueco.textContent = mensajeDesdeValidity(control);
    }
    formularioPedido.reportValidity();
    return;
  }
}

/**
 * Activa o desactiva los campos de envío según la modalidad elegida.
 * Si se vuelve a recogida, deja de ser obligatorio y se quitan sus errores.
 * @returns {void}
 */
function actualizarCamposEnvio() {
  const esEnvio = formularioPedido.elements.entrega.value === "envio";

  datosEnvio.hidden = !esEnvio;
  campoDireccion.required = esEnvio;
  campoCodigoPostal.required = esEnvio;

  if (!esEnvio) {
    campoDireccion.setCustomValidity("");
    campoCodigoPostal.setCustomValidity("");
    document.getElementById("error-direccion").textContent = "";
    document.getElementById("error-codigoPostal").textContent = "";
  }
}

/**
 * Actualiza el contador de caracteres de las observaciones.
 * @returns {void}
 */
function actualizarContador() {
  contadorObservaciones.textContent = String(campoObservaciones.value.length);
}

/**
 * Comprueba el formulario y el carrito y, si todo está bien, confirma el pedido.
 * Si algo falla no cambia ninguna colección ni borra lo que hay escrito.
 * @returns {void}
 */
function confirmarPedido() {
  limpiarErrores();

  const datos = recogerDatosFormulario();
  const revision = validarDatosPedido(datos);

  if (!revision.valido) {
    mostrarErrores(revision.errores);
    mostrarAviso(avisoPedido, "Revisa los datos marcados en rojo.", "mal");
    return;
  }

  if (!formularioPedido.checkValidity()) {
    mostrarRestriccionesHtml();
    mostrarAviso(avisoPedido, "Hay campos del formulario sin completar.", "mal");
    return;
  }

  const revisionStock = comprobarStockCarrito(carrito, catalogo);
  if (!revisionStock.valido) {
    mostrarAviso(avisoPedido, revisionStock.problemas.join(" "), "mal");
    return;
  }

  const fecha = new Date().toLocaleString("es-ES");
  const pedido = crearPedido(siguienteNumeroPedido(), fecha, datos, carrito, catalogo);

  if (pedido === null) {
    mostrarAviso(avisoPedido, "No se ha podido calcular el pedido. Revisa el carrito.", "mal");
    return;
  }

  pedido.lineas.forEach(linea => {
    const producto = buscarProductoPorId(catalogo, linea.productoId);
    if (producto !== undefined) producto.descontarStock(linea.cantidad);
  });

  pedidos.push(pedido);
  carrito.splice(0, carrito.length);

  formularioPedido.reset();
  actualizarCamposEnvio();
  actualizarContador();

  pintarCatalogo();
  pintarCarrito();
  pintarHistorial();

  mostrarAviso(avisoPedido,
    "Pedido n.º " + pedido.numero + " confirmado. Total: " + formatearImporte(pedido.total) + ".",
    "bien");
}

listaCatalogo.addEventListener("click", event => {
  const boton = event.target;
  if (boton.getAttribute("data-accion") !== "anadir") return;

  const productoId = Number(boton.getAttribute("data-id"));
  const entrada = document.getElementById("cantidad-" + productoId);

  if (entrada === null || entrada.value.trim() === "") {
    mostrarAviso(avisoCatalogo, "Escribe una cantidad antes de añadir.", "mal");
    return;
  }

  const cantidad = entrada.valueAsNumber;
  const resultado = anadirAlCarrito(productoId, cantidad);

  mostrarAviso(avisoCatalogo, resultado.mensaje, resultado.correcto ? "bien" : "mal");
  if (resultado.correcto) {
    entrada.value = "1";
    pintarCarrito();
  }
});

listaCarrito.addEventListener("click", event => {
  const boton = event.target;
  if (boton.getAttribute("data-accion") !== "quitar") return;

  const productoId = Number(boton.getAttribute("data-id"));
  const producto = buscarProductoPorId(catalogo, productoId);

  if (quitarDelCarrito(productoId)) {
    pintarCarrito();

    if (carrito.length > 0) {
      const nombre = producto === undefined ? "la línea" : producto.nombre;
      mostrarAviso(avisoCarrito, "Se ha quitado " + nombre + " del carrito.", "bien");
    }
  }
});

campoBusqueda.addEventListener("input", pintarCatalogo);
selectCategoria.addEventListener("change", pintarCatalogo);

botonLimpiarFiltros.addEventListener("click", () => {
  campoBusqueda.value = "";
  selectCategoria.value = "todas";
  pintarCatalogo();
});

formularioPedido.addEventListener("submit", event => {
  event.preventDefault();
  confirmarPedido();
});


formularioPedido.addEventListener("change", event => {
  if (event.target.name === "entrega") actualizarCamposEnvio();
});

campoObservaciones.addEventListener("input", actualizarContador);

formularioPedido.addEventListener("input", event => {
  const control = event.target;
  if (typeof control.setCustomValidity !== "function") return;

  control.setCustomValidity("");

  const hueco = document.getElementById("error-" + control.name);
  if (hueco === null) return;

  hueco.textContent = control.validity.valid ? "" : mensajeDesdeValidity(control);
});

selectModalidad.addEventListener("change", () => {
  pintarHistorial();
  jsonHistorial.value = "";
});

botonExportar.addEventListener("click", () => {
  const filtrados = filtrarPedidos(pedidos, selectModalidad.value);

  if (filtrados.length === 0) {
    jsonHistorial.value = "";
    mostrarAviso(avisoHistorial, "No hay pedidos que exportar con ese filtro.", "mal");
    return;
  }

  jsonHistorial.value = JSON.stringify(filtrados, null, 2);
  const texto = filtrados.length === 1 ? " pedido exportado." : " pedidos exportados.";
  mostrarAviso(avisoHistorial,
    filtrados.length + texto + " Puedes copiar el texto del cuadro.", "bien");
});

pintarCategorias();
actualizarCamposEnvio();
actualizarContador();
pintarCatalogo();
pintarCarrito();
pintarHistorial();