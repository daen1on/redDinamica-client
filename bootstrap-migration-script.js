const fs = require('fs');
const path = require('path');

// Configuración de los patrones de reemplazo
const replacements = [
    // Data attributes
    { from: /data-toggle="/g, to: 'data-bs-toggle="' },
    { from: /data-target="/g, to: 'data-bs-target="' },
    
    // Spacing utilities
    { from: /\bml-(\d+)\b/g, to: 'ms-$1' },
    { from: /\bmr-(\d+)\b/g, to: 'me-$1' },
    { from: /\bpl-(\d+)\b/g, to: 'ps-$1' },
    { from: /\bpr-(\d+)\b/g, to: 'pe-$1' },
    
    // Text alignment
    { from: /\btext-left\b/g, to: 'text-start' },
    { from: /\btext-right\b/g, to: 'text-end' },
    
    // Button block
    { from: /\bbtn-block\b/g, to: 'w-100' },
    
    // Form control file
    { from: /\bform-control-file\b/g, to: 'form-control' },
    
    // Dropdown menu
    { from: /\bdropdown-menu-right\b/g, to: 'dropdown-menu-end' },
    { from: /\bdropdown-menu-left\b/g, to: 'dropdown-menu-start' },
    
    // Badge pill
    { from: /\bbadge-pill\b/g, to: 'rounded-pill' }
];

// Función para procesar un archivo
function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        replacements.forEach(replacement => {
            if (replacement.from.test(content)) {
                content = content.replace(replacement.from, replacement.to);
                modified = true;
            }
        });
        
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Actualizado: ${filePath}`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`❌ Error procesando ${filePath}:`, error.message);
        return false;
    }
}

// Función para procesar directorio recursivamente
function processDirectory(dirPath) {
    let filesProcessed = 0;
    let filesModified = 0;
    
    function walkDir(currentPath) {
        const items = fs.readdirSync(currentPath);
        
        items.forEach(item => {
            const itemPath = path.join(currentPath, item);
            const stats = fs.statSync(itemPath);
            
            if (stats.isDirectory()) {
                // Saltar node_modules y otros directorios no relevantes
                if (!['node_modules', '.git', 'dist', '.angular'].includes(item)) {
                    walkDir(itemPath);
                }
            } else if (stats.isFile() && itemPath.endsWith('.html')) {
                filesProcessed++;
                if (processFile(itemPath)) {
                    filesModified++;
                }
            }
        });
    }
    
    walkDir(dirPath);
    return { filesProcessed, filesModified };
}

// Función principal
function main() {
    console.log('🚀 Iniciando migración automática de Bootstrap 4 → 5\n');
    
    const srcPath = path.join(__dirname, 'src');
    
    if (!fs.existsSync(srcPath)) {
        console.error('❌ Directorio src/ no encontrado');
        process.exit(1);
    }
    
    const startTime = Date.now();
    const { filesProcessed, filesModified } = processDirectory(srcPath);
    const endTime = Date.now();
    
    console.log('\n📊 RESUMEN DE MIGRACIÓN:');
    console.log(`   📄 Archivos procesados: ${filesProcessed}`);
    console.log(`   ✏️  Archivos modificados: ${filesModified}`);
    console.log(`   ⏱️  Tiempo transcurrido: ${endTime - startTime}ms`);
    
    if (filesModified > 0) {
        console.log('\n✅ ¡Migración completada exitosamente!');
        console.log('\n📝 PRÓXIMOS PASOS:');
        console.log('   1. Revisar los cambios en Git');
        console.log('   2. Probar la aplicación');
        console.log('   3. Verificar componentes interactivos (modales, dropdowns, etc.)');
    } else {
        console.log('\n✨ No se encontraron archivos que necesiten migración');
    }
}

// Ejecutar script
if (require.main === module) {
    main();
}

module.exports = { processFile, processDirectory }; 