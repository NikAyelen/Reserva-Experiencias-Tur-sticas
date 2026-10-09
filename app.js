let experiencias = [];
let reservas = [];
let textoBusqueda = "";
let categoriaActual = "todas";
let ordenActual = "normal";
let precioMaximo = ""; // filtro de precio máximo ("" = sin límite)
let temporizador; // para quitar los mensajes después de unos segundos

const catalogo = document.querySelector("#catalogo");
const buscador = document.querySelector("#buscador");
const filtroCategoria = document.querySelector("#filtroCategoria");
const ordenPrecio = document.querySelector("#ordenPrecio");
const listaReservas = document.querySelector("#listaReservas");
const total = document.querySelector("#total");
const estado = document.querySelector("#estado");

// elementos nuevos del DOM
const filtroPrecio = document.querySelector("#precioMaximo");
const totalPersonas = document.querySelector("#totalPersonas");
const mensaje = document.querySelector("#mensaje");
const btnVaciar = document.querySelector("#btnVaciar");
const confirmacion = document.querySelector("#confirmacion");
const btnConfirmarVaciar = document.querySelector("#btnConfirmarVaciar");
const btnCancelarVaciar = document.querySelector("#btnCancelarVaciar");

async function cargarExperiencias() {
    try {
        estado.textContent = "Cargando experiencias...";
        const respuesta = await fetch("./data/experiencias.json");
        if (!respuesta.ok) throw new Error("No fue posible cargar las experiencias");
        experiencias = await respuesta.json();
        estado.textContent = `${experiencias.length} experiencias disponibles`;
        actualizarCatalogo();
    } catch (error) {
        estado.textContent = "Error al cargar la información";
        console.error(error);
    }
}

function obtenerResultados() {
    let resultados = [...experiencias];
    if (categoriaActual !== "todas") {
        resultados = resultados.filter(e => e.categoria === categoriaActual);
    }
    if (textoBusqueda !== "") {
        resultados = resultados.filter(e =>
            e.nombre.toLowerCase().includes(textoBusqueda));
    }
    // filtro por precio máximo, funciona junto con búsqueda y categoría
    if (precioMaximo !== "") {
        resultados = resultados.filter(e => e.precio <= precioMaximo);
    }
    if (ordenActual === "ascendente") resultados.sort((a,b) => a.precio-b.precio);
    if (ordenActual === "descendente") resultados.sort((a,b) => b.precio-a.precio);
    return resultados;
}

function actualizarCatalogo() {
    const resultados = obtenerResultados();
    if (resultados.length === 0) {
        catalogo.innerHTML = `<p class="sin-resultados">No se encontraron experiencias</p>`;
        estado.textContent = "0 resultados";
        return;
    }
    catalogo.innerHTML = resultados.map(e => `
        <article class="tarjeta">
            <div class="imagen">${e.icono}</div>
            <div class="informacion">
                <span class="categoria">${e.categoria}</span>
                <h3>${e.nombre}</h3>
                <p>Cupo disponible: ${e.cupo}</p>
                <p class="precio">$${e.precio} MXN</p>
                <label>Personas:
                    <input type="number" id="cantidad-${e.id}" min="1" max="${e.cupo}" value="1">
                </label>
                <button class="btn-reservar" data-id="${e.id}">Agregar</button>
            </div>
        </article>`).join("");
    estado.textContent = `${resultados.length} resultados`;
    agregarEventosReservar();
}

function agregarEventosReservar() {
    document.querySelectorAll(".btn-reservar").forEach(boton => {
        boton.addEventListener("click", () => agregarReserva(Number(boton.dataset.id)));
    });
}

function agregarReserva(id) {
    const experiencia = experiencias.find(e => e.id === id);
    const cantidad = Number(document.querySelector(`#cantidad-${id}`).value);
    if (cantidad < 1 || cantidad > experiencia.cupo) {
        alert("Cantidad no válida");
        return;
    }
    const existente = reservas.find(r => r.experienciaId === id);
    if (existente) {
        const nuevaCantidad = existente.cantidad + cantidad;
        if (nuevaCantidad > experiencia.cupo) {
            alert("La cantidad supera el cupo disponible");
            return;
        }
        existente.cantidad = nuevaCantidad;
        existente.subtotal = nuevaCantidad * experiencia.precio;
    } else {
        reservas.push({ experienciaId:id, nombre:experiencia.nombre,
            precio:experiencia.precio, cantidad,
            subtotal:experiencia.precio*cantidad });
    }
    mostrarReservas();
}

