// Configuración
let productos = [];
let carrito = [];

// Cargar productos desde el archivo JSON
async function cargarProductos() {
    try {
        const response = await fetch('productos.json');
        productos = await response.json();
        mostrarProductos();
    } catch (error) {
        console.error('Error cargando productos:', error);
        document.getElementById('productos').innerHTML = '<p class="loading">Error cargando productos. Asegúrate que productos.json existe.</p>';
    }
}

// Mostrar productos con filtro
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

// Agregar al carrito
function agregarAlCarrito(id) {
    const producto = productos.find(p => p.id === id);
    const existente = carrito.find(item => item.id === id);
    
    if (existente) {
        existente.cantidad++;
    } else {
        carrito.push({...producto, cantidad: 1});
    }
    
    guardarCarrito();
    actualizarCarrito();
}

// Guardar carrito
function guardarCarrito() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

// Actualizar visualización del carrito
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
            carrito = carrito.filter(item => item.id !== id);
            guardarCarrito();
            actualizarCarrito();
        });
    });
}

// Enviar pedido a Google Sheets
async function enviarPedido(datosCliente) {
    const webhookUrl = localStorage.getItem('webhookUrl');
    if (!webhookUrl) {
        alert('⚠️ Error de configuración. Por favor contacta al administrador.');
        return false;
    }
    
    let detalleProductos = '';
    let total = 0;
    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        detalleProductos += `${item.nombre} (${item.origen}) x${item.cantidad} - $${subtotal}\n`;
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
        const response = await fetch(webhookUrl, {
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

// Configurar filtros
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

// Configurar formulario
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

// Mostrar panel admin si es el administrador
function mostrarPanelAdmin() {
    // Si la URL tiene ?admin=true o si el usuario confirma contraseña
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
        document.getElementById('admin-panel').style.display = 'block';
    }
}

// Inicializar
async function init() {
    await cargarProductos();
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) carrito = JSON.parse(carritoGuardado);
    actualizarCarrito();
    configurarFiltros();
    configurarFormulario();
    mostrarPanelAdmin();
}

init();