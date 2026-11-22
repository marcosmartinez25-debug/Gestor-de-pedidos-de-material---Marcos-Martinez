"use strict";

// Reglas económicas del pedido, en un solo sitio para no repetir números.
const UMBRAL_DESCUENTO = 100;      // euros a partir de los cuales hay descuento
const PORCENTAJE_DESCUENTO = 10;   // tanto por ciento que se aplica

// Modalidades de entrega admitidas. No me fío del valor que llegue del radio.
const MODALIDADES = ["recogida", "envio"];

// Código postal español: provincia de 01 a 52 y tres cifras más.
// Tiene agrupación ( ) y alternativas | , como pide el enunciado.
const PATRON_CODIGO_POSTAL = /^(0[1-9]|[1-4][0-9]|5[0-2])\d{3}$/;

// Formato básico de correo. Comprobar el formato no demuestra que la dirección exista.
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Busca un producto del catálogo por su identificador.
 * @param {Array<Producto>} catalogoProductos Array de productos.
 * @param {number} id Identificador entero del producto.
 * @returns {Producto|undefined} El producto encontrado o undefined si no está.
 */
function buscarProductoPorId(catalogoProductos, id) {
  return catalogoProductos.find(producto => producto.id === id);
}

/**
 * Suma el importe de todas las líneas del carrito (precio por cantidad).
 * @param {Array<Object>} lineasCarrito Array de { productoId, cantidad }.
 * @param {Array<Producto>} catalogoProductos Catálogo donde buscar los precios.
 * @returns {number|null} Subtotal en euros, o null si alguna línea no es válida.
 */
function calcularSubtotal(lineasCarrito, catalogoProductos) {
  if (!Array.isArray(lineasCarrito) || !Array.isArray(catalogoProductos)) return null;

  let subtotal = 0;
  for (const linea of lineasCarrito) {
    const producto = buscarProductoPorId(catalogoProductos, linea.productoId);
    if (producto === undefined) return null;
    if (!Number.isInteger(linea.cantidad) || linea.cantidad <= 0) return null;
    subtotal = subtotal + producto.precio * linea.cantidad;
  }
  return subtotal;
}

/**
 * Decide qué porcentaje de descuento le toca a un subtotal.
 * @param {number} subtotal Importe finito no negativo.
 * @param {number} umbral Importe a partir del cual se aplica el descuento.
 * @returns {number|null} 10 si llega al umbral, 0 si no llega, null si el dato no vale.
 */
function porcentajeDescuentoAplicable(subtotal, umbral = UMBRAL_DESCUENTO) {
  if (!Number.isFinite(subtotal) || subtotal < 0) return null;
  if (!Number.isFinite(umbral) || umbral < 0) return null;
  return subtotal >= umbral ? PORCENTAJE_DESCUENTO : 0;
}

/**
 * Calcula el importe de la rebaja, no el precio final.
 * @param {number} subtotal Importe finito no negativo.
 * @param {number} porcentaje Valor entre 0 y 100. Por defecto 0, es decir, sin descuento.
 * @returns {number|null} Importe del descuento o null si algún dato no es válido.
 */
function calcularDescuento(subtotal, porcentaje = 0) {
  if (!Number.isFinite(subtotal) || subtotal < 0) return null;
  if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) return null;
  return subtotal * porcentaje / 100;
}

/**
 * Resta el descuento al subtotal.
 * @param {number} subtotal Importe finito no negativo.
 * @param {number} descuento Importe finito entre 0 y el subtotal.
 * @returns {number|null} Total a pagar o null si los datos no son válidos.
 */
function calcularTotal(subtotal, descuento) {
  if (!Number.isFinite(subtotal) || subtotal < 0) return null;
  if (!Number.isFinite(descuento) || descuento < 0 || descuento > subtotal) return null;
  return subtotal - descuento;
}

