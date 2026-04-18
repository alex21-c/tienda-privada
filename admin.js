// Cargar productos desde el archivo JSON
async function cargarProductosAdmin() {
    try {
        const response = await fetch('productos.json');
        const productos = await response.json();
        mostrarProductosAdmin(productos);
    } catch (error) {
        document.getElementById('productos-lista').innerHTML = '<p>Error cargando productos</p>';
    }
}

function mostrarProductosAdmin(productos) {
    const container = document.getElementById('productos-lista');
    if (productos.length === 0) {
        container.innerHTML = '<p>No hay productos</p>';
        return;
    }
    
    container.innerHTML = '';
    productos.forEach(prod => {
        const div = document.createElement('div');
        div.className = 'producto-item';
        div.innerHTML = `
            <div>
                <strong>${prod.nombre}</strong><br>
                $${prod.precio} - ${prod.origen}
            </div>
            <button class="btn-eliminar-prod" data-id="${prod.id}">🗑️ Eliminar</button>
        `;
        container.appendChild(div);
    });
    
    document.querySelectorAll('.btn-eliminar-prod').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id);
            await eliminarProducto(id);
        });
    });
}

async function eliminarProducto(id) {
    const response = await fetch('productos.json');
    let productos = await response.json();
    productos = productos.filter(p => p.id !== id);
    
    // Guardar actualizado (en GitHub necesitas hacer commit)
    alert('En GitHub Pages necesitas editar manualmente productos.json');
    console.log('Productos actualizados:', productos);
}

async function agregarProducto() {
    const nombre = document.getElementById('prod-nombre').value;
    const precio = parseFloat(document.getElementById('prod-precio').value);
    const origen = document.getElementById('prod-origen').value;
    const imagen = document.getElementById('prod-imagen').value;
    
    if (!nombre || !precio) {
        alert('Completa nombre y precio');
        return;
    }
    
    const response = await fetch('productos.json');
    const productos = await response.json();
    
    const nuevoId = Math.max(...productos.map(p => p.id), 0) + 1;
    const nuevoProducto = { id: nuevoId, nombre, precio, origen, imagen };
    productos.push(nuevoProducto);
    
    alert('✅ Producto agregado. Para guardar permanentemente, copia este JSON y actualiza productos.json manualmente:');
    console.log(JSON.stringify(productos, null, 2));
    
    document.getElementById('prod-nombre').value = '';
    document.getElementById('prod-precio').value = '';
    document.getElementById('prod-imagen').value = '';
    cargarProductosAdmin();
}

// Cargar pedidos desde Google Sheets
async function cargarPedidosDesdeSheets() {
    const webhookUrl = document.getElementById('webhookUrl').value;
    if (!webhookUrl) {
        alert('Configura la URL del webhook primero');
        return;
    }
    
    localStorage.setItem('webhookUrl', webhookUrl);
    
    // Nota: Para leer pedidos necesitas crear un doGet() en Apps Script
    // Por ahora, mostramos instrucciones
    const container = document.getElementById('pedidos-lista');
    container.innerHTML = `
        <div style="background:#e8f4fd; padding:20px; border-radius:8px;">
            <h3>📖 Cómo ver los pedidos:</h3>
            <ol>
                <li>Abre tu <strong>Google Sheets</strong> donde guardas los pedidos</li>
                <li>Los pedidos se guardan automáticamente cuando alguien compra</li>
                <li>Puedes verlos directamente en la hoja de cálculo</li>
                <li>Cambia el estado de pago manualmente en la columna E (Estado Pago)</li>
            </ol>
            <p><strong>URL de tu Google Sheets:</strong> <span id="sheetsUrl"></span></p>
        </div>
    `;
}

function configurarEventos() {
    document.getElementById('guardarWebhook').addEventListener('click', () => {
        const url = document.getElementById('webhookUrl').value;
        localStorage.setItem('webhookUrl', url);
        alert('Webhook guardado');
    });
    
    document.getElementById('cargarPedidos').addEventListener('click', cargarPedidosDesdeSheets);
    document.getElementById('agregar-producto').addEventListener('click', agregarProducto);
    
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });
}

function mostrarUrlTienda() {
    const url = window.location.origin;
    document.getElementById('tiendaUrl').textContent = url;
    document.getElementById('tiendaUrl').style.cursor = 'pointer';
    document.getElementById('tiendaUrl').onclick = () => navigator.clipboard.writeText(url);
}

// Inicializar
function initAdmin() {
    mostrarUrlTienda();
    cargarProductosAdmin();
    configurarEventos();
    
    const savedUrl = localStorage.getItem('webhookUrl');
    if (savedUrl) document.getElementById('webhookUrl').value = savedUrl;
}

initAdmin();