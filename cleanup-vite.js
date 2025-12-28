import fs from 'fs';
import { execSync } from 'child_process';

console.log('🧹 Starting cleanup of Vite artifacts...');

// Files to delete
const filesToDelete = [
  'main.tsx',
  'src/main.tsx',
  'index.html', 
  'vite-env.d.ts',
  'src/vite-env.d.ts',
  'tsconfig.node.json',
  'vite.config.ts',
  'vite.config.js'
];

filesToDelete.forEach(file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`✅ Deleted ${file}`);
  }
});

// Uninstall Vite dependencies
console.log('📦 Uninstalling Vite dependencies...');
try {
  execSync('npm uninstall vite @vitejs/plugin-react @vitejs/plugin-react-swc', { stdio: 'inherit' });
  console.log('✅ Vite dependencies uninstalled');
} catch (error) {
  console.log('⚠️  Some Vite dependencies may not have been installed');
}

console.log('🎉 Cleanup complete!');