/**
 * Cuenta cuántas unidades hay en total en el carrito.
 * @param {Array<Object>} lineasCarrito Array de { productoId, cantidad }.
 * @returns {number|null} Suma de cantidades o null si alguna no es un entero positivo.
 */
function contarUnidades(lineasCarrito) {
  if (!Array.isArray(lineasCarrito)) return null;

  let unidades = 0;
  for (const linea of lineasCarrito) {
    if (!Number.isInteger(linea.cantidad) || linea.cantidad <= 0) return null;
    unidades = unidades + linea.cantidad;
  }
  return unidades;
}

/**
 * Devuelve el importe con dos decimales y el símbolo del euro, para mostrarlo.
 * El texto que devuelve es para pintarlo en pantalla, no para seguir calculando.
 * @param {number} importe Número finito no negativo.
 * @returns {string|null} Por ejemplo "12.50 €", o null si no es un número válido.
 */
function formatearImporte(importe) {
  if (!Number.isFinite(importe) || importe < 0) return null;
  return importe.toFixed(2) + " €";
}

/**
 * Comprueba que todas las líneas del carrito se pueden servir con el stock actual.
 * Se llama justo antes de confirmar, porque añadir al carrito no descuenta existencias.
 * @param {Array<Object>} lineasCarrito Array de { productoId, cantidad }.
 * @param {Array<Producto>} catalogoProductos Catálogo con el stock actual.
 * @returns {{valido: boolean, problemas: Array<string>}} Lista de problemas encontrados.
 */
function comprobarStockCarrito(lineasCarrito, catalogoProductos) {
  const problemas = [];

  if (!Array.isArray(lineasCarrito) || lineasCarrito.length === 0) {
    problemas.push("El carrito está vacío.");
    return { valido: false, problemas };
  }

  lineasCarrito.forEach(linea => {
    const producto = buscarProductoPorId(catalogoProductos, linea.productoId);
    if (producto === undefined) {
      problemas.push("Hay una línea con un producto que ya no está en el catálogo.");
    } else if (!producto.hayStockSuficiente(linea.cantidad)) {
      problemas.push(
        "De " + producto.nombre + " pides " + linea.cantidad +
        " y solo quedan " + producto.stock + "."
      );
    }
  });

  return { valido: problemas.length === 0, problemas };
}

/**
 * Comprueba los datos que ha escrito el cliente en el formulario.
 * Recibe un objeto con textos y devuelve la lista de errores. No toca el DOM.
 * @param {Object} datos { nombre, correo, entrega, direccion, codigoPostal, observaciones, acepta }
 * @returns {{valido: boolean, errores: Array<Object>}} Cada error es { campo, mensaje }.
 */
