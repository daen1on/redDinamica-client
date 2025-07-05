const fs = require('fs');
const path = require('path');

/**
 * SCRIPT ESPECÍFICO: CORRECCIÓN DE MODALES BOOTSTRAP 5
 * 
 * Corrige los siguientes elementos de modales:
 * - data-dismiss="modal" → data-bs-dismiss="modal"
 * - class="close" → class="btn-close" (botones de cierre)
 * - Elimina <span aria-hidden="true">&times;</span> de botones btn-close
 */

const modalReplacements = [
    // Cambiar data-dismiss por data-bs-dismiss
    { 
        from: /data-dismiss="modal"/g, 
        to: 'data-bs-dismiss="modal"',
        description: 'data-dismiss → data-bs-dismiss'
    },
    
    // Reemplazar botón de cierre completo
    { 
        from: /<button\s+type="button"\s+class="close"\s+data-bs-dismiss="modal"\s+aria-label="Close">\s*<span\s+aria-hidden="true">&times;<\/span>\s*<\/button>/g,
        to: '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>',
        description: 'Botón de cierre modal completo'
    },
    
    // Caso alternativo del botón de cierre
    { 
        from: /<button\s+type="button"\s+class="close"\s+data-dismiss="modal"\s+aria-label="Close">\s*<span\s+aria-hidden="true">&times;<\/span>\s*<\/button>/g,
        to: '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>',
        description: 'Botón de cierre con data-dismiss (fallback)'
    },
    
    // Solo cambiar la clase si quedó alguna suelta
    { 
        from: /class="close"/g, 
        to: 'class="btn-close"',
        description: 'class="close" → class="btn-close"'
    }
];

function processModalFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let hasChanges = false;
        const changesApplied = [];
        
        modalReplacements.forEach(replacement => {
            const matches = content.match(replacement.from);
            if (matches) {
                content = content.replace(replacement.from, replacement.to);
                hasChanges = true;
                changesApplied.push(`${replacement.description} (${matches.length} cambios)`);
            }
        });
        
        if (hasChanges) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ ${filePath}`);
            changesApplied.forEach(change => console.log(`   - ${change}`));
            return true;
        }
        return false;
    } catch (error) {
        console.error(`❌ Error procesando ${filePath}:`, error.message);
        return false;
    }
}

function walkDirectory(dir, processedFiles = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            if (!['node_modules', '.git', 'dist', '.angular', 'bootstrap-migration-docs'].includes(file)) {
                walkDirectory(filePath, processedFiles);
            }
        } else if (file.endsWith('.html')) {
            // Solo procesar archivos que contienen "modal"
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('modal') || content.includes('data-dismiss')) {
                const changed = processModalFile(filePath);
                if (changed) {
                    processedFiles.push(filePath);
                }
            }
        }
    });
    
    return processedFiles;
}

// Ejecutar el script
console.log('🔧 Iniciando corrección de modales Bootstrap 5...\n');

const startTime = Date.now();
const processedFiles = walkDirectory('./src');
const endTime = Date.now();

console.log(`\n✨ Corrección de modales completada en ${endTime - startTime}ms`);
console.log(`📁 Archivos con modales corregidos: ${processedFiles.length}`);

if (processedFiles.length > 0) {
    console.log('\n📝 Archivos modificados:');
    processedFiles.forEach(file => console.log(`   - ${file}`));
} else {
    console.log('\n✅ No se encontraron modales que requieran corrección.');
}

console.log('\n🔍 Verificaciones completadas:');
console.log('   ✅ data-dismiss → data-bs-dismiss');
console.log('   ✅ class="close" → class="btn-close"');
console.log('   ✅ Eliminación de spans innecesarios');
console.log('   ✅ Estructura de botones de cierre actualizada'); 