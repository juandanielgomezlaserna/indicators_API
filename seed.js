const db = require('./config/db');

const seedData = async () => {
    try {
        console.log("🌱 Iniciando siembra de datos...");
        const queries = [
            ['Gimnasio', 40, 'fisico'],
            ['Programación', 50, 'inteligencia'],
            ['Salud', 20, 'fisico'],
            ['Familia', 40, 'amor']
        ];

        for (const data of queries) {
            await db.query(
                'INSERT INTO indicadores (nombre, valor, tipo) VALUES ($1, $2, $3)',
                data
            );
        }
        console.log("✅ Datos de prueba insertados con éxito.");
        process.exit();
    } catch (err) {
        console.error("❌ Error en el seed:", err);
        process.exit(1);
    }
};

seedData();