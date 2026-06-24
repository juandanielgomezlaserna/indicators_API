// 1. IMPORTACIONES DE LIBRERÍAS (Núcleo)
require('dotenv').config(); // Carga variables de entorno al inicio
const express = require('express');
const cors = require('cors'); // Seguridad para permitir llamados de otros dominios
const helmet = require('helmet'); // Protege la API configurando varios headers HTTP

// 2. IMPORTACIONES DE RUTAS
// Nota: Aquí irás agregando tus archivos de la carpeta /routes
const indicatorRoutes = require('./routes/indicator.routes');
const logroRoutes = require('./routes/logro.routes');
const wishRoutes = require('./routes/wish.routes');

// 3. INICIALIZACIÓN DE LA APP
const app = express();

// 4. MIDDLEWARES GLOBALES
app.use(helmet()); // Seguridad base
app.use(cors()); // Control de acceso
app.use(express.json()); // Permite que Express entienda JSON en el body
app.use(express.urlencoded({ extended: true })); // Para formularios complejos

// 5. DEFINICIÓN DE RUTAS (Prefijo de versión)
// Usamos v1 para que si el día de mañana cambias todo, no rompas lo viejo
app.use('/api/v1/indicator', indicatorRoutes);
app.use('/api/v1/logro', logroRoutes);
app.use('/api/v1/wish', wishRoutes);

// 6. MANEJO DE RUTAS NO ENCONTRADAS (404)
app.use((req, res, next) => {
    res.status(404).json({
        status: 'error',
        message: 'La ruta solicitada no existe en el servidor Elite.'
    });
});

// 7. MANEJADOR DE ERRORES GLOBAL (Captura fallos en Services o Controllers)
app.use((err, req, res, next) => {
    console.error(`[Error Server]: ${err.message}`);
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Error interno del servidor',
        // Solo mostramos el stack de error si estamos en desarrollo
        stack: process.env.NODE_ENV === 'development' ? err.stack : {}
    });
});

// 8. ARRANQUE DEL SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    =========================================
    🚀 API INDICATORS - SERVIDOR "ELITE"
    🌍 Entorno: ${process.env.NODE_ENV}
    📡 Puerto: ${PORT}
    🔗 URL: http://localhost:${PORT}/api/v1
    =========================================
    `);
});