function validarDatosPedido(datos) {
  const errores = [];

  if (datos === null || typeof datos !== "object") {
    errores.push({ campo: "general", mensaje: "No se han recibido los datos del pedido." });
    return { valido: false, errores };
  }

  // Nombre y apellidos: obligatorio, de 2 a 60 caracteres sin contar los espacios de los extremos.
  const nombre = typeof datos.nombre === "string" ? datos.nombre.trim() : "";
  if (nombre === "") {
    errores.push({ campo: "nombre", mensaje: "Escribe tu nombre y apellidos." });
  } else if (nombre.length < 2 || nombre.length > 60) {
    errores.push({ campo: "nombre", mensaje: "El nombre debe tener entre 2 y 60 caracteres." });
  }

  // Correo: obligatorio y con un formato aceptable.
  const correo = typeof datos.correo === "string" ? datos.correo.trim() : "";
  if (correo === "") {
    errores.push({ campo: "correo", mensaje: "Escribe tu correo electrónico." });
  } else if (!PATRON_CORREO.test(correo)) {
    errores.push({
      campo: "correo",
      mensaje: "El correo no tiene un formato válido, por ejemplo nombre@dominio.com."
    });
  }

  // Entrega: solo valen las modalidades de la lista, no me fío del valor que llegue del radio.
  const entrega = typeof datos.entrega === "string" ? datos.entrega : "";
  if (!MODALIDADES.includes(entrega)) {
    errores.push({ campo: "entrega", mensaje: "Elige recogida o envío." });
  }

  // La dirección y el código postal solo se piden si el pedido es un envío.
  if (entrega === "envio") {
    const direccion = typeof datos.direccion === "string" ? datos.direccion.trim() : "";
    if (direccion === "") {
      errores.push({ campo: "direccion", mensaje: "Escribe la dirección de envío." });
    } else if (direccion.length < 5 || direccion.length > 100) {
      errores.push({
        campo: "direccion",
        mensaje: "La dirección debe tener entre 5 y 100 caracteres."
      });
    }

    const codigoPostal = typeof datos.codigoPostal === "string" ? datos.codigoPostal.trim() : "";
    if (codigoPostal === "") {
      errores.push({ campo: "codigoPostal", mensaje: "Escribe el código postal." });
    } else if (!PATRON_CODIGO_POSTAL.test(codigoPostal)) {
      errores.push({
        campo: "codigoPostal",
        mensaje: "El código postal son cinco cifras y la provincia va de 01 a 52."
      });
    }
  }

  // Observaciones: es opcional, pero como máximo 200 caracteres.
  const observaciones = typeof datos.observaciones === "string" ? datos.observaciones : "";
  if (observaciones.length > 200) {
    errores.push({
      campo: "observaciones",
      mensaje: "Las observaciones no pueden pasar de 200 caracteres."
    });
  }

  // Aceptación: tiene que estar marcada.
  if (datos.acepta !== true) {
    errores.push({ campo: "acepta", mensaje: "Tienes que confirmar los datos del pedido." });
  }

  return { valido: errores.length === 0, errores };
}

/**
 * Busca en la lista de errores el mensaje de un campo concreto.
 * @param {Array<Object>} errores Lista devuelta por validarDatosPedido.
 * @param {string} campo Nombre del campo, por ejemplo "correo".
 * @returns {string} El mensaje del campo, o cadena vacía si ese campo no tiene error.
 */
function mensajeDeError(errores, campo) {
  const error = errores.find(elemento => elemento.campo === campo);
  return error === undefined ? "" : error.mensaje;
}

/**
 * Crea las líneas que se guardan en el pedido, con el nombre y el precio de este momento.
 * @param {Array<Object>} lineasCarrito Array de { productoId, cantidad }.
 * @param {Array<Producto>} catalogoProductos Catálogo donde están los datos.
 * @returns {Array<Object>|null} Líneas con nombre, precio, cantidad e importe, o null si falla.
 */
function construirLineasPedido(lineasCarrito, catalogoProductos) {
  if (!Array.isArray(lineasCarrito) || lineasCarrito.length === 0) return null;

  const lineas = lineasCarrito.map(linea => {
    const producto = buscarProductoPorId(catalogoProductos, linea.productoId);
    if (producto === undefined) return null;
    return {
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: linea.cantidad,
      importe: producto.precio * linea.cantidad
    };
  });

  // Si alguna línea ha salido mal, no devuelvo un pedido a medias.
  const falla = lineas.find(linea => linea === null);
  return falla === undefined ? lineas : null;
}

/**
 * Monta el objeto del pedido ya confirmado con sus importes calculados.
 * @param {number} numero Número de pedido, entero mayor que cero.
 * @param {string} fecha Fecha ya convertida a texto.
 * @param {Object} datos Datos del cliente ya validados.
 * @param {Array<Object>} lineasCarrito Líneas del carrito.
 * @param {Array<Producto>} catalogoProductos Catálogo con los precios actuales.
 * @returns {Object|null} El pedido completo o null si algún cálculo no es válido.
 */
