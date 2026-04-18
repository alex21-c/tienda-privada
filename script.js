// ==================== CONFIGURACIÓN ====================
const API_URL = 'https://script.google.com/macros/s/AKfycby6Lzye_pHp4FgWkm5WRFwQwrN42Yc32KtABgiVJKl2fCXFu2QoH7yQnAiNomZURhSbnw/exec';

let productos = [];
let carrito = [];
let productoActual = null;
let varianteSeleccionada = null;
let esAdmin = false;

// ==================== CARGAR PRODUCTOS ====================
async function cargarProductos() {
    try {
        const response = await fetch(`${API_URL}?action=getProductos`);
        const datos = await response.json();
        
        if (datos.error) {
            console.error('Error:', datos.error);
            document.getElementById('productos').innerHTML = '<p class="loading">❌ Error: ' + datos.error + '</p>';
            return;
        }
        
        productos = datos;
        
        if (productos.length === 0) {
            document.getElementById('productos').innerHTML = '<p class="loading">📦 No hay productos. Agrega productos en Google Sheets.</p>';
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
        card.style.cursor = 'pointer';
        
        card.innerHTML = `
            <img src="${producto.imagen}" alt="${producto.nombre}" class="producto-imagen" onerror="this.src='https://via.placeholder.com/300x200?text=Sin+imagen'">
            <div class="producto-origen origen-${producto.origen.toLowerCase()}">${producto.origen}</div>
            <h3 class="producto-titulo">${producto.nombre}</h3>
            <div class="producto-precio">$${producto.precio.toFixed(2)}</div>
            <button class="btn-agregar" data-id="${producto.id}">➕ Agregar</button>
        `;
        
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn-agregar')) {
                mostrarModal(producto.id);
            }
        });
        
        contenedor.appendChild(card);
    });
    
    document.querySelectorAll('.btn-agregar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            agregarAlCarrito(id);
        });
    });
}

// ==================== MODAL CON VARIANTES ====================
function mostrarModal(productoId) {
    const producto = productos.find(p => p.id == productoId);
    if (!producto) return;
    
    productoActual = producto;
    varianteSeleccionada = null;
    
    // Llenar datos básicos
    document.getElementById('modal-imagen').src = producto.imagen;
    document.getElementById('modal-nombre').textContent = producto.nombre;
    
    const origenSpan = document.getElementById('modal-origen');
    origenSpan.textContent = producto.origen;
    origenSpan.className = `origen-${producto.origen.toLowerCase()}`;
    
    const descripcion = producto.descripcion || `Producto de alta calidad de ${producto.origen}.`;
    document.getElementById('modal-descripcion').textContent = descripcion;
    
    // Mostrar enlace oculto para admin
    mostrarEnlaceAdmin(producto.enlace);
    
    // Manejar variantes (tallas)
    const variantesDiv = document.getElementById('modal-variantes');
    const selectorVariante = document.getElementById('selector-variante');
    const precioElement = document.getElementById('modal-precio');
    
    if (producto.tiene_variantes && producto.variantes && producto.variantes.length > 0) {
        variantesDiv.style.display = 'block';
        selectorVariante.innerHTML = '<option value="">Selecciona una talla</option>';
        
        producto.variantes.forEach(v => {
            const option = document.createElement('option');
            option.value = v.precio;
            option.setAttribute('data-talla', v.talla);
            option.textContent = `${v.talla} - $${v.precio.toFixed(2)}`;
            selectorVariante.appendChild(option);
        });
        
        precioElement.textContent = `$${producto.precio.toFixed(2)}`;
        precioElement.style.color = '#999';
        
        selectorVariante.onchange = function() {
            if (this.value) {
                const precioSeleccionado = parseFloat(this.value);
                const tallaSeleccionada = this.options[this.selectedIndex].getAttribute('data-talla');
                varianteSeleccionada = {
                    talla: tallaSeleccionada,
                    precio: precioSeleccionado
                };
                precioElement.textContent = `$${precioSeleccionado.toFixed(2)}`;
                precioElement.style.color = '#2ecc71';
                precioElement.style.fontWeight = 'bold';
            } else {
                varianteSeleccionada = null;
                precioElement.textContent = `$${producto.precio.toFixed(2)}`;
                precioElement.style.color = '#999';
            }
        };
    } else {
        variantesDiv.style.display = 'none';
        precioElement.textContent = `$${producto.precio.toFixed(2)}`;
        precioElement.style.color = '#2ecc71';
    }
    
    document.getElementById('producto-modal').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('producto-modal').style.display = 'none';
    productoActual = null;
    varianteSeleccionada = null;
}

