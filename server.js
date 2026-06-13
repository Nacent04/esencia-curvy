// CONTROL DE CARRITO BLINDADO CON CONEXIÓN EN TIEMPO REAL AL SERVIDOR
function guardarCarritoLocal(){
    const token = localStorage.getItem('token');
    const key = token ? 'carrito_' + token : 'carrito_anonimo';
    
    // 1. Guardamos la copia de respaldo local tradicional
    localStorage.setItem(key, JSON.stringify(carrito));
    localStorage.setItem('tienda_carrito', JSON.stringify(carrito)); // Duplicado estático de compatibilidad
    localStorage.setItem('carrito_timestamp', Date.now());

    // 2. SINCRONIZACIÓN AUTOMÁTICA CON RAILWAY (Si está logueado, se guarda en Postgres)
    if (token) {
        fetch('/api/guardar-carrito', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ carrito: carrito }) 
        }).catch(e => console.log("Error de sincronización con servidor de base de datos"));
    }
}

async function cargarCarritoLocal(){
    const token = localStorage.getItem('token');
    const key = token ? 'carrito_' + token : 'carrito_anonimo';
    
    try {
        // Si el usuario ya inició sesión, le pedimos su carrito guardado en Railway
        if (token) {
            const res = await fetch('/api/obtener-carrito', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.carrito && data.carrito.length > 0) {
                carrito = data.carrito;
                recalcularPreciosMayoristas();
                renderizarCarrito();
                actualizarProgresoMayorista();
                return;
            }
        }
    } catch(e) {
        console.log("Servidor ocupado, usando respaldo de memoria local...");
    }

    // Respaldo de emergencia en el navegador si no hay red o sesión
    const g = localStorage.getItem(key) || localStorage.getItem('tienda_carrito');
    const ts = localStorage.getItem('carrito_timestamp');
    if (g && ts && (Date.now() - ts < 7 * 24 * 60 * 60 * 1000)) {
        try {
            carrito = JSON.parse(g);
            recalcularPreciosMayoristas();
            renderizarCarrito();
            actualizarProgresoMayorista();
        } catch(e) {
            carrito = [];
        }
    }
}
