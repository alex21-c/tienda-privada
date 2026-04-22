// ==================== CONFIGURACIÓN ====================
const API_URL = 'https://script.google.com/macros/s/AKfycby6Lzye_pHp4FgWkm5WRFwQwrN42Yc32KtABgiVJKl2fCXFu2QoH7yQnAiNomZURhSbnw/exec';

let productos = [];
let carrito = [];
let productoActual = null;
let esAdmin = false;
let colorSeleccionado = null;
let tallaSeleccionada = null;
let pedidoPendiente = null;

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
    
    if (producto.colores && producto.colores.length > 0) {
        if (modalColores) modalColores.style.display = 'block';
        mostrarSelectoresColor(producto.colores);
    } 
    else if (producto.tiene_variantes && producto.variantes && producto.variantes.length > 0) {
        if (modalColores) modalColores.style.display = 'none';
        mostrarTallasDirectas(producto.variantes);
    }
    else {
        if (modalColores) modalColores.style.display = 'none';
        if (variantesDiv) variantesDiv.style.display = 'none';
    }
    
    modal.style.display = 'flex';
    console.log("Modal mostrado");
    
    // ✅✅✅ AGREGAR ESTA LÍNEA AQUÍ - Configurar zoom en la imagen ✅✅✅
    configurarZoomEnModalProducto();
}
// ==================== MOSTRAR TALLAS DIRECTAS ====================
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
        btn.style.border = index === 0 ? '2px solid #00D4FF' : '2px solid #222222';
        btn.style.background = index === 0 ? '#00D4FF' : 'transparent';
        btn.style.borderRadius = '40px';
        btn.style.color = index === 0 ? '#0A0A0A' : '#888888';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = '500';
        btn.style.transition = 'all 0.3s ease';
        
        btn.onclick = () => {
            document.querySelectorAll('#selector-color button').forEach(b => {
                b.style.border = '2px solid #222222';
                b.style.background = 'transparent';
                b.style.color = '#888888';
            });
            btn.style.border = '2px solid #00D4FF';
            btn.style.background = '#00D4FF';
            btn.style.color = '#0A0A0A';
            
            colorSeleccionado = color;
            
            const modalImagen = document.getElementById('modal-imagen');
            if (modalImagen) modalImagen.src = color.imagen;
            
            const modalPrecio = document.getElementById('modal-precio');
            if (modalPrecio) {
                modalPrecio.textContent = `$${color.precio.toFixed(2)}`;
                modalPrecio.style.color = '#00D4FF';
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
}

function cerrarModal() {
    const modal = document.getElementById('producto-modal');
    if (modal) modal.style.display = 'none';
    productoActual = null;
    colorSeleccionado = null;
    tallaSeleccionada = null;
    
    // ✅ Cerrar zoom si estaba abierto
    if (window.cerrarZoomImagen) {
        window.cerrarZoomImagen();
    }
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
}

function guardarCarrito() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

function actualizarCarrito() {
    actualizarCarritoTop();
    
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
    
    document.querySelectorAll('#carrito-lista .btn-eliminar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            const nombre = btn.dataset.nombre;
            carrito = carrito.filter(item => !(item.id == id && item.nombre == nombre));
            guardarCarrito();
            actualizarCarrito();
        });
    });
}

// ==================== CARRITO SUPERIOR ====================
function actualizarCarritoTop() {
    const contadorSpan = document.getElementById('carrito-contador');
    const totalPanel = document.getElementById('total-panel');
    const listaPanel = document.getElementById('carrito-lista-panel');
    
    if (!contadorSpan) return;
    
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    contadorSpan.textContent = totalItems;
    
    if (totalPanel) {
        const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        totalPanel.textContent = total.toFixed(2);
    }
    
    if (listaPanel) {
        if (carrito.length === 0) {
            listaPanel.innerHTML = '<div class="vacio">✨ Tu carrito está vacío</div>';
        } else {
            listaPanel.innerHTML = '';
            carrito.forEach(item => {
                const subtotal = item.precio * item.cantidad;
                const itemDiv = document.createElement('div');
                itemDiv.className = 'item-carrito';
                itemDiv.innerHTML = `
                    <div>
                        <strong>${item.nombre}</strong><br>
                        $${item.precio.toFixed(2)} x ${item.cantidad} = $${subtotal.toFixed(2)}
                    </div>
                    <button class="btn-eliminar" data-id="${item.id}" data-nombre="${item.nombre}">🗑️</button>
                `;
                listaPanel.appendChild(itemDiv);
            });
            
            document.querySelectorAll('#carrito-lista-panel .btn-eliminar').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = parseInt(btn.dataset.id);
                    const nombre = btn.dataset.nombre;
                    carrito = carrito.filter(item => !(item.id == id && item.nombre == nombre));
                    guardarCarrito();
                    actualizarCarritoTop();
                    actualizarCarrito();
                });
            });
        }
    }
}

