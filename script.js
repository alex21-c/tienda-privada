// ==================== CONFIGURACIÓN ====================
const API_URL = 'https://script.google.com/macros/s/AKfycby6Lzye_pHp4FgWkm5WRFwQwrN42Yc32KtABgiVJKl2fCXFu2QoH7yQnAiNomZURhSbnw/exec';

let productos = [];
let carrito = [];
let productoActual = null;
let esAdmin = false;
let colorSeleccionado = null;
let tallaSeleccionada = null;

// ==================== VARIABLES DE FILTROS ====================
let filtroPlataforma = 'todos';
let filtroGenero = 'todos';

// ==================== CARGAR PRODUCTOS ====================
async function cargarProductos() {
    try {
        const response = await fetch(`${API_URL}?action=getProductos`);
        const datos = await response.json();
        
        if (datos.error) {
            console.error('Error:', datos.error);
            const productosDiv = document.getElementById('productos');
            if (productosDiv) productosDiv.innerHTML = '<p class="loading">❌ Error: ' + datos.error + '</p>';
            return;
        }
        
        productos = datos;
        
        if (productos.length === 0) {
            const productosDiv = document.getElementById('productos');
            if (productosDiv) productosDiv.innerHTML = '<p class="loading">📦 No hay productos. Agrega productos en Google Sheets.</p>';
            return;
        }
        
        mostrarProductos();
    } catch (error) {
        console.error('Error cargando productos:', error);
        const productosDiv = document.getElementById('productos');
        if (productosDiv) productosDiv.innerHTML = '<p class="loading">❌ Error de conexión. Asegúrate que la API_URL es correcta.</p>';
    }
}

// ==================== FUNCIÓN PARA ICONO DE GÉNERO ====================
function getIconoGenero(genero) {
    const iconos = {
        'hombre': '👨',
        'mujer': '👩',
        'niño': '👦',
        'niña': '👧',
        'unisex': '👥'
    };
    return iconos[genero] || '👤';
}