function agregarDesdeModal() {
    if (!productoActual) return;
    
    let precioFinal = productoActual.precio;
    let nombreFinal = productoActual.nombre;
    
    if (productoActual.tiene_variantes && productoActual.variantes && productoActual.variantes.length > 0) {
        if (!varianteSeleccionada) {
            alert('⚠️ Por favor selecciona una talla antes de agregar al carrito');
            return;
        }
        precioFinal = varianteSeleccionada.precio;
        nombreFinal = `${productoActual.nombre} (Talla: ${varianteSeleccionada.talla})`;
    }
    
    const existente = carrito.find(item => item.id === productoActual.id && item.nombre === nombreFinal);
    
    if (existente) {
        existente.cantidad++;
    } else {
        carrito.push({
            id: productoActual.id,
            nombre: nombreFinal,
            precio: precioFinal,
            origen: productoActual.origen,
            cantidad: 1
        });
    }
    
    guardarCarrito();
    actualizarCarrito();
    cerrarModal();
}

function configurarModal() {
    const modal = document.getElementById('producto-modal');
    const cerrar = document.querySelector('.modal-cerrar');
    
    if (cerrar) cerrar.onclick = cerrarModal;
    if (modal) {
        window.onclick = function(event) {
            if (event.target == modal) cerrarModal();
        }
    }
    const btnModal = document.getElementById('modal-agregar');
    if (btnModal) btnModal.onclick = agregarDesdeModal;
}

// ==================== CARRITO ====================
function agregarAlCarrito(id) {
    const producto = productos.find(p => p.id == id);
    if (!producto) return;
    
    if (producto.tiene_variantes && producto.variantes && producto.variantes.length > 0) {
        mostrarModal(id);
        return;
    }
    
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
        if (listaCarrito) listaCarrito.innerHTML = '<p class="vacio">Carrito vacío</p>';
        if (totalSpan) totalSpan.textContent = '0.00';
        if (formularioDiv) formularioDiv.style.display = 'none';
        return;
    }
    
    if (formularioDiv) formularioDiv.style.display = 'block';
    if (listaCarrito) listaCarrito.innerHTML = '';
    let total = 0;
    
    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item-carrito';
        itemDiv.innerHTML = `
            <div>
                <strong>${item.nombre}</strong> (${item.origen})<br>
                $${item.precio.toFixed(2)} x ${item.cantidad} = $${subtotal.toFixed(2)}
            </div>
            <button class="btn-eliminar" data-id="${item.id}" data-nombre="${item.nombre}">🗑️</button>
        `;
        if (listaCarrito) listaCarrito.appendChild(itemDiv);
    });
    
    if (totalSpan) totalSpan.textContent = total.toFixed(2);
    
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            const nombre = btn.dataset.nombre;
            carrito = carrito.filter(item => !(item.id == id && item.nombre == nombre));
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
        const form = document.getElementById('pedido-form');
        if (form) form.reset();
        return true;
    } catch (error) {
        alert('❌ Error al enviar. Por favor intenta de nuevo.');
        return false;
    }
}

// ==================== FILTROS Y FORMULARIO ====================
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

function configurarFormulario() {
    const form = document.getElementById('pedido-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
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
}

// ==================== ENLACE OCULTO PARA ADMIN ====================
function verificarAdmin() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
        esAdmin = true;
        localStorage.setItem('adminSession', 'true');
    }
    if (localStorage.getItem('adminSession') === 'true') {
        esAdmin = true;
    }
    return esAdmin;
}

function mostrarEnlaceAdmin(enlace) {
    const enlaceDiv = document.getElementById('modal-enlace-admin');
    const enlaceElement = document.getElementById('modal-enlace');
    const copiarBtn = document.getElementById('copiar-enlace');
    
    if (esAdmin && enlace && enlace !== '') {
        if (enlaceDiv) enlaceDiv.style.display = 'block';
        if (enlaceElement) {
            enlaceElement.href = enlace;
            enlaceElement.textContent = enlace;
        }
        if (copiarBtn) {
            copiarBtn.onclick = () => {
                navigator.clipboard.writeText(enlace);
                copiarBtn.textContent = '✅ Copiado!';
                setTimeout(() => {
                    copiarBtn.textContent = '📋 Copiar enlace';
                }, 2000);
            };
        }
    } else {
        if (enlaceDiv) enlaceDiv.style.display = 'none';
    }
}

// ==================== INICIAR ====================
async function init() {
    verificarAdmin();
    await cargarProductos();
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) carrito = JSON.parse(carritoGuardado);
    actualizarCarrito();
    configurarFiltros();
    configurarFormulario();
    configurarModal();
}

init();