function mostrarReservas() {
    if (reservas.length === 0) {
        listaReservas.innerHTML = "<p>No hay experiencias seleccionadas.</p>";
        total.textContent = "$0 MXN";
        totalPersonas.textContent = "0"; // RETO
        return;
    }
    listaReservas.innerHTML = reservas.map(r => `
        <article class="item-reserva">
            <div>
                <strong>${r.nombre}</strong>
                <p>${r.cantidad} persona(s) × $${r.precio}</p>
                <div class="control-cantidad">
                    <button class="btn-cantidad" data-id="${r.experienciaId}" data-cambio="-1"
                        aria-label="Disminuir personas de ${r.nombre}">-</button>
                    <span>${r.cantidad}</span>
                    <button class="btn-cantidad" data-id="${r.experienciaId}" data-cambio="1"
                        aria-label="Aumentar personas de ${r.nombre}">+</button>
                </div>
            </div>
            <div>
                <strong>$${r.subtotal} MXN</strong>
                <button class="btn-eliminar" data-id="${r.experienciaId}">Eliminar</button>
            </div>
        </article>`).join("");
    const totalReserva = reservas.reduce((suma,r) => suma+r.subtotal, 0);
    total.textContent = `$${totalReserva} MXN`;
    // total de personas reservadas
    totalPersonas.textContent = reservas.reduce((suma,r) => suma+r.cantidad, 0);
    agregarEventosEliminar();
    agregarEventosCantidad(); // RETO
}

function agregarEventosEliminar() {
    document.querySelectorAll(".btn-eliminar").forEach(boton => {
        boton.addEventListener("click", () => eliminarReserva(Number(boton.dataset.id)));
    });
}

function eliminarReserva(id) {
    reservas = reservas.filter(r => r.experienciaId !== id);
    mostrarReservas();
}

// 

// Muestra un mensaje dentro de la página (tipo: "error" o "exito")
function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = "mensaje " + tipo;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
        mensaje.textContent = "";
        mensaje.className = "mensaje";
    }, 4000);
}

// Asigna eventos a los botones + y - de Mi reservación
function agregarEventosCantidad() {
    document.querySelectorAll(".btn-cantidad").forEach(boton => {
        boton.addEventListener("click", () => {
            cambiarCantidad(Number(boton.dataset.id), Number(boton.dataset.cambio));
        });
    });
}

// Aumenta o disminuye la cantidad de personas de una reserva
function cambiarCantidad(id, cambio) {
    const reserva = reservas.find(r => r.experienciaId === id);
    const experiencia = experiencias.find(e => e.id === id);
    const nuevaCantidad = reserva.cantidad + cambio;
    if (nuevaCantidad < 1) {
        mostrarMensaje("La cantidad mínima es 1. Si ya no la quieres, usa Eliminar.", "error");
        return;
    }
    if (nuevaCantidad > experiencia.cupo) {
        mostrarMensaje(`El cupo máximo de ${experiencia.nombre} es ${experiencia.cupo}.`, "error");
        return;
    }
    reserva.cantidad = nuevaCantidad;
    reserva.subtotal = nuevaCantidad * reserva.precio;
    mostrarReservas();
}

// Vaciar reservación con confirmación dentro de la página
btnVaciar.addEventListener("click", () => {
    if (reservas.length === 0) {
        mostrarMensaje("No hay nada que vaciar, la reservación ya está vacía.", "error");
        return;
    }
    confirmacion.hidden = false;
});

btnConfirmarVaciar.addEventListener("click", () => {
    reservas = [];
    confirmacion.hidden = true;
    mostrarReservas();
    mostrarMensaje("La reservación se vació correctamente.", "exito");
});

btnCancelarVaciar.addEventListener("click", () => {
    confirmacion.hidden = true;
});

// Filtro de precio máximo
filtroPrecio.addEventListener("input", () => {
    const valor = filtroPrecio.value;
    precioMaximo = valor === "" ? "" : Number(valor);
    actualizarCatalogo();
});

buscador.addEventListener("input", () => {
    textoBusqueda = buscador.value.trim().toLowerCase();
    actualizarCatalogo();
});

filtroCategoria.addEventListener("change", () => {
    categoriaActual = filtroCategoria.value;
    actualizarCatalogo();
});

ordenPrecio.addEventListener("change", () => {
    ordenActual = ordenPrecio.value;
    actualizarCatalogo();
});

cargarExperiencias();