// ==================== MOSTRAR PRODUCTOS CON FILTROS ====================
function mostrarProductos() {
    const contenedor = document.getElementById('productos');
    if (!contenedor) return;
    
    let productosFiltrados = productos;
    
    if (filtroPlataforma !== 'todos') {
        productosFiltrados = productosFiltrados.filter(p => p.origen === filtroPlataforma);
    }
    
    if (filtroGenero !== 'todos') {
        productosFiltrados = productosFiltrados.filter(p => p.genero === filtroGenero);
    }
    
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
            <div class="producto-genero">${getIconoGenero(producto.genero)} ${producto.genero || 'Unisex'}</div>
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

// ==================== MOSTRAR MODAL ====================
function mostrarModal(productoId) {
    console.log("Mostrando modal para producto:", productoId);
    
    const producto = productos.find(p => p.id == productoId);
    if (!producto) {
        console.error("Producto no encontrado:", productoId);
        return;
    }
    
    console.log("Producto encontrado:", producto.nombre);
    
    productoActual = producto;
    colorSeleccionado = null;
    tallaSeleccionada = null;
    
    // Elementos del modal
    const modal = document.getElementById('producto-modal');
    const modalImagen = document.getElementById('modal-imagen');
    const modalNombre = document.getElementById('modal-nombre');
    const modalOrigen = document.getElementById('modal-origen');
    const modalGenero = document.getElementById('modal-genero');
    const modalPrecio = document.getElementById('modal-precio');
    const modalDescripcion = document.getElementById('modal-descripcion');
    const modalColores = document.getElementById('modal-colores');
    const variantesDiv = document.getElementById('modal-variantes');
    
    if (!modal) {
        console.error("Modal no encontrado");
        return;
    }
    
    // Llenar datos básicos
    if (modalImagen) {
        const imagenUrl = (producto.colores && producto.colores[0]) ? producto.colores[0].imagen : producto.imagen;
        modalImagen.src = imagenUrl;
    }
    
    if (modalNombre) modalNombre.textContent = producto.nombre;
    
    if (modalOrigen) {
        modalOrigen.textContent = producto.origen;
        modalOrigen.className = `origen-${producto.origen.toLowerCase()}`;
    }
    
    if (modalGenero) {
        modalGenero.textContent = `${getIconoGenero(producto.genero)} ${producto.genero || 'Unisex'}`;
    }
    
    if (modalPrecio) {
        modalPrecio.textContent = `$${producto.precio.toFixed(2)}`;
        modalPrecio.style.color = '#2ecc71';
    }
    
    if (modalDescripcion) {
        const descripcion = producto.descripcion || `Producto de alta calidad de ${producto.origen}.`;
        modalDescripcion.textContent = descripcion;
    }
    
    mostrarEnlaceAdmin(producto.enlace);
    
    // ========== LÓGICA CORREGIDA ==========
    // Caso 1: Producto CON colores
    if (producto.colores && producto.colores.length > 0) {
        if (modalColores) modalColores.style.display = 'block';
        mostrarSelectoresColor(producto.colores);
    } 
    // Caso 2: Producto SIN colores PERO CON tallas
    else if (producto.tiene_variantes && producto.variantes && producto.variantes.length > 0) {
        if (modalColores) modalColores.style.display = 'none';
        // Mostrar directamente las tallas
        mostrarTallasDirectas(producto.variantes);
    }
    // Caso 3: Producto sin colores ni tallas
    else {
        if (modalColores) modalColores.style.display = 'none';
        if (variantesDiv) variantesDiv.style.display = 'none';
    }
    
    modal.style.display = 'flex';
    console.log("Modal mostrado");
}

// ==================== MOSTRAR TALLAS DIRECTAS (SIN COLORES) ====================
function mostrarTallasDirectas(variantes) {
    const variantesDiv = document.getElementById('modal-variantes');
    const selectorVariante = document.getElementById('selector-variante');
    
    if (!variantesDiv) return;
    
    if (variantes && variantes.length > 0) {
        variantesDiv.style.display = 'block';
        selectorVariante.innerHTML = '<option value="">Selecciona una talla</option>';
        
        variantes.forEach(t => {
            const option = document.createElement('option');
            option.value = t.precio;
            option.setAttribute('data-talla', t.talla);
            option.textContent = `${t.talla} - $${t.precio.toFixed(2)}`;
            selectorVariante.appendChild(option);
        });
        
        selectorVariante.onchange = function() {
            if (this.value) {
                const precioSeleccionado = parseFloat(this.value);
                const tallaSeleccionadaNombre = this.options[this.selectedIndex].getAttribute('data-talla');
                tallaSeleccionada = {
                    talla: tallaSeleccionadaNombre,
                    precio: precioSeleccionado
                };
                const modalPrecio = document.getElementById('modal-precio');
                if (modalPrecio) {
                    modalPrecio.textContent = `$${precioSeleccionado.toFixed(2)}`;
                    modalPrecio.style.fontWeight = 'bold';
                }
            } else {
                tallaSeleccionada = null;
                const modalPrecio = document.getElementById('modal-precio');
                if (modalPrecio && productoActual) {
                    modalPrecio.textContent = `$${productoActual.precio.toFixed(2)}`;
                }
            }
        };
    } else {
        variantesDiv.style.display = 'none';
        tallaSeleccionada = null;
    }
}

// ==================== SELECTORES DE COLOR ====================
function mostrarSelectoresColor(colores) {
    const container = document.getElementById('selector-color');
    if (!container) return;
    
    container.innerHTML = '';
    
    colores.forEach((color, index) => {
        const btn = document.createElement('button');
        btn.textContent = color.nombre;
        btn.style.padding = '8px 20px';
        btn.style.border = index === 0 ? '2px solid #9CAF88' : '2px solid #E8E6E1';
        btn.style.background = index === 0 ? '#9CAF88' : 'white';
        btn.style.borderRadius = '40px';
        btn.style.color = index === 0 ? 'white' : '#C4B7A6';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = '500';
        
        btn.onclick = () => {
            document.querySelectorAll('#selector-color button').forEach(b => {
                b.style.border = '2px solid #E8E6E1';
                b.style.background = 'white';
                b.style.color = '#C4B7A6';
            });
            btn.style.border = '2px solid #9CAF88';
            btn.style.background = '#9CAF88';
            btn.style.color = 'white';
            
            colorSeleccionado = color;
            
            const modalImagen = document.getElementById('modal-imagen');
            if (modalImagen) modalImagen.src = color.imagen;
            
            const modalPrecio = document.getElementById('modal-precio');
            if (modalPrecio) {
                modalPrecio.textContent = `$${color.precio.toFixed(2)}`;
                modalPrecio.style.color = '#2ecc71';
            }
            
            mostrarTallas(color.tallas);
        };
        
        container.appendChild(btn);
    });
    
    if (colores.length > 0) {
        colorSeleccionado = colores[0];
        const modalPrecio = document.getElementById('modal-precio');
        if (modalPrecio) {
            modalPrecio.textContent = `$${colores[0].precio.toFixed(2)}`;
        }
        mostrarTallas(colores[0].tallas);
    }
}

// ==================== MOSTRAR TALLAS ====================
function mostrarTallas(tallas) {
    const variantesDiv = document.getElementById('modal-variantes');
    const selectorVariante = document.getElementById('selector-variante');
    
    if (!variantesDiv) return;
    
    if (tallas && tallas.length > 0) {
        variantesDiv.style.display = 'block';
        selectorVariante.innerHTML = '<option value="">Selecciona una talla</option>';
        
        tallas.forEach(t => {
            const option = document.createElement('option');
            option.value = t.precio;
            option.setAttribute('data-talla', t.talla);
            option.textContent = `${t.talla} - $${t.precio.toFixed(2)}`;
            selectorVariante.appendChild(option);
        });
        
        selectorVariante.onchange = function() {
            if (this.value) {
                const precioSeleccionado = parseFloat(this.value);
                const tallaSeleccionadaNombre = this.options[this.selectedIndex].getAttribute('data-talla');
                tallaSeleccionada = {
                    talla: tallaSeleccionadaNombre,
                    precio: precioSeleccionado
                };
                const modalPrecio = document.getElementById('modal-precio');
                if (modalPrecio) {
                    modalPrecio.textContent = `$${precioSeleccionado.toFixed(2)}`;
                    modalPrecio.style.fontWeight = 'bold';
                }
            } else {
                tallaSeleccionada = null;
                const modalPrecio = document.getElementById('modal-precio');
                if (modalPrecio && colorSeleccionado) {
                    modalPrecio.textContent = `$${colorSeleccionado.precio.toFixed(2)}`;
                }
            }
        };
    } else {
        variantesDiv.style.display = 'none';
        tallaSeleccionada = null;
    }
}

// ==================== AGREGAR DESDE MODAL ====================
function agregarDesdeModal() {
    if (!productoActual) return;
    
    let precioFinal = productoActual.precio;
    let nombreFinal = productoActual.nombre;
    
    // Caso 1: Producto CON colores
    if (productoActual.colores && productoActual.colores.length > 0) {
        if (!colorSeleccionado) {
            alert('⚠️ Por favor selecciona un color');
            return;
        }
        precioFinal = colorSeleccionado.precio;
        nombreFinal = `${productoActual.nombre} (${colorSeleccionado.nombre})`;
        
        if (tallaSeleccionada) {
            precioFinal = tallaSeleccionada.precio;
            nombreFinal = `${productoActual.nombre} (${colorSeleccionado.nombre} - Talla: ${tallaSeleccionada.talla})`;
        }
    } 
    // Caso 2: Producto SIN colores PERO CON tallas
    else if (productoActual.tiene_variantes && productoActual.variantes && productoActual.variantes.length > 0) {
        if (!tallaSeleccionada) {
            alert('⚠️ Por favor selecciona una talla');
            return;
        }
        precioFinal = tallaSeleccionada.precio;
        nombreFinal = `${productoActual.nombre} (Talla: ${tallaSeleccionada.talla})`;
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
    alert(`✅ Agregado: ${nombreFinal} por $${precioFinal.toFixed(2)}`);
}

function cerrarModal() {
    const modal = document.getElementById('producto-modal');
    if (modal) modal.style.display = 'none';
    productoActual = null;
    colorSeleccionado = null;
    tallaSeleccionada = null;
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
    
    // Si tiene colores o tallas, abrir modal
    if ((producto.colores && producto.colores.length > 0) || 
        (producto.tiene_variantes && producto.variantes && producto.variantes.length > 0)) {
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
    alert(`✅ Agregado: ${producto.nombre} por $${producto.precio.toFixed(2)}`);
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
        telefono: datosCliente.telefono,  
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
            filtroPlataforma = btn.dataset.filtro;
            
            const filtrosGenero = document.getElementById('filtros-genero');
            if (filtroPlataforma !== 'todos') {
                if (filtrosGenero) filtrosGenero.style.display = 'flex';
                filtroGenero = 'todos';
                document.querySelectorAll('.filtro-genero-btn').forEach(b => b.classList.remove('active'));
                const btnTodos = document.querySelector('.filtro-genero-btn[data-genero="todos"]');
                if (btnTodos) btnTodos.classList.add('active');
            } else {
                if (filtrosGenero) filtrosGenero.style.display = 'none';
                filtroGenero = 'todos';
            }
            
            mostrarProductos();
        });
    });
    
    document.querySelectorAll('.filtro-genero-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filtro-genero-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filtroGenero = btn.dataset.genero;
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
        const password = prompt('🔐 Modo Administrador - Ingresa la contraseña:');
        if (password === 'admin123') {
            esAdmin = true;
            localStorage.setItem('adminSession', 'true');
            alert('✅ Modo administrador activado');
        } else {
            alert('❌ Contraseña incorrecta');
            window.location.href = window.location.pathname;
        }
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
