// ==================== CONFIGURACIÓN ====================
const API_URL = 'https://script.google.com/macros/s/AKfycby6Lzye_pHp4FgWkm5WRFwQwrN42Yc32KtABgiVJKl2fCXFu2QoH7yQnAiNomZURhSbnw/exec';

let productos = [], carrito = [], productoActual = null, esAdmin = false;
let colorSeleccionado = null, tallaSeleccionada = null, presentacionSeleccionada = null, pedidoPendiente = null;
let filtroPlataforma = 'todos', filtroGenero = 'todos';
let versionActual = localStorage.getItem('productosVersion') || '1.0.0';

// ==================== PROCESAR COLOR Y TALLAS ====================
function procesarColorConTallas(producto) {
    if (producto.colores?.length > 0 && producto.variantes && !producto.variantes.includes(':')) {
        const primerColor = producto.colores[0];
        if (primerColor) {
            producto.variantes = `${primerColor.nombre}:${producto.variantes}`;
            producto.colores[0].tallas = producto.variantes.split(',').map(t => {
                const [talla, precio] = t.split(':');
                return { talla, precio: parseFloat(precio) };
            });
        }
    }
    return producto;
}

// ==================== CARGAR PRODUCTOS CON CACHÉ ====================
async function cargarProductos(forzarRecarga = false) {
    const cache = localStorage.getItem('productosCache');
    const cacheTime = localStorage.getItem('productosCacheTime');
    const ahora = Date.now();
    
    if (!forzarRecarga && cache && cacheTime && (ahora - parseInt(cacheTime) < 300000)) {
        productos = JSON.parse(cache);
        mostrarProductos();
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}?action=getProductos&t=${Date.now()}`);
        productos = await res.json();
        localStorage.setItem('productosCache', JSON.stringify(productos));
        localStorage.setItem('productosCacheTime', ahora);
        mostrarProductos();
    } catch (error) {
        if (cache) { productos = JSON.parse(cache); mostrarProductos(); }
        console.error(error);
    }
}

// ==================== MOSTRAR PRODUCTOS ====================
function mostrarProductos() {
    const contenedor = document.getElementById('productos');
    if (!contenedor) return;
    
    let filtrados = productos.filter(p => 
        (filtroPlataforma === 'todos' || p.origen === filtroPlataforma) &&
        (filtroGenero === 'todos' || p.genero === filtroGenero)
    );
    
    if (filtrados.length === 0) {
        contenedor.innerHTML = '<p class="loading">No hay productos</p>';
        return;
    }
    
    contenedor.innerHTML = filtrados.map(p => `
        <div class="producto-card" onclick="mostrarModal(${p.id})">
            <img src="${p.imagen}" class="producto-imagen" onerror="this.src='https://via.placeholder.com/300x200'">
            <div class="producto-origen origen-${p.origen.toLowerCase()}">${p.origen}</div>
            <div class="producto-genero">${getIconoGenero(p.genero)} ${p.genero || 'Unisex'}</div>
            <h3 class="producto-titulo">${p.nombre}</h3>
            <div class="producto-precio">$${p.precio.toFixed(2)}</div>
            <button class="btn-agregar" onclick="event.stopPropagation(); agregarAlCarrito(${p.id})">➕ Agregar</button>
        </div>
    `).join('');
}

function getIconoGenero(g) { return { hombre:'👨', mujer:'👩', niño:'👦', niña:'👧', unisex:'👥' }[g] || '👤'; }

// ==================== PRESENTACIONES (FRASCOS) ====================
function mostrarPresentaciones(texto) {
    const div = document.getElementById('modal-presentaciones');
    const sel = document.getElementById('selector-presentacion');
    if (!div) return;
    
    const matches = [...(texto?.matchAll(/(\d+)\s*(frasco|frascos)\s*:\s*([\d.]+)/gi) || [])];
    if (matches.length) {
        div.style.display = 'block';
        sel.innerHTML = '<option value="">Selecciona una opción</option>' + 
            matches.map(m => `<option value="${m[3]}" data-cantidad="${m[1]}" data-texto="${m[1]} ${m[2]}">${m[1]} ${m[2]} - $${parseFloat(m[3]).toFixed(2)}</option>`).join('');
        sel.onchange = () => {
            presentacionSeleccionada = sel.value ? { 
                cantidad: parseInt(sel.selectedOptions[0].dataset.cantidad), 
                texto: sel.selectedOptions[0].dataset.texto, 
                precio: parseFloat(sel.value) 
            } : null;
            const precioEl = document.getElementById('modal-precio');
            if (precioEl) precioEl.textContent = presentacionSeleccionada ? `$${presentacionSeleccionada.precio.toFixed(2)}` : `$${productoActual?.precio.toFixed(2)}`;
            precioEl.style.color = presentacionSeleccionada ? '#F4A0B5' : '#2ecc71';
        };
    } else div.style.display = 'none';
}

// ==================== MODAL PRODUCTO ====================
function mostrarModal(id) {
    let producto = productos.find(p => p.id == id);
    if (!producto) return;
    producto = procesarColorConTallas(producto);
    productoActual = producto;
    colorSeleccionado = tallaSeleccionada = presentacionSeleccionada = null;
    
    const modal = document.getElementById('producto-modal');
    document.getElementById('modal-imagen').src = producto.colores?.[0]?.imagen || producto.imagen;
    document.getElementById('modal-nombre').textContent = producto.nombre;
    document.getElementById('modal-origen').textContent = producto.origen;
    document.getElementById('modal-origen').className = `origen-${producto.origen?.toLowerCase()}`;
    document.getElementById('modal-genero').textContent = `${getIconoGenero(producto.genero)} ${producto.genero || 'Unisex'}`;
    document.getElementById('modal-precio').textContent = `$${producto.precio.toFixed(2)}`;
    document.getElementById('modal-descripcion').textContent = producto.descripcion || `Producto de ${producto.origen}`;
    mostrarEnlaceAdmin(producto.enlace);
    
    const coloresDiv = document.getElementById('modal-colores');
    const variantesDiv = document.getElementById('modal-variantes');
    
    if (producto.colores?.length) {
        coloresDiv.style.display = 'block';
        mostrarSelectoresColor(producto.colores);
    } else {
        coloresDiv.style.display = 'none';
        if (producto.variantes?.length) mostrarTallasDirectas(producto.variantes);
        else variantesDiv.style.display = 'none';
    }
    
    mostrarPresentaciones(producto.variantes);
    modal.style.display = 'flex';
    configurarZoomEnModalProducto();
}

function mostrarSelectoresColor(colores) {
    const container = document.getElementById('selector-color');
    container.innerHTML = colores.map((c, i) => `
        <button style="padding:8px 20px;border:2px solid ${i===0?'#00D4FF':'#ccc'};background:${i===0?'#00D4FF':'white'};border-radius:40px;cursor:pointer">
            ${c.nombre}
        </button>
    `).join('');
    
    document.querySelectorAll('#selector-color button').forEach((btn, i) => {
        btn.onclick = () => {
            document.querySelectorAll('#selector-color button').forEach(b => {
                b.style.border = '2px solid #ccc';
                b.style.background = 'white';
                b.style.color = '#333';
            });
            btn.style.border = '2px solid #00D4FF';
            btn.style.background = '#00D4FF';
            btn.style.color = 'white';
            
            colorSeleccionado = colores[i];
            document.getElementById('modal-imagen').src = colores[i].imagen;
            let precio = colores[i].precio;
            document.getElementById('modal-precio').textContent = `$${precio.toFixed(2)}`;
            
            let tallas = colores[i].tallas;
            if (!tallas?.length && productoActual.variantes && !productoActual.variantes.includes(colores[i].nombre)) {
                tallas = productoActual.variantes.split(',').map(t => {
                    const [talla, p] = t.split(':');
                    return { talla, precio: parseFloat(p) };
                });
            }
            mostrarTallas(tallas);
        };
    });
    
    colorSeleccionado = colores[0];
    let tallasIniciales = colores[0].tallas;
    if (!tallasIniciales?.length && productoActual.variantes && !productoActual.variantes.includes(colores[0].nombre)) {
        tallasIniciales = productoActual.variantes.split(',').map(t => {
            const [talla, p] = t.split(':');
            return { talla, precio: parseFloat(p) };
        });
    }
    mostrarTallas(tallasIniciales);
}

function mostrarTallas(tallas) {
    const div = document.getElementById('modal-variantes');
    const sel = document.getElementById('selector-variante');
    if (!tallas?.length) { div.style.display = 'none'; return; }
    div.style.display = 'block';
    sel.innerHTML = '<option value="">Selecciona una talla</option>' + 
        tallas.map(t => `<option value="${t.precio}" data-talla="${t.talla}">${t.talla} - $${t.precio.toFixed(2)}</option>`).join('');
    sel.onchange = () => {
        tallaSeleccionada = sel.value ? { talla: sel.selectedOptions[0].dataset.talla, precio: parseFloat(sel.value) } : null;
        document.getElementById('modal-precio').textContent = tallaSeleccionada ? `$${tallaSeleccionada.precio.toFixed(2)}` : `$${colorSeleccionado?.precio.toFixed(2)}`;
    };
}

function mostrarTallasDirectas(variantes) {
    const tallas = Array.isArray(variantes) ? variantes : variantes?.split(',').map(t => {
        const [talla, precio] = t.split(':');
        return { talla, precio: parseFloat(precio) };
    });
    mostrarTallas(tallas);
}

function cerrarModal() {
    document.getElementById('producto-modal').style.display = 'none';
    productoActual = colorSeleccionado = tallaSeleccionada = presentacionSeleccionada = null;
    if (window.cerrarZoomImagen) window.cerrarZoomImagen();
}

// ==================== AGREGAR AL CARRITO ====================
function agregarAlCarrito(id) {
    const producto = productos.find(p => p.id == id);
    if (!producto) return;
    if (producto.colores?.length || producto.variantes?.length) return mostrarModal(id);
    
    let existente = carrito.find(i => i.id == id);
    if (existente) existente.cantidad++;
    else carrito.push({...producto, cantidad: 1});
    guardarCarrito();
    actualizarCarrito();
}

function agregarDesdeModal() {
    if (!productoActual) return;
    
    let precio = productoActual.precio, nombre = productoActual.nombre;
    
    if (presentacionSeleccionada) {
        precio = presentacionSeleccionada.precio;
        nombre += ` (${presentacionSeleccionada.texto})`;
    } else if (productoActual.colores?.length) {
        if (!colorSeleccionado) return alert('Selecciona un color');
        precio = colorSeleccionado.precio;
        nombre += ` (${colorSeleccionado.nombre})`;
        if (tallaSeleccionada) { precio = tallaSeleccionada.precio; nombre += ` - Talla: ${tallaSeleccionada.talla}`; }
    } else if (productoActual.variantes?.length) {
        if (!tallaSeleccionada) return alert('Selecciona una talla');
        precio = tallaSeleccionada.precio;
        nombre += ` (Talla: ${tallaSeleccionada.talla})`;
    }
    
    let existente = carrito.find(i => i.id === productoActual.id && i.nombre === nombre);
    if (existente) existente.cantidad++;
    else carrito.push({ id: productoActual.id, nombre, precio, origen: productoActual.origen, cantidad: 1 });
    
    guardarCarrito();
    actualizarCarrito();
    cerrarModal();
}

// ==================== CARRITO ====================
function guardarCarrito() { localStorage.setItem('carrito', JSON.stringify(carrito)); }
function actualizarCarrito() {
    actualizarCarritoTop();
    const lista = document.getElementById('carrito-lista');
    const totalSpan = document.getElementById('total');
    const formDiv = document.getElementById('formulario-datos');
    
    if (!carrito.length) {
        if (lista) lista.innerHTML = '<p class="vacio">Carrito vacío</p>';
        if (totalSpan) totalSpan.textContent = '0.00';
        if (formDiv) formDiv.style.display = 'none';
        return;
    }
    
    if (formDiv) formDiv.style.display = 'block';
    if (lista) lista.innerHTML = '';
    let total = 0;
    carrito.forEach(item => {
        let subtotal = item.precio * item.cantidad;
        total += subtotal;
        if (lista) lista.innerHTML += `
            <div class="item-carrito">
                <div><strong>${item.nombre}</strong> (${item.origen})<br>$${item.precio.toFixed(2)} x ${item.cantidad} = $${subtotal.toFixed(2)}</div>
                <button class="btn-eliminar" onclick="carrito = carrito.filter(i => !(i.id==${item.id} && i.nombre=='${item.nombre}')); guardarCarrito(); actualizarCarrito();">🗑️</button>
            </div>
        `;
    });
    if (totalSpan) totalSpan.textContent = total.toFixed(2);
}

function actualizarCarritoTop() {
    const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0);
    if (document.getElementById('carrito-contador')) document.getElementById('carrito-contador').textContent = totalItems;
    if (document.getElementById('total-panel')) document.getElementById('total-panel').textContent = total.toFixed(2);
    
    const panel = document.getElementById('carrito-lista-panel');
    if (panel) panel.innerHTML = !carrito.length ? '<div class="vacio">✨ Tu carrito está vacío</div>' : 
        carrito.map(i => `<div class="item-carrito"><div><strong>${i.nombre}</strong><br>$${i.precio.toFixed(2)} x ${i.cantidad} = $${(i.precio*i.cantidad).toFixed(2)}</div><button class="btn-eliminar" onclick="carrito=carrito.filter(x=>!(x.id==${i.id}&&x.nombre=='${i.nombre}'));guardarCarrito();actualizarCarritoTop();actualizarCarrito();">🗑️</button></div>`).join('');
}

function toggleCarrito() {
    document.getElementById('carrito-panel')?.classList.toggle('open');
    document.getElementById('overlay')?.classList.toggle('active');
}
function cerrarCarrito() {
    document.getElementById('carrito-panel')?.classList.remove('open');
    document.getElementById('overlay')?.classList.remove('active');
}

// ==================== PEDIDOS ====================
async function guardarPedido(pedido) {
    await fetch(API_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedido) });
    carrito = [];
    guardarCarrito();
    actualizarCarrito();
}

async function enviarPedidoModal() {
    const nombre = document.getElementById('nombre-modal').value;
    const telefono = document.getElementById('telefono-modal').value;
    const direccion = document.getElementById('direccion-modal').value;
    const metodoPago = document.getElementById('metodo-pago-modal').value;
    if (!nombre || !telefono || !direccion || !metodoPago) return alert('Completa todos los campos');
    
    let productosTexto = '', total = 0;
    carrito.forEach(i => {
        let subtotal = i.precio * i.cantidad;
        total += subtotal;
        productosTexto += `${i.nombre} (${i.origen}) x${i.cantidad} - $${subtotal.toFixed(2)}\n`;
    });
    
    const pedido = {
        nombre, telefono, direccion, metodoPago,
        estadoPago: metodoPago === 'Yappy' ? 'Pendiente de pago' : 'Pendiente',
        productos: productosTexto,
        totalProductos: total,
        envioLibra: 3.50, delivery: 1.00, envioTotal: 4.50,
        idPedido: Date.now().toString()
    };
    await guardarPedido(pedido);
    cerrarModalPago();
    cerrarCarrito();
    if (metodoPago === 'Yappy') abrirModalYappy();
    else mostrarFactura(pedido);
}

function abrirModalPago() { document.getElementById('pago-modal').style.display = 'flex'; }
function cerrarModalPago() { document.getElementById('pago-modal').style.display = 'none'; }
function irAPagar() { cerrarCarrito(); abrirModalPago(); }

// ==================== YAPPY ====================
function abrirModalYappy() { document.getElementById('yappy-modal').style.display = 'flex'; }
function cerrarModalYappy() { document.getElementById('yappy-modal').style.display = 'none'; }
function copiarNumeroYappy() {
    navigator.clipboard.writeText(document.getElementById('yappy-telefono').textContent);
    let btn = document.getElementById('copiar-yappy');
    btn.textContent = '✅ Copiado!';
    setTimeout(() => btn.textContent = '📋 Copiar', 2000);
}
function abrirConfirmarPago() { cerrarModalYappy(); document.getElementById('confirmar-pago-modal').style.display = 'flex'; }
function cerrarConfirmarPago() { document.getElementById('confirmar-pago-modal').style.display = 'none'; }

async function verificarPagoYGenerarFactura() {
    let nombre = document.getElementById('nombre-verificar').value;
    if (!nombre) return alert('Ingresa tu nombre');
    try {
        let res = await fetch(`${API_URL}?action=getPedidosByNombre&nombre=${encodeURIComponent(nombre)}`);
        let pedidos = await res.json();
        let pedido = pedidos?.find(p => p.estado === 'Pendiente de pago');
        if (!pedido) return alert('No encontramos un pedido pendiente con ese nombre');
        await fetch(API_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'actualizarEstado', fila: pedido.id, estado: 'Pagado' }) });
        cerrarConfirmarPago();
        mostrarFactura({
            nombre: pedido.nombre, telefono: pedido.telefono, direccion: pedido.direccion,
            metodoPago: pedido.metodoPago, productos: pedido.productos, totalProductos: pedido.total,
            envioLibra: 3.50, delivery: 1.00, idPedido: pedido.idPedido
        });
    } catch(e) { alert('Error al verificar'); }
}

// ==================== FACTURA ====================
function mostrarFactura(pedido) {
    let total = parseFloat(pedido.totalProductos || pedido.total || 0);
    let productos = pedido.productos?.split('\n').filter(p=>p.trim()).map(p=>`<div class="producto-linea">${p}</div>`).join('') || '';
    document.getElementById('factura-contenido').innerHTML = `
        <div class="factura-logo"><img src="logo.png" class="factura-logo-imagen" onerror="this.style.display='none'"><div class="factura-logo-texto"><h2>TIENDA PRIVADA</h2><p>ESTILO · EXCLUSIVIDAD · SEGURIDAD</p></div></div>
        <div class="factura-header"><h3>FACTURA DE COMPRA</h3><p>Comprobante de pago</p><p><strong>N°:</strong> ${pedido.idPedido || 'N/A'}</p></div>
        <div class="factura-info"><p><strong>📅 Fecha:</strong> ${new Date().toLocaleString()}</p><p><strong>👤 Cliente:</strong> ${pedido.nombre || 'N/A'}</p><p><strong>📱 Teléfono:</strong> ${pedido.telefono || 'N/A'}</p><p><strong>📍 Dirección:</strong> ${pedido.direccion || 'N/A'}</p><p><strong>💳 Método:</strong> ${pedido.metodoPago || 'N/A'}</p></div>
        <div class="factura-productos"><h4>🛍️ Productos:</h4>${productos || '<p>No hay productos</p>'}</div>
        <div class="factura-totales"><div class="factura-total-linea"><span>📦 TOTAL:</span><span>$${total.toFixed(2)}</span></div>
        <div class="factura-total-linea envio"><span>🚚 ENVÍO POR LIBRA:</span><span>$${3.50}</span></div>
        <div class="factura-total-linea envio"><span>🏠 DELIVERY:</span><span>$${1.00}</span></div>
        <div class="factura-total-linea total"><span>💰 TOTAL A PAGAR:</span><span>$${total.toFixed(2)}</span></div></div>
        <div class="factura-envio-nota">⚠️ Los costos de envío se pagan en Panamá</div>
        <div class="factura-footer">¡Gracias por tu compra!<br>https://alex21-c.github.io/tienda-privada/</div>
    `;
    document.getElementById('factura-modal').style.display = 'flex';
    document.getElementById('descargar-factura').onclick = () => {
        let w = window.open('', '_blank');
        w.document.write(`<html><head><title>Factura</title><style>body{font-family:monospace;padding:20px}</style></head><body><div class="factura">${document.getElementById('factura-contenido').innerHTML}</div></body></html>`);
        w.document.close();
        w.print();
    };
    document.getElementById('cerrar-factura').onclick = () => document.getElementById('factura-modal').style.display = 'none';
    document.querySelector('.modal-cerrar-factura').onclick = () => document.getElementById('factura-modal').style.display = 'none';
    document.getElementById('nombre-modal').value = document.getElementById('telefono-modal').value = document.getElementById('direccion-modal').value = '';
    document.getElementById('metodo-pago-modal').value = '';
}

// ==================== MIS PEDIDOS ====================
function abrirModalMisPedidos() { document.getElementById('mis-pedidos-modal').style.display = 'flex'; }
function cerrarModalMisPedidos() { 
    document.getElementById('mis-pedidos-modal').style.display = 'none';
    document.getElementById('resultado-pedidos-modal').innerHTML = '<p class="vacio">Ingresa tu nombre</p>';
}
async function buscarPedidosPorNombreModal() {
    let nombre = document.getElementById('nombre-consulta-modal').value;
    if (!nombre) return document.getElementById('resultado-pedidos-modal').innerHTML = '<p class="error">⚠️ Ingresa tu nombre</p>';
    document.getElementById('resultado-pedidos-modal').innerHTML = '<p>Cargando...</p>';
    try {
        let res = await fetch(`${API_URL}?action=getPedidosByNombre&nombre=${encodeURIComponent(nombre)}`);
        let pedidos = await res.json();
        if (!pedidos.length) return document.getElementById('resultado-pedidos-modal').innerHTML = '<p class="vacio">📭 No hay pedidos</p>';
        document.getElementById('resultado-pedidos-modal').innerHTML = pedidos.map(p => `
            <div class="pedido-card"><div class="pedido-header"><span>#${p.idPedido || p.id}</span><span>${new Date(p.fecha).toLocaleDateString()}</span><span class="estado-${p.estado}">${p.estado}</span></div>
            <div class="pedido-productos">${p.productos?.replace(/\n/g,'<br>')}</div><div class="pedido-total">Total: $${(p.total||0).toFixed(2)}</div></div>
        `).join('');
    } catch(e) { document.getElementById('resultado-pedidos-modal').innerHTML = '<p class="error">❌ Error</p>'; }
}

// ==================== FILTROS ====================
function configurarFiltros() {
    document.querySelectorAll('.filtro-btn').forEach(btn => btn.onclick = () => {
        document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filtroPlataforma = btn.dataset.filtro;
        let generosDiv = document.getElementById('filtros-genero');
        if (filtroPlataforma !== 'todos') {
            generosDiv.style.display = 'flex';
            filtroGenero = 'todos';
            document.querySelectorAll('.filtro-genero-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.filtro-genero-btn[data-genero="todos"]')?.classList.add('active');
        } else { generosDiv.style.display = 'none'; filtroGenero = 'todos'; }
        mostrarProductos();
    });
    document.querySelectorAll('.filtro-genero-btn').forEach(btn => btn.onclick = () => {
        document.querySelectorAll('.filtro-genero-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filtroGenero = btn.dataset.genero;
        mostrarProductos();
    });
}

// ==================== ADMIN ====================
function verificarAdmin() {
    let url = new URLSearchParams(location.search);
    if (url.get('admin') === 'true') {
        let pass = prompt('Contraseña:');
        if (pass === 'admin123') { esAdmin = true; localStorage.setItem('adminSession', 'true'); alert('✅ Admin activado'); }
        else alert('❌ Incorrecta');
    }
    if (localStorage.getItem('adminSession') === 'true') esAdmin = true;
}
function mostrarEnlaceAdmin(enlace) {
    let div = document.getElementById('modal-enlace-admin');
    if (esAdmin && enlace) {
        div.style.display = 'block';
        let a = document.getElementById('modal-enlace');
        a.href = enlace;
        a.textContent = enlace;
        document.getElementById('copiar-enlace').onclick = () => { navigator.clipboard.writeText(enlace); alert('✅ Copiado'); };
    } else div.style.display = 'none';
}

// ==================== ZOOM ====================
function configurarZoomEnModalProducto() {
    setTimeout(() => {
        let img = document.getElementById('modal-imagen');
        if (img) {
            img.style.cursor = 'zoom-in';
            let clone = img.cloneNode(true);
            img.parentNode.replaceChild(clone, img);
            clone.style.cursor = 'zoom-in';
            clone.onclick = (e) => {
                e.stopPropagation();
                window.abrirZoomImagen?.(clone.src);
            };
        }
    }, 150);
}
window.abrirZoomImagen = (url) => {
    let modal = document.getElementById('zoom-imagen-modal');
    document.getElementById('zoom-imagen').src = url;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
};
window.cerrarZoomImagen = () => {
    let modal = document.getElementById('zoom-imagen-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
};
function configurarZoomModal() {
    document.getElementById('zoom-imagen-modal').onclick = e => { if(e.target.classList.contains('zoom-modal')) window.cerrarZoomImagen(); };
    document.getElementById('zoom-cerrar').onclick = window.cerrarZoomImagen;
    document.onkeydown = e => { if(e.key === 'Escape') window.cerrarZoomImagen(); };
}

// ==================== MODALES ====================
function configurarModales() {
    let modals = ['pago-modal', 'yappy-modal', 'confirmar-pago-modal', 'factura-modal', 'mis-pedidos-modal'];
    modals.forEach(id => {
        let modal = document.getElementById(id);
        if(modal) modal.onclick = e => { if(e.target === modal) modal.style.display = 'none'; };
    });
    document.querySelector('.modal-cerrar')?.addEventListener('click', cerrarModal);
    document.getElementById('producto-modal').onclick = e => { if(e.target === document.getElementById('producto-modal')) cerrarModal(); };
    document.getElementById('modal-agregar').onclick = agregarDesdeModal;
    document.getElementById('carrito-toggle').onclick = toggleCarrito;
    document.getElementById('cerrar-carrito').onclick = cerrarCarrito;
    document.getElementById('ir-pagar').onclick = irAPagar;
    document.getElementById('overlay').onclick = cerrarCarrito;
    document.getElementById('toggle-mis-pedidos').onclick = abrirModalMisPedidos;
    document.getElementById('buscar-pedidos-modal').onclick = buscarPedidosPorNombreModal;
    document.getElementById('copiar-yappy').onclick = copiarNumeroYappy;
    document.getElementById('ya-pague').onclick = abrirConfirmarPago;
    document.getElementById('verificar-pago').onclick = verificarPagoYGenerarFactura;
    document.querySelector('.modal-cerrar-mis-pedidos').onclick = cerrarModalMisPedidos;
    document.querySelector('.modal-cerrar-pago').onclick = cerrarModalPago;
    document.querySelector('.modal-cerrar-yappy').onclick = cerrarModalYappy;
    document.querySelector('.modal-cerrar-confirmar').onclick = cerrarConfirmarPago;
    document.getElementById('pedido-form-modal').onsubmit = e => { e.preventDefault(); enviarPedidoModal(); };
    document.getElementById('nombre-consulta-modal').onkeypress = e => { if(e.key === 'Enter') buscarPedidosPorNombreModal(); };
}

// ==================== INICIO ====================
async function init() {
    verificarAdmin();
    await cargarProductos();
    let saved = localStorage.getItem('carrito');
    if(saved) carrito = JSON.parse(saved);
    actualizarCarrito();
    configurarFiltros();
    configurarModales();
    configurarZoomModal();
}
init();
