import fs from "fs";
import path from "path";
import { execSync } from "child_process";

console.log("🚀 Starting Vite to Next.js migration...\n");

// Step 1: Install Next.js dependency
function installNextJs() {
  console.log("📦 Step 1: Installing Next.js...");
  try {
execSync("npm install next@latest --legacy-peer-deps", { stdio: "inherit" });
    console.log("✅ Next.js installed successfully\n");
  } catch (error) {
    console.error("❌ Failed to install Next.js:", error.message);
    process.exit(1);
  }
}

// Step 2: Create Next.js configuration file
function createNextConfig() {
  console.log("⚙️  Step 2: Creating Next.js configuration...");

  const nextConfigContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Outputs a Single-Page Application (SPA).
  distDir: './dist', // Changes the build output directory to \`./dist/\`.
}

export default nextConfig
`;

  fs.writeFileSync("next.config.mjs", nextConfigContent);
  console.log("✅ next.config.mjs created\n");
}

// Step 3: Update TypeScript configuration
function updateTsConfig() {
  console.log("📝 Step 3: Updating TypeScript configuration...");

  const tsConfigPath = "tsconfig.json";

  if (!fs.existsSync(tsConfigPath)) {
    console.log(
      "⚠️  No tsconfig.json found, skipping TypeScript configuration\n"
    );
    return;
  }

  try {
    const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, "utf8"));

    // Update compilerOptions
    tsConfig.compilerOptions = {
      ...tsConfig.compilerOptions,
      esModuleInterop: true,
      jsx: "preserve",
      allowJs: true,
      forceConsistentCasingInFileNames: true,
      incremental: true,
      plugins: [{ name: "next" }],
    };

    // Update include array - preserve existing includes and add Next.js specific ones
    const existingIncludes = tsConfig.include || ["src/**/*"];
    tsConfig.include = [
      ...new Set([
        ...existingIncludes,
        "./src",
        "./dist/types/**/*.ts",
        "./next-env.d.ts",
      ]),
    ];

    // Update exclude array - preserve existing excludes
    const existingExcludes = tsConfig.exclude || [];
    tsConfig.exclude = [...new Set([...existingExcludes, "./node_modules"])];

    // Remove references and files if they exist (Next.js doesn't need them)
    delete tsConfig.references;
    delete tsConfig.files;

    fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
    console.log("✅ tsconfig.json updated\n");
  } catch (error) {
    console.error("❌ Failed to update tsconfig.json:", error.message);
  }
}

// Step 4: Create root layout
function createRootLayout() {
  console.log("🏗️  Step 4: Creating root layout...");

  // Create app directory
  const appDir = path.join("src", "app");
  if (!fs.existsSync(appDir)) {
    fs.mkdirSync(appDir, { recursive: true });
  }

  // Read index.html to extract metadata
  let title = "My App";
  let description = "My App description";

  if (fs.existsSync("index.html")) {
    const indexHtml = fs.readFileSync("index.html", "utf8");

    const titleMatch = indexHtml.match(/<title>(.*?)<\/title>/);
    if (titleMatch) title = titleMatch[1];

    const descMatch = indexHtml.match(
      /<meta\s+name="description"\s+content="(.*?)"/
    );
    if (descMatch) description = descMatch[1];
  }

  const layoutContent = `import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '${title}',
  description: '${description}',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  )
}
`;

  fs.writeFileSync(path.join(appDir, "layout.tsx"), layoutContent);
  console.log("✅ Root layout created\n");
}

// Step 5: Create entrypoint page
function createEntrypointPage() {
  console.log("📄 Step 5: Creating entrypoint page...");

  const slugDir = path.join("src", "app", "[[...slug]]");
  if (!fs.existsSync(slugDir)) {
    fs.mkdirSync(slugDir, { recursive: true });
  }

  // Create client component
  const clientContent = `'use client'

import React from 'react'
import dynamic from 'next/dynamic'

const App = dynamic(() => import('../../App'), { ssr: false })

export function ClientOnly() {
  return <App />
}
`;

  fs.writeFileSync(path.join(slugDir, "client.tsx"), clientContent);

  // Create page component
  const pageContent = `import '../../index.css'
import { ClientOnly } from './client'

export function generateStaticParams() {
  return [{ slug: [''] }]
}

export default function Page() {
  return <ClientOnly />
}
`;

  fs.writeFileSync(path.join(slugDir, "page.tsx"), pageContent);
  console.log("✅ Entrypoint page created\n");
}

// Step 6: Update image imports (create helper function)
function createImageImportHelper() {
  console.log("🖼️  Step 6: Creating image import helper...");

  const helperContent = `// Helper for migrating Vite image imports to Next.js
// Replace: import logo from './logo.png'
// With: import logo from './logo.png'
// Then use: <img src={logo.src} /> instead of <img src={logo} />

// For images in public folder, you can also reference them directly:
// <img src="/logo.png" /> (if the file is at public/logo.png)

export function getImageSrc(imageImport: any): string {
  return imageImport.src || imageImport;
}
`;

  const utilsDir = path.join("src", "utils");
  if (!fs.existsSync(utilsDir)) {
    fs.mkdirSync(utilsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(utilsDir, "imageHelper.ts"), helperContent);
  console.log("✅ Image import helper created\n");
}

// Step 7: Update environment variables
function updateEnvVariables() {
  console.log("🔐 Step 7: Updating environment variables...");

  const envFiles = [
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
  ];

  envFiles.forEach((envFile) => {
    if (fs.existsSync(envFile)) {
      let content = fs.readFileSync(envFile, "utf8");

      // Replace VITE_ prefix with NEXT_PUBLIC_
      content = content.replace(/VITE_/g, "NEXT_PUBLIC_");

      fs.writeFileSync(envFile, content);
      console.log(`✅ Updated ${envFile}`);
    }
  });

  // Create migration guide for code changes
  const envMigrationGuide = `# Environment Variables Migration Guide

