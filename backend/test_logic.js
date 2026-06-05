const kilometraje_final = 150;
const km = (kilometraje_final !== undefined && kilometraje_final !== null && kilometraje_final !== '') ? parseInt(kilometraje_final) : null;
console.log('Result:', km, typeof km);

const km2 = (0 !== undefined && 0 !== null && 0 !== '') ? parseInt(0) : null;
console.log('Result for 0:', km2, typeof km2);

const km3 = (undefined !== undefined) ? 'ok' : 'fail';
console.log('Result for undefined:', km3);