function crearPedido(numero, fecha, datos, lineasCarrito, catalogoProductos) {
  const lineas = construirLineasPedido(lineasCarrito, catalogoProductos);
  if (lineas === null) return null;

  const subtotal = calcularSubtotal(lineasCarrito, catalogoProductos);
  if (subtotal === null) return null;

  const porcentaje = porcentajeDescuentoAplicable(subtotal);
  if (porcentaje === null) return null;

  const descuento = calcularDescuento(subtotal, porcentaje);
  if (descuento === null) return null;

  const total = calcularTotal(subtotal, descuento);
  if (total === null) return null;

  return {
    numero: numero,
    fecha: fecha,
    cliente: {
      nombre: datos.nombre.trim(),
      correo: datos.correo.trim()
    },
    entrega: datos.entrega,
    direccion: datos.entrega === "envio" ? datos.direccion.trim() : "",
    codigoPostal: datos.entrega === "envio" ? datos.codigoPostal.trim() : "",
    observaciones: typeof datos.observaciones === "string" ? datos.observaciones.trim() : "",
    lineas: lineas,
    unidades: contarUnidades(lineasCarrito),
    subtotal: subtotal,
    porcentajeDescuento: porcentaje,
    descuento: descuento,
    total: total
  };
}

/**
 * Filtra el catálogo por texto del nombre y por categoría. Los dos criterios se combinan.
 * @param {Array<Producto>} catalogoProductos Catálogo completo.
 * @param {string} texto Texto a buscar en el nombre. Si está vacío no filtra por nombre.
 * @param {string} categoria Categoría exacta, o "todas" para no filtrar por categoría.
 * @returns {Array<Producto>} Array nuevo con los productos que cumplen los dos criterios.
 */
function filtrarCatalogo(catalogoProductos, texto, categoria) {
  const busqueda = typeof texto === "string" ? texto.trim().toLowerCase() : "";
  const filtroCategoria = typeof categoria === "string" ? categoria : "todas";

  return catalogoProductos.filter(producto => {
    const coincideNombre =
      busqueda === "" || producto.nombre.toLowerCase().indexOf(busqueda) !== -1;
    const coincideCategoria =
      filtroCategoria === "todas" || producto.categoria === filtroCategoria;
    return coincideNombre && coincideCategoria;
  });
}

/**
 * Filtra el historial por modalidad de entrega.
 * @param {Array<Object>} listaPedidos Historial completo.
 * @param {string} modalidad "todos", "recogida" o "envio".
 * @returns {Array<Object>} Array nuevo con los pedidos que cumplen el filtro.
 */
function filtrarPedidos(listaPedidos, modalidad) {
  if (modalidad === "todos" || !MODALIDADES.includes(modalidad)) return listaPedidos.slice();
  return listaPedidos.filter(pedido => pedido.entrega === modalidad);
}

/**
 * Cuenta los pedidos de una lista y suma sus totales.
 * @param {Array<Object>} listaPedidos Pedidos ya filtrados.
 * @returns {{cantidad: number, suma: number}} Número de pedidos y suma de sus importes.
 */
function resumirPedidos(listaPedidos) {
  if (!Array.isArray(listaPedidos) || listaPedidos.length === 0) {
    return { cantidad: 0, suma: 0 };
  }

  let suma = 0;
  listaPedidos.forEach(pedido => {
    if (Number.isFinite(pedido.total)) suma = suma + pedido.total;
  });
  return { cantidad: listaPedidos.length, suma: suma };
}

/**
 * Saca las categorías distintas que hay en el catálogo, para rellenar el select.
 * @param {Array<Producto>} catalogoProductos Catálogo completo.
 * @returns {Array<string>} Categorías sin repetir, en el orden en que aparecen.
 */
function obtenerCategorias(catalogoProductos) {
  const categorias = [];
  catalogoProductos.forEach(producto => {
    if (!categorias.includes(producto.categoria)) categorias.push(producto.categoria);
  });
  return categorias;
}