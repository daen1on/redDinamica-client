const fs = require('fs');
const path = require('path');

/**
 * SCRIPT DE MIGRACIÓN AUTÁTICA: BOOTSTRAP 4.6.2 → BOOTSTRAP 5.3
 * 
 * Este script automatiza las correcciones más comunes para migrar de Bootstrap 4 a Bootstrap 5
 * Fecha: Enero 2025
 * Autor: AI Assistant
 */

// Configuración de los patrones de reemplazo
const replacements = [
    // Data attributes (CRÍTICO)
    { from: /data-toggle="/g, to: 'data-bs-toggle="' },
    { from: /data-target="/g, to: 'data-bs-target="' },
    
    // Spacing utilities (COMÚN)
    { from: /\bml-(\d+)\b/g, to: 'ms-$1' },
    { from: /\bmr-(\d+)\b/g, to: 'me-$1' },
    { from: /\bpl-(\d+)\b/g, to: 'ps-$1' },
    { from: /\bpr-(\d+)\b/g, to: 'pe-$1' },
    
    // Text alignment (COMÚN)
    { from: /\btext-left\b/g, to: 'text-start' },
    { from: /\btext-right\b/g, to: 'text-end' },
    
    // Button block (COMÚN)
    { from: /\bbtn-block\b/g, to: 'w-100' },
    
    // Form control file (ESPECÍFICO)
    { from: /\bform-control-file\b/g, to: 'form-control' },
    
    // Dropdown menu alignment (ESPECÍFICO)
    { from: /\bdropdown-menu-right\b/g, to: 'dropdown-menu-end' },
    { from: /\bdropdown-menu-left\b/g, to: 'dropdown-menu-start' },
    
    // Badge pill (YA COMPATIBLE EN BS5)
    // { from: /\bbadge-pill\b/g, to: 'rounded-pill' }, // Ya es compatible
    
    // Font weight utilities (ESPECÍFICO)
    { from: /\bfont-weight-bold\b/g, to: 'fw-bold' },
    { from: /\bfont-weight-bolder\b/g, to: 'fw-bolder' },
    { from: /\bfont-weight-normal\b/g, to: 'fw-normal' },
    { from: /\bfont-weight-light\b/g, to: 'fw-light' },
    { from: /\bfont-weight-lighter\b/g, to: 'fw-lighter' },
];

// Función para procesar un archivo
function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let hasChanges = false;
        
        replacements.forEach(replacement => {
            if (replacement.from.test(content)) {
                content = content.replace(replacement.from, replacement.to);
                hasChanges = true;
            }
        });
        
        if (hasChanges) {
            fs.writeFileSync(filePath, content, 'utf8');
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error procesando ${filePath}:`, error.message);
        return false;
    }
}

// Función para recorrer directorios recursivamente
function walkDirectory(dir, processedFiles = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            // Ignorar node_modules y otras carpetas no relevantes
            if (!['node_modules', '.git', 'dist', '.angular'].includes(file)) {
                walkDirectory(filePath, processedFiles);
            }
        } else if (file.endsWith('.html')) {
            const changed = processFile(filePath);
            if (changed) {
                processedFiles.push(filePath);
                console.log(`✅ Procesado: ${filePath}`);
            }
        }
    });
    
    return processedFiles;
}

// Ejecutar el script
console.log('🚀 Iniciando migración automática Bootstrap 4 → 5...\n');

const startTime = Date.now();
const processedFiles = walkDirectory('./src');
const endTime = Date.now();

console.log(`\n✨ Migración completada en ${endTime - startTime}ms`);
console.log(`📁 Archivos procesados: ${processedFiles.length}`);

if (processedFiles.length > 0) {
    console.log('\n📝 Archivos modificados:');
    processedFiles.forEach(file => console.log(`   - ${file}`));
} else {
    console.log('\n✅ No se encontraron archivos que requieran cambios.');
}

console.log('\n🔍 Revisa manualmente:');
console.log('   - Modales y componentes JavaScript');
console.log('   - Formularios complejos');
console.log('   - Estilos personalizados');
console.log('   - Funcionalidad de dropdowns y tooltips'); 