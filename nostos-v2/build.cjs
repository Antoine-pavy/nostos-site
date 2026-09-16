const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = __dirname;
const destination = path.join(root, 'dist');
const production = process.env.NOSTOS_PREVIEW !== 'true' && (process.env.CONTEXT === 'production' || process.argv.includes('--production'));
const pages = ['index.html','mentions-legales.html','cgv.html','politique-confidentialite.html','merci.html','annulation.html','checkout.html','404.html'];
const scripts = ['script.js','tracking.js','purchase.js'];
const styles = ['style.css','tracking.css','fonts.css'];
const assets = ['logo-officiel.png','NOSTOS_logo-removebg-64.webp','NOSTOS_logo-removebg-128.webp','tailwind.generated.css','carte-voyage.webp','carte-officielle.png','prev_mail1.png','prev_mail2.png','prev_mail4.png','temoin1.jpg','temoin2.jpg','temoin3.jpg','temoin4.jpg','temoin5.jpg','vsl-carte-640.webp','vsl-preview.mp4'];
assets.push('inter-OFL.txt', 'playfairdisplay-OFL.txt');
for(const match of fs.readFileSync(path.join(root,'fonts.css'),'utf8').matchAll(/url\(assets\/([^)]+)\)/g)) assets.push(match[1]);
// Rebuild generated output from scratch: previous deploys may leave extra files.
// Never follow a symlink/junction or delete outside this project's dist directory.
if (path.dirname(destination) !== root || path.basename(destination) !== 'dist') throw new Error('Unsafe output directory');
if (fs.existsSync(destination)) {
  if (fs.lstatSync(destination).isSymbolicLink() || !fs.statSync(destination).isDirectory()) throw new Error('Output directory must be a real directory');
  if (fs.realpathSync(destination) !== path.join(fs.realpathSync(root), 'dist')) throw new Error('Output directory resolves outside the project');
  fs.rmSync(destination, { recursive: true });
}
fs.mkdirSync(destination,{recursive:true});
fs.mkdirSync(path.join(destination,'assets'),{recursive:true});
// Explicit allowlist: no PDF, source reports, backend credentials or source archives.
for (const file of [...scripts,...styles,...assets.map(a=>'assets/'+a)]) fs.copyFileSync(path.join(root,file),path.join(destination,file));
for (const file of pages) {
  let html = fs.readFileSync(path.join(root,file),'utf8').replace(/^\uFEFF/,'');
  html = html.replace(/<meta name="robots"[^>]*>/g,'');
  const indexable = production && !['merci.html','annulation.html','checkout.html','404.html'].includes(file);
  if (file==='index.html') {
    html = html.replace('</head>', '<link rel="canonical" href="https://nostosprogram.com/"><meta property="og:type" content="website"><meta property="og:locale" content="fr_FR"><meta property="og:title" content="Nostos — Programme 30 jours"><meta property="og:description" content="Un voyage guidé par email pour retrouver une relation choisie avec ton téléphone. 30 jours, 39 €."><meta property="og:url" content="https://nostosprogram.com/"><meta property="og:image" content="https://nostosprogram.com/assets/logo-officiel.png"></head>');
  }
  html=html.replace('</head>',`<meta name="robots" content="${indexable?'index, follow':'noindex, nofollow'}"><meta name="nostos-environment" content="${production?'production':'preview'}"></head>`);
  fs.writeFileSync(path.join(destination,file),html);
}
fs.writeFileSync(path.join(destination,'robots.txt'),production?'User-agent: *\nAllow: /\nDisallow: /merci\nDisallow: /checkout\nDisallow: /annulation\nSitemap: https://nostosprogram.com/sitemap.xml\n':'User-agent: *\nDisallow: /\n');
fs.writeFileSync(path.join(destination,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['','mentions-legales.html','cgv.html','politique-confidentialite.html'].map(p=>`<url><loc>https://nostosprogram.com/${p}</loc></url>`).join('')+'</urlset>');
const allowed = new Set([...pages,...scripts,...styles,'robots.txt','sitemap.xml',...assets.map(a=>'assets/'+a)]);
function validate(dir) { for(const item of fs.readdirSync(dir,{withFileTypes:true})) {const p=path.join(dir,item.name);if(item.isDirectory())validate(p);else {const relative=path.relative(destination,p).replaceAll('\\','/');if(!allowed.has(relative))throw new Error('Unexpected public file: '+relative);} } }
validate(destination);
for(const file of pages) {
  const html=fs.readFileSync(path.join(destination,file),'utf8');
  for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {const ref=match[1].split('#')[0].split('?')[0];if(!/^(https?:|mailto:|data:|\/)/.test(ref)&&!fs.existsSync(path.join(destination,ref)))throw new Error(`Broken link in ${file}: ${ref}`);}
}
const initial = ['index.html',...styles,...scripts].reduce((sum,file)=>sum+zlib.gzipSync(fs.readFileSync(path.join(destination,file))).length,0);
console.log(`Build ${production?'production':'preview'}: ${allowed.size} public files, gzip HTML/CSS/JS ${initial} bytes; no private files.`);
