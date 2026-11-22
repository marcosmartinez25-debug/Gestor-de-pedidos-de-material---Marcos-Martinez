"use strict";

class Producto {
  /**
   * Crea un producto del catálogo.
   * @param {number} id Entero mayor que cero y único dentro del catálogo.
   * @param {string} nombre Texto no vacío.
   * @param {string} categoria Texto no vacío.
   * @param {number} precio Número finito mayor que cero (precio final, sin IVA aparte).
   * @param {number} stock Entero mayor o igual que cero.
   * @throws {TypeError} Si algún dato no es válido, no se crea la instancia.
   */
  constructor(id, nombre, categoria, precio, stock) {
    const idValido = Number.isInteger(id) && id > 0;
    const nombreValido = typeof nombre === "string" && nombre.trim() !== "";
    const categoriaValida = typeof categoria === "string" && categoria.trim() !== "";
    const precioValido = Number.isFinite(precio) && precio > 0;
    const stockValido = Number.isInteger(stock) && stock >= 0;

    if (!idValido || !nombreValido || !categoriaValida || !precioValido || !stockValido) {
      throw new TypeError("Datos de producto no válidos");
    }

    this.id = id;
    this.nombre = nombre.trim();
    this.categoria = categoria.trim();
    this.precio = precio;
    this.stock = stock;
  }

  /**
   * Dice si quedan existencias de este producto.
   * @returns {boolean} true si el stock es mayor que cero.
   */
  hayStock() {
    return this.stock > 0;
  }

  /**
   * Comprueba si se puede servir una cantidad concreta de este producto.
   * No modifica nada: solo responde a la pregunta.
   * @param {number} cantidad Entero mayor que cero.
   * @returns {boolean} true si la cantidad es válida y cabe en el stock.
   */
  hayStockSuficiente(cantidad) {
    if (!Number.isInteger(cantidad) || cantidad <= 0) return false;
    return cantidad <= this.stock;
  }

  /**
   * Resta del stock la cantidad comprada. Solo se llama al confirmar un pedido.
   * @param {number} cantidad Entero mayor que cero que no supere el stock.
   * @returns {boolean} true si ha descontado; false si no ha cambiado nada.
   */
  descontarStock(cantidad) {
    if (!this.hayStockSuficiente(cantidad)) return false;
    this.stock = this.stock - cantidad;
    return true;
  }
}

/*
  Datos de partida del catálogo: 7 productos de 3 categorías.
  - "Teclado mecánico" sale agotado (stock 0) para probar el producto sin existencias.
  - "Monitor 24 pulgadas" y "Silla de oficina" pasan de 100 € solos, así se prueba el descuento.
*/
const datosProductos = [
  { id: 101, nombre: "Ratón USB", categoria: "perifericos", precio: 12.5, stock: 8 },
  { id: 102, nombre: "Teclado mecánico", categoria: "perifericos", precio: 24.9, stock: 0 },
  { id: 103, nombre: "Monitor 24 pulgadas", categoria: "perifericos", precio: 119.95, stock: 4 },
  { id: 104, nombre: "Paquete de folios A4", categoria: "papeleria", precio: 4.75, stock: 50 },
  { id: 105, nombre: "Carpeta de anillas", categoria: "papeleria", precio: 3.2, stock: 25 },
  { id: 106, nombre: "Silla de oficina", categoria: "mobiliario", precio: 105, stock: 3 },
  { id: 107, nombre: "Mesa de escritorio", categoria: "mobiliario", precio: 89.9, stock: 2 }
];

/**
 * Convierte los datos de arriba en instancias de la clase Producto.
 * @param {Array<Object>} datos Lista de objetos con los campos del producto.
 * @returns {Array<Producto>} Array nuevo de instancias de Producto.
 */
function crearCatalogo(datos) {
  return datos.map(dato =>
    new Producto(dato.id, dato.nombre, dato.categoria, dato.precio, dato.stock)
  );
}

// Las tres colecciones que maneja la aplicación, en memoria.
const catalogo = crearCatalogo(datosProductos);   // productos (instancias de Producto)
const carrito = [];                               // líneas { productoId, cantidad }
const pedidos = [];                               // historial de pedidos confirmados

// Contador para dar un número distinto a cada pedido.
let ultimoNumeroPedido = 0;

/**
 * Devuelve el siguiente número de pedido.
 * @returns {number} Entero que empieza en 1 y sube de uno en uno.
 */
function siguienteNumeroPedido() {
  ultimoNumeroPedido = ultimoNumeroPedido + 1;
  return ultimoNumeroPedido;
}