// ==================== CONFIGURACIÓN ====================
// 🔴 ¡IMPORTANTE! Cambia esta URL por la de tu Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbxE6pKdR4iVkoMuxkwbAPl3WsBO-t6iE8VtDJs63s_BNoKWUdhUlAYK43faykuA4BqV7w/exec';

let productos = [];
let carrito = [];

// ==================== CARGAR PRODUCTOS DESDE GOOGLE SHEETS ====================
async function cargarProductos() {
    try {
        const response = await fetch(`${API_URL}?action=getProductos`);
        const datos = await response.json();
        
        // Verificar si hay error
        if (datos.error) {
            console.error('Error:', datos.error);
            document.getElementById('productos').innerHTML = '<p class="loading">❌ Error cargando productos. Verifica la URL del API.</p>';
            return;
        }
        
        productos = datos;
        
        if (productos.length === 0) {
            document.getElementById('productos').innerHTML = '<p class="loading">📦 No hay productos. Agrega productos en Google Sheets (hoja "productos").</p>';
            return;
        }
        
        mostrarProductos();
    } catch (error) {
        console.error('Error cargando productos:', error);
        document.getElementById('productos').innerHTML = '<p class="loading">❌ Error de conexión. Asegúrate que la API_URL es correcta.</p>';
    }
}

// ==================== MOSTRAR PRODUCTOS ====================
let filtroActual = 'todos';

function mostrarProductos() {
    const contenedor = document.getElementById('productos');
    const productosFiltrados = filtroActual === 'todos' 
        ? productos 
        : productos.filter(p => p.origen === filtroActual);
    
    if (productosFiltrados.length === 0) {
        contenedor.innerHTML = '<p class="loading">No hay productos en esta categoría</p>';
        return;
    }
    
    contenedor.innerHTML = '';
    productosFiltrados.forEach(producto => {
        const card = document.createElement('div');
        card.className = 'producto-card';
        card.innerHTML = `
            <img src="${producto.imagen}" alt="${producto.nombre}" class="producto-imagen" onerror="this.src='https://via.placeholder.com/300x200?text=Sin+imagen'">
            <div class="producto-origen origen-${producto.origen.toLowerCase()}">${producto.origen}</div>
            <h3 class="producto-titulo">${producto.nombre}</h3>
            <div class="producto-precio">$${producto.precio.toFixed(2)}</div>
            <button class="btn-agregar" data-id="${producto.id}">➕ Agregar</button>
        `;
        contenedor.appendChild(card);
    });
    
    document.querySelectorAll('.btn-agregar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            agregarAlCarrito(id);
        });
    });
}

// ==================== CARRITO ====================
function agregarAlCarrito(id) {
    const producto = productos.find(p => p.id == id);
    const existente = carrito.find(item => item.id == id);
    
    if (existente) {
        existente.cantidad++;
    } else {
        carrito.push({...producto, cantidad: 1});
    }
    
    guardarCarrito();
    actualizarCarrito();
}

function guardarCarrito() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

function actualizarCarrito() {
    const listaCarrito = document.getElementById('carrito-lista');
    const totalSpan = document.getElementById('total');
    const formularioDiv = document.getElementById('formulario-datos');
    
    if (carrito.length === 0) {
        listaCarrito.innerHTML = '<p class="vacio">Carrito vacío</p>';
        totalSpan.textContent = '0.00';
        formularioDiv.style.display = 'none';
        return;
    }
    
    formularioDiv.style.display = 'block';
    listaCarrito.innerHTML = '';
    let total = 0;
    
    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item-carrito';
        itemDiv.innerHTML = `
            <div>
                <strong>${item.nombre}</strong> (${item.origen})<br>
                $${item.precio} x ${item.cantidad} = $${subtotal.toFixed(2)}
            </div>
            <button class="btn-eliminar" data-id="${item.id}">🗑️</button>
        `;
        listaCarrito.appendChild(itemDiv);
    });
    
    totalSpan.textContent = total.toFixed(2);
    
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            carrito = carrito.filter(item => item.id != id);
            guardarCarrito();
            actualizarCarrito();
        });
    });
}

// ==================== ENVIAR PEDIDO ====================
async function enviarPedido(datosCliente) {
    let detalleProductos = '';
    let total = 0;
    
    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        detalleProductos += `${item.nombre} (${item.origen}) x${item.cantidad} - $${subtotal.toFixed(2)}\n`;
    });
    
    const pedido = {
        nombre: datosCliente.nombre,
        direccion: datosCliente.direccion,
        metodoPago: datosCliente.metodoPago,
        estadoPago: 'Pendiente',
        productos: detalleProductos,
        total: total.toFixed(2),
        idPedido: Date.now().toString()
    };
    
    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(pedido)
        });
        
        alert('✅ ¡Pedido enviado! Te contactaremos pronto.');
        carrito = [];
        guardarCarrito();
        actualizarCarrito();
        document.getElementById('pedido-form').reset();
        return true;
    } catch (error) {
        alert('❌ Error al enviar. Por favor intenta de nuevo.');
        return false;
    }
}

// ==================== FILTROS ====================
function configurarFiltros() {
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filtroActual = btn.dataset.filtro;
            mostrarProductos();
        });
    });
}

// ==================== FORMULARIO ====================
function configurarFormulario() {
    document.getElementById('pedido-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombre').value;
        const direccion = document.getElementById('direccion').value;
        const metodoPago = document.getElementById('metodo-pago').value;
        
        if (!nombre || !direccion || !metodoPago) {
            alert('Completa todos los campos');
            return;
        }
        
        await enviarPedido({nombre, direccion, metodoPago});
    });
}

// ==================== INICIAR ====================
async function init() {
    await cargarProductos();
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) carrito = JSON.parse(carritoGuardado);
    actualizarCarrito();
    configurarFiltros();
    configurarFormulario();
}

init();