## Automatic Changes Made:
- All VITE_ prefixes changed to NEXT_PUBLIC_

## Manual Changes Required in Your Code:

### Replace Vite-specific environment variables:
- \`import.meta.env.MODE\` → \`process.env.NODE_ENV\`
- \`import.meta.env.PROD\` → \`process.env.NODE_ENV === 'production'\`
- \`import.meta.env.DEV\` → \`process.env.NODE_ENV !== 'production'\`
- \`import.meta.env.SSR\` → \`typeof window !== 'undefined'\`
- \`import.meta.env.BASE_URL\` → \`process.env.NEXT_PUBLIC_BASE_PATH\`

### For BASE_URL support, add to your .env file:
NEXT_PUBLIC_BASE_PATH="/your-base-path"

And update next.config.mjs:
\`\`\`javascript
const nextConfig = {
  output: 'export',
  distDir: './dist',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
}
\`\`\`
`;

  fs.writeFileSync("ENV_MIGRATION_GUIDE.md", envMigrationGuide);
  console.log("✅ Environment variables updated\n");
}

// Step 8: Update package.json scripts
function updatePackageJsonScripts() {
  console.log("📦 Step 8: Updating package.json scripts...");

  try {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

    packageJson.scripts = {
      ...packageJson.scripts,
      dev: "next dev",
      build: "next build",
      start: "next start",
    };

    fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));
    console.log("✅ package.json scripts updated\n");
  } catch (error) {
    console.error("❌ Failed to update package.json:", error.message);
  }
}

// Step 9: Update .gitignore
function updateGitignore() {
  console.log("📝 Step 9: Updating .gitignore...");

  const gitignoreAdditions = `
# Next.js
.next
next-env.d.ts
dist
`;

  if (fs.existsSync(".gitignore")) {
    const currentGitignore = fs.readFileSync(".gitignore", "utf8");
    if (!currentGitignore.includes(".next")) {
      fs.appendFileSync(".gitignore", gitignoreAdditions);
    }
  } else {
    fs.writeFileSync(".gitignore", gitignoreAdditions);
  }

  console.log("✅ .gitignore updated\n");
}

// Create cleanup script
function createCleanupScript() {
  console.log("🧹 Creating cleanup script...");

  const cleanupContent = `import fs from 'fs';
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
    console.log(\`✅ Deleted \${file}\`);
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
`;

  fs.writeFileSync("cleanup-vite.js", cleanupContent);
  console.log("✅ Cleanup script created (cleanup-vite.js)\n");
}

// Create migration summary
function createMigrationSummary() {
  const summaryContent = `# Vite to Next.js Migration Summary

## ✅ Completed Steps:
1. ✅ Installed Next.js dependency
2. ✅ Created Next.js configuration file (next.config.mjs)
3. ✅ Updated TypeScript configuration (if applicable)
4. ✅ Created root layout (src/app/layout.tsx)
5. ✅ Created entrypoint page (src/app/[[...slug]]/page.tsx)
6. ✅ Created image import helper (src/utils/imageHelper.ts)
7. ✅ Updated environment variables
8. ✅ Updated package.json scripts
9. ✅ Updated .gitignore

## 🚀 Next Steps:

### 1. Test Your Application
Run: \`npm run dev\`
Open: http://localhost:3000

### 2. Manual Code Updates Required:

#### Image Imports:
- Change: \`<img src={logo} />\`
- To: \`<img src={logo.src} />\`
- Or use the helper: \`import { getImageSrc } from './utils/imageHelper'\`

#### Environment Variables:
- Check ENV_MIGRATION_GUIDE.md for required code changes
- Replace \`import.meta.env.MODE\` with \`process.env.NODE_ENV\`
- Replace other Vite env variables as documented

### 3. Clean Up (Optional)
Run: \`node cleanup-vite.js\` to remove Vite artifacts

### 4. Future Optimizations:
- Migrate to Next.js App Router for better performance
- Use Next.js Image component for automatic optimization
- Implement Server-Side Rendering (SSR) where beneficial
- Add Next.js font optimization

## 📚 Resources:
- [Next.js Documentation](https://nextjs.org/docs)
- [Migration Guide](https://nextjs.org/docs/app/guides/migrating/from-vite)
- [App Router](https://nextjs.org/docs/app/building-your-application/routing)

Happy coding! 🎉
`;

  fs.writeFileSync("MIGRATION_SUMMARY.md", summaryContent);
}

// Main migration function
function runMigration() {
  try {
    installNextJs();
    createNextConfig();
    updateTsConfig();
    createRootLayout();
    createEntrypointPage();
    createImageImportHelper();
    updateEnvVariables();
    updatePackageJsonScripts();
    updateGitignore();
    createCleanupScript();
    createMigrationSummary();

    console.log("🎉 Migration completed successfully!");
    console.log("📖 Check MIGRATION_SUMMARY.md for next steps");
    console.log('🚀 Run "npm run dev" to start your Next.js application');
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

// Run the migration
runMigration();
