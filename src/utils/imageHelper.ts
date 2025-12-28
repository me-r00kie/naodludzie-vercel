// Helper for migrating Vite image imports to Next.js
// Replace: import logo from './logo.png'
// With: import logo from './logo.png'
// Then use: <img src={logo.src} /> instead of <img src={logo} />

// For images in public folder, you can also reference them directly:
// <img src="/logo.png" /> (if the file is at public/logo.png)

export function getImageSrc(imageImport: any): string {
  return imageImport.src || imageImport;
}