function toggleCarrito() {
    const panel = document.getElementById('carrito-panel');
    const overlay = document.getElementById('overlay');
    if (panel) panel.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
}

function cerrarCarrito() {
    const panel = document.getElementById('carrito-panel');
    const overlay = document.getElementById('overlay');
    if (panel) panel.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

// ==================== MODAL DE PAGO MODIFICADO ====================
function abrirModalPago() {
    const modal = document.getElementById('pago-modal');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalPago() {
    const modal = document.getElementById('pago-modal');
    if (modal) modal.style.display = 'none';
}

async function enviarPedidoModal() {
    const nombre = document.getElementById('nombre-modal').value;
    const telefono = document.getElementById('telefono-modal').value;
    const direccion = document.getElementById('direccion-modal').value;
    const metodoPago = document.getElementById('metodo-pago-modal').value;
    
    if (!nombre || !telefono || !direccion || !metodoPago) {
        alert('Completa todos los campos');
        return;
    }
    
    let detalleProductos = '';
    let totalProductos = 0;
    
    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        totalProductos += subtotal;
        detalleProductos += `${item.nombre} (${item.origen}) x${item.cantidad} - $${subtotal.toFixed(2)}\n`;
    });
    
    const costoEnvioLibra = 3.50;
    const costoDelivery = 1.00;
    const totalEnvio = costoEnvioLibra + costoDelivery;
    
    const pedido = {
        nombre: nombre,
        telefono: telefono,
        direccion: direccion,
        metodoPago: metodoPago,
        estadoPago: metodoPago === 'Yappy' ? 'Pendiente de pago' : 'Pendiente',
        productos: detalleProductos,
        totalProductos: totalProductos.toFixed(2),
        envioLibra: costoEnvioLibra,
        delivery: costoDelivery,
        envioTotal: totalEnvio.toFixed(2),
        idPedido: Date.now().toString()
    };
    
    // 🔴 IMPORTANTE: Guardar el pedido AHORA MISMO
    await guardarPedido(pedido);
    
    // Guardar el pedido pendiente para la verificación
    pedidoPendiente = pedido;
    
    // Cerrar modal de pago y carrito
    cerrarModalPago();
    cerrarCarrito();
    
    if (metodoPago === 'Yappy') {
        abrirModalYappy();
    } else {
        mostrarFactura(pedido);
    }
}
// ==================== YAPPY MODAL ====================
function abrirModalYappy() {
    const modal = document.getElementById('yappy-modal');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalYappy() {
    const modal = document.getElementById('yappy-modal');
    if (modal) modal.style.display = 'none';
}

function copiarNumeroYappy() {
    const numero = document.getElementById('yappy-telefono').textContent;
    navigator.clipboard.writeText(numero);
    const btn = document.getElementById('copiar-yappy');
    const textoOriginal = btn.textContent;
    btn.textContent = '✅ Copiado!';
    setTimeout(() => {
        btn.textContent = textoOriginal;
    }, 2000);
}

function abrirConfirmarPago() {
    cerrarModalYappy();
    const modal = document.getElementById('confirmar-pago-modal');
    if (modal) modal.style.display = 'flex';
}

function cerrarConfirmarPago() {
    const modal = document.getElementById('confirmar-pago-modal');
    if (modal) modal.style.display = 'none';
}

async function verificarPagoYGenerarFactura() {
    const nombreVerificar = document.getElementById('nombre-verificar').value;
    
    if (!nombreVerificar) {
        alert('Por favor ingresa tu nombre completo');
        return;
    }
    
    // Buscar el pedido por nombre en lugar de usar pedidoPendiente
    try {
        const response = await fetch(`${API_URL}?action=getPedidosByNombre&nombre=${encodeURIComponent(nombreVerificar)}`);
        const pedidos = await response.json();
        
        if (pedidos && pedidos.length > 0) {
            // Encontrar el pedido más reciente con estado "Pendiente de pago"
            const pedidoEncontrado = pedidos.find(p => p.estado === 'Pendiente de pago');
            
            if (pedidoEncontrado) {
                // Actualizar estado del pedido a "Pagado"
                await fetch(API_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'actualizarEstado',
                        fila: pedidoEncontrado.id,
                        estado: 'Pagado'
                    })
                });
                
                // Recargar los datos del pedido para la factura
                const pedidoCompleto = {
                    nombre: pedidoEncontrado.nombre,
                    telefono: pedidoEncontrado.telefono,
                    direccion: pedidoEncontrado.direccion,
                    metodoPago: pedidoEncontrado.metodoPago,
                    productos: pedidoEncontrado.productos,
                    totalProductos: pedidoEncontrado.total,
                    envioLibra: 3.50,
                    delivery: 1.00,
                    envioTotal: 4.50,
                    idPedido: pedidoEncontrado.idPedido
                };
                
                cerrarConfirmarPago();
                mostrarFactura(pedidoCompleto);
            } else {
                alert('❌ No encontramos un pedido pendiente con ese nombre. Verifica que escribiste el mismo nombre que usaste al hacer el pedido.');
            }
        } else {
            alert('❌ No encontramos un pedido con ese nombre. Verifica que escribiste el mismo nombre que usaste al hacer el pedido.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al verificar el pago. Intenta nuevamente.');
    }
}
// ==================== GUARDAR PEDIDO ====================
async function guardarPedido(pedido) {
    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedido)
        });
        carrito = [];
        guardarCarrito();
        actualizarCarrito();
        return true;
    } catch (error) {
        console.error('Error:', error);
        return false;
    }
}

