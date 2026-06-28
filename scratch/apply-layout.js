import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const ignorePages = [
  'Login/LoginPage.jsx',
  'AdminLogin/AdminLoginPage.jsx',
  'ForgotPassword/ForgotPasswordPage.jsx',
  'Register/RegisterPage.jsx',
  'Payment/PaymentSuccessPage.jsx',
  'Payment/PaymentCancelPage.jsx'
];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

function processFile(filePath) {
  const relPath = path.relative(path.join(projectRoot, 'src', 'pages'), filePath).replace(/\\/g, '/');
  if (ignorePages.includes(relPath)) {
    console.log(`Skipping: ${relPath}`);
    return;
  }

  if (!filePath.endsWith('.jsx')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Remove Sidebar import
  content = content.replace(/import\s+Sidebar\s+from\s+['"].*?Layout\/Sidebar['"];?\r?\n?/g, '');
  // Remove Header import
  content = content.replace(/import\s+Header\s+from\s+['"].*?Layout\/Header['"];?\r?\n?/g, '');

  // Remove `<Sidebar ... />`
  content = content.replace(/<Sidebar\s+[^>]*?\/>\r?\n?/g, '');
  // Remove `<Header ... />`
  content = content.replace(/<Header\s*?\/>\r?\n?/g, '');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated layout for: ${relPath}`);
  }
}

const pagesDir = path.join(projectRoot, 'src', 'pages');
console.log(`Scanning pages directory: ${pagesDir}`);
walkDir(pagesDir, processFile);
console.log('Done.');
