// Genera códigos del estilo NYRA-ALPHA-8492
const generarNuevoCodigo = () => {
  const numeroAleatorio = Math.floor(1000 + Math.random() * 9000);
  return `NYRA-ALPHA-${numeroAleatorio}`;
};

module.exports = { generarNuevoCodigo };