// ==================== MOSTRAR FACTURA AESTHETIC ====================
function mostrarFactura(pedido) {
    console.log("Pedido recibido en mostrarFactura:", pedido); // Para depurar
    
    const facturaDiv = document.getElementById('factura-contenido');
    
    // Obtener el total de productos de diferentes formas posibles
    let totalProductos = 0;
    
    if (pedido.totalProductos) {
        totalProductos = parseFloat(pedido.totalProductos);
    } else if (pedido.total) {
        totalProductos = parseFloat(pedido.total);
    } else if (pedido.totalProductos === 0 && pedido.productos) {
        // Calcular desde los productos
        const lineas = pedido.productos.split('\n');
        for (const linea of lineas) {
            const match = linea.match(/\$(\d+\.?\d*)/);
            if (match) {
                totalProductos += parseFloat(match[1]);
            }
        }
    }
    
    const envioLibra = 3.50;
    const delivery = 1.00;
    
    // Procesar productos para mostrar en lista
    const productosLista = pedido.productos ? pedido.productos.split('\n').filter(p => p.trim()) : [];
    const productosHtml = productosLista.map(p => `<div class="producto-linea"><span>${p}</span></div>`).join('');
    
    facturaDiv.innerHTML = `
        <div class="factura-header">
            <h2>🎀 FACTURA DE COMPRA</h2>
            <p>Comprobante de pago</p>
            <p><strong>N°:</strong> ${pedido.idPedido || 'N/A'}</p>
        </div>
        
        <div class="factura-info">
            <p><strong>📅 Fecha:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>👤 Cliente:</strong> ${pedido.nombre || 'N/A'}</p>
            <p><strong>📱 Teléfono:</strong> ${pedido.telefono || 'N/A'}</p>
            <p><strong>📍 Dirección:</strong> ${pedido.direccion || 'N/A'}</p>
            <p><strong>💳 Método de pago:</strong> ${pedido.metodoPago || 'N/A'}</p>
        </div>
        
        <div class="factura-productos">
            <h4>🛍️ Detalle de productos:</h4>
            ${productosHtml || '<p>No hay productos</p>'}
        </div>
        
        <div class="factura-totales">
            <div class="factura-total-linea">
                <span>📦 TOTAL PRODUCTOS:</span>
                <span class="valor">$${totalProductos.toFixed(2)}</span>
            </div>
            <div class="factura-total-linea envio">
                <span>🚚 ENVÍO POR LIBRA:</span>
                <span class="valor">$${envioLibra.toFixed(2)}</span>
            </div>
            <div class="factura-total-linea envio">
                <span>🏠 DELIVERY:</span>
                <span class="valor">$${delivery.toFixed(2)}</span>
            </div>
            <div class="factura-total-linea total">
                <span>💰 TOTAL A PAGAR AHORA:</span>
                <span class="valor">$${totalProductos.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="factura-envio-nota">
            ⚠️ <strong>NOTA IMPORTANTE:</strong><br>
            Los costos de envío ($${envioLibra.toFixed(2)} por libra + $${delivery.toFixed(2)} delivery) 
            se pagarán cuando el paquete llegue a Panamá.
            ${pedido.metodoPago === 'Yappy' ? '<br><br>✅ Pago de productos realizado por Yappy correctamente.' : ''}
        </div>
        
        <div class="factura-footer">
            ¡Gracias por tu compra!<br>
            https://alex21-c.github.io/tienda-privada/
        </div>
    `;
    
    // Mostrar el modal de factura
    const modal = document.getElementById('factura-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
    
    // Configurar botones
    const descargarBtn = document.getElementById('descargar-factura');
    const cerrarBtn = document.getElementById('cerrar-factura');
    const cerrarX = document.querySelector('.modal-cerrar-factura');
    
    if (descargarBtn) {
        descargarBtn.onclick = function() {
            descargarFactura();
        };
    }
    
    if (cerrarBtn) {
        cerrarBtn.onclick = function() {
            modal.style.display = 'none';
        };
    }
    
    if (cerrarX) {
        cerrarX.onclick = function() {
            modal.style.display = 'none';
        };
    }
    
    // Limpiar campos
    const nombreModal = document.getElementById('nombre-modal');
    const telefonoModal = document.getElementById('telefono-modal');
    const direccionModal = document.getElementById('direccion-modal');
    const metodoPagoModal = document.getElementById('metodo-pago-modal');
    const nombreVerificar = document.getElementById('nombre-verificar');
    
    if (nombreModal) nombreModal.value = '';
    if (telefonoModal) telefonoModal.value = '';
    if (direccionModal) direccionModal.value = '';
    if (metodoPagoModal) metodoPagoModal.value = '';
    if (nombreVerificar) nombreVerificar.value = '';
    
    pedidoPendiente = null;
}

// ==================== DESCARGAR FACTURA ====================
function descargarFactura() {
    const facturaElement = document.getElementById('factura-contenido');
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Factura</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; padding: 40px; background: #fff; }
            .factura { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; border-radius: 20px; }
            .factura-header { text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px dashed #ddd; }
            .factura-header h2 { color: #A3B8A4; }
            .factura-info { background: #f9f9f9; padding: 15px; border-radius: 15px; margin-bottom: 20px; }
            .factura-info p { margin: 5px 0; }
            .producto-linea { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .factura-totales { margin-top: 20px; padding-top: 15px; border-top: 2px solid #ddd; }
            .factura-total-linea { display: flex; justify-content: space-between; margin: 8px 0; }
            .factura-total-linea.total { margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 1.2em; font-weight: bold; }
            .factura-envio-nota { background: #FFF0F0; padding: 12px; border-radius: 15px; margin-top: 20px; text-align: center; font-size: 0.75em; }
            .factura-footer { text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 0.7em; }
        </style>
    </head>
    <body>
        <div class="factura">
            ${facturaElement.innerHTML}
        </div>
    </body>
    </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `factura_${new Date().getTime()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ==================== MODAL DE MIS PEDIDOS ====================
function abrirModalMisPedidos() {
    const modal = document.getElementById('mis-pedidos-modal');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalMisPedidos() {
    const modal = document.getElementById('mis-pedidos-modal');
    if (modal) modal.style.display = 'none';
    document.getElementById('resultado-pedidos-modal').innerHTML = '<p class="vacio">Ingresa tu nombre para ver tus pedidos</p>';
    document.getElementById('nombre-consulta-modal').value = '';
}

async function buscarPedidosPorNombreModal() {
    const nombre = document.getElementById('nombre-consulta-modal').value;
    const resultadoDiv = document.getElementById('resultado-pedidos-modal');
    
    if (!nombre || nombre.trim() === '') {
        resultadoDiv.innerHTML = '<p class="error">⚠️ Por favor ingresa tu nombre completo</p>';
        return;
    }
    
    resultadoDiv.innerHTML = '<p>Cargando tus pedidos...</p>';
    
    try {
        const response = await fetch(`${API_URL}?action=getPedidosByNombre&nombre=${encodeURIComponent(nombre)}`);
        const pedidos = await response.json();
        
        if (pedidos.error) {
            resultadoDiv.innerHTML = `<p class="error">❌ ${pedidos.error}</p>`;
            return;
        }
        
        if (pedidos.length === 0) {
            resultadoDiv.innerHTML = '<p class="vacio">📭 No encontramos pedidos asociados a este nombre</p>';
            return;
        }
        
        resultadoDiv.innerHTML = '';
        pedidos.forEach(pedido => {
            const estadoClass = getEstadoClass(pedido.estado);
            const estadoIcono = getEstadoIcono(pedido.estado);
            
            const card = document.createElement('div');
            card.className = 'pedido-card';
            card.innerHTML = `
                <div class="pedido-header">
                    <span class="pedido-id">#${pedido.id}</span>
                    <span class="pedido-fecha">${new Date(pedido.fecha).toLocaleDateString()}</span>
                    <span class="pedido-estado ${estadoClass}">${estadoIcono} ${pedido.estado}</span>
                </div>
                <div class="pedido-productos">
                    ${pedido.productos.replace(/\n/g, '<br>')}
                </div>
                <div class="pedido-total">
                    Total: $${pedido.total.toFixed(2)}
                </div>
            `;
            resultadoDiv.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error:', error);
        resultadoDiv.innerHTML = '<p class="error">❌ Error al consultar tus pedidos. Intenta nuevamente.</p>';
    }
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
    
    const costoEnvioLibra = 3.50;
    const costoDelivery = 1.00;
    
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
        
        alert(`✅ ¡PEDIDO CONFIRMADO! ✅
        
📦 TOTAL PRODUCTOS: $${total.toFixed(2)}
🚚 COSTOS DE ENVÍO: $${(costoEnvioLibra + costoDelivery).toFixed(2)} (SE PAGAN AL RECIBIR)

💰 Pagas ahora: $${total.toFixed(2)}
💰 Pagas al recibir: Envío por libra ($${costoEnvioLibra.toFixed(2)}) + Delivery ($${costoDelivery.toFixed(2)})

⚠️ Los costos de envío se pagan cuando el paquete llegue a Panamá.`);
        
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
            const telefono = document.getElementById('telefono').value;
            const direccion = document.getElementById('direccion').value;
            const metodoPago = document.getElementById('metodo-pago').value;
            
            if (!nombre || !telefono || !direccion || !metodoPago) {
                alert('Completa todos los campos');
                return;
            }
            
            await enviarPedido({nombre, telefono, direccion, metodoPago});
        });
    }
}

function configurarFormularioModal() {
    const form = document.getElementById('pedido-form-modal');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await enviarPedidoModal();
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

function getEstadoClass(estado) {
    switch(estado) {
        case 'Pendiente': return 'estado-pendiente';
        case 'Pagado': return 'estado-pagado';
        case 'Enviado': return 'estado-enviado';
        case 'Entregado': return 'estado-entregado';
        default: return 'estado-pendiente';
    }
}

function getEstadoIcono(estado) {
    switch(estado) {
        case 'Pendiente': return '⏳';
        case 'Pagado': return '✅';
        case 'Enviado': return '📦';
        case 'Entregado': return '🏠';
        default: return '⏳';
    }
}

// ==================== CONFIGURAR MODALES ====================
function configurarModalesPago() {
    const cerrarYappy = document.querySelector('.modal-cerrar-yappy');
    const copiarBtn = document.getElementById('copiar-yappy');
    const yaPagueBtn = document.getElementById('ya-pague');
    
    if (cerrarYappy) cerrarYappy.onclick = cerrarModalYappy;
    if (copiarBtn) copiarBtn.onclick = copiarNumeroYappy;
    if (yaPagueBtn) yaPagueBtn.onclick = abrirConfirmarPago;
    
    const cerrarConfirmar = document.querySelector('.modal-cerrar-confirmar');
    const verificarBtn = document.getElementById('verificar-pago');
    
    if (cerrarConfirmar) cerrarConfirmar.onclick = cerrarConfirmarPago;
    if (verificarBtn) verificarBtn.onclick = verificarPagoYGenerarFactura;
    
    const cerrarFactura = document.querySelector('.modal-cerrar-factura');
    const descargarBtn = document.getElementById('descargar-factura');
    const cerrarFacturaBtn = document.getElementById('cerrar-factura');
    
    if (cerrarFactura) cerrarFactura.onclick = () => {
        document.getElementById('factura-modal').style.display = 'none';
    };
    if (cerrarFacturaBtn) cerrarFacturaBtn.onclick = () => {
        document.getElementById('factura-modal').style.display = 'none';
    };
    if (descargarBtn) descargarBtn.onclick = descargarFactura;
    
    const yappyModal = document.getElementById('yappy-modal');
    const confirmarModal = document.getElementById('confirmar-pago-modal');
    const facturaModal = document.getElementById('factura-modal');
    
    window.onclick = function(event) {
        if (event.target === yappyModal) cerrarModalYappy();
        if (event.target === confirmarModal) cerrarConfirmarPago();
        if (event.target === facturaModal) facturaModal.style.display = 'none';
    };
}

// ==================== CONFIGURAR CARRITO TOP ====================
function configurarCarritoTop() {
    const toggleBtn = document.getElementById('carrito-toggle');
    const cerrarBtn = document.getElementById('cerrar-carrito');
    const pagarBtn = document.getElementById('ir-pagar');
    const overlay = document.getElementById('overlay');
    
    console.log("Configurando carrito top");
    console.log("Botón pagar encontrado:", pagarBtn);
    
    if (toggleBtn) toggleBtn.onclick = toggleCarrito;
    if (cerrarBtn) cerrarBtn.onclick = cerrarCarrito;
    if (pagarBtn) pagarBtn.onclick = irAPagar;  // 👈 Esta línea es clave
    if (overlay) overlay.onclick = cerrarCarrito;
}

// ==================== CONFIGURAR MIS PEDIDOS ====================
function configurarMisPedidos() {
    const toggleBtn = document.getElementById('toggle-mis-pedidos');
    const cerrarBtn = document.getElementById('cerrar-mis-pedidos');
    const buscarBtn = document.getElementById('buscar-pedidos-modal');
    const nombreInput = document.getElementById('nombre-consulta-modal');
    const modalCerrar = document.querySelector('.modal-cerrar-mis-pedidos');
    const modalPagoCerrar = document.querySelector('.modal-cerrar-pago');
    
    if (toggleBtn) toggleBtn.onclick = abrirModalMisPedidos;
    if (cerrarBtn) cerrarBtn.onclick = cerrarModalMisPedidos;
    if (modalCerrar) modalCerrar.onclick = cerrarModalMisPedidos;
    if (modalPagoCerrar) modalPagoCerrar.onclick = cerrarModalPago;
    if (buscarBtn) buscarBtn.onclick = buscarPedidosPorNombreModal;
    if (nombreInput) {
        nombreInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') buscarPedidosPorNombreModal();
        });
    }
    
    const pagoModal = document.getElementById('pago-modal');
    const misPedidosModal = document.getElementById('mis-pedidos-modal');
    
    if (pagoModal) {
        window.onclick = function(event) {
            if (event.target === pagoModal) cerrarModalPago();
            if (event.target === misPedidosModal) cerrarModalMisPedidos();
        }
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
    configurarFormularioModal();
    configurarModal();
    configurarCarritoTop();
    configurarMisPedidos();
    configurarModalesPago();
}
// ==================== IR A PAGAR ====================
function irAPagar() {
    console.log("irAPagar llamado");
    cerrarCarrito();
    abrirModalPago();
}

function abrirModalPago() {
    console.log("abrirModalPago llamado");
    const modal = document.getElementById('pago-modal');
    if (modal) {
        modal.style.display = 'flex';
        console.log("Modal abierto");
    } else {
        console.error("Modal de pago no encontrado");
        alert('Error: No se encontró el formulario de pago');
    }
}

function cerrarModalPago() {
    const modal = document.getElementById('pago-modal');
    if (modal) modal.style.display = 'none';
}

// Función de prueba temporal
function testModalPago() {
    const modal = document.getElementById('pago-modal');
    if (modal) {
        modal.style.display = 'flex';
        console.log('Modal abierto manualmente');
        return true;
    } else {
        console.error('Modal no encontrado');
        alert('Error: No se encuentra el modal de pago en el HTML');
        return false;
    }
}
// ==================== ZOOM EN IMAGEN DEL MODAL ====================
function configurarZoomEnModalProducto() {
    setTimeout(function() {
        const modalImagen = document.getElementById('modal-imagen');
        
        if (modalImagen) {
            // Cambiar cursor a zoom-in
            modalImagen.style.cursor = 'zoom-in';
            modalImagen.style.transition = 'transform 0.2s ease';
            
            // Remover eventos anteriores para evitar duplicados
            const nuevaImagen = modalImagen.cloneNode(true);
            if (modalImagen.parentNode) {
                modalImagen.parentNode.replaceChild(nuevaImagen, modalImagen);
            }
            
            const imagenFinal = document.getElementById('modal-imagen');
            if (imagenFinal) {
                imagenFinal.style.cursor = 'zoom-in';
                imagenFinal.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const urlImagen = this.src;
                    if (urlImagen && window.abrirZoomImagen) {
                        window.abrirZoomImagen(urlImagen);
                    }
                });
            }
        }
    }, 150);
}

// Función para abrir el zoom
window.abrirZoomImagen = function(urlImagen) {
    const zoomModal = document.getElementById('zoom-imagen-modal');
    const zoomImagen = document.getElementById('zoom-imagen');
    
    if (zoomImagen && urlImagen) {
        zoomImagen.src = urlImagen;
        if (zoomModal) {
            zoomModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
};

// Función para cerrar el zoom
window.cerrarZoomImagen = function() {
    const zoomModal = document.getElementById('zoom-imagen-modal');
    if (zoomModal) {
        zoomModal.classList.remove('active');
        document.body.style.overflow = '';
    }
};

// Configurar eventos del zoom
function configurarZoomModal() {
    const zoomModal = document.getElementById('zoom-imagen-modal');
    const zoomCerrar = document.getElementById('zoom-cerrar');
    
    if (zoomModal) {
        zoomModal.addEventListener('click', function(e) {
            if (e.target === zoomModal) {
                window.cerrarZoomImagen();
            }
        });
    }
    
    if (zoomCerrar) {
        zoomCerrar.addEventListener('click', window.cerrarZoomImagen);
    }
    
    // Cerrar con tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            window.cerrarZoomImagen();
        }
    });
}
async function init() {
    verificarAdmin();
    await cargarProductos();
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) carrito = JSON.parse(carritoGuardado);
    actualizarCarrito();
    configurarFiltros();
    configurarFormularioModal();
    configurarModal();
    configurarCarritoTop();
    configurarMisPedidos();
    configurarModalesPago();
    
    // ✅✅✅ AGREGAR ESTA LÍNEA ✅✅✅
    configurarZoomModal();
}
