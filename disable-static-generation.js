const fs = require('fs');
const path = require('path');

// Function to add generateStaticParams to all page files in dashboard
function disableStaticGeneration(dir) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && item !== 'node_modules') {
      disableStaticGeneration(fullPath);
    } else if (item === 'page.tsx' || item === 'page.ts') {
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Skip if already has generateStaticParams
      if (content.includes('generateStaticParams')) {
        console.log(`Skipping ${fullPath} - already has generateStaticParams`);
        continue;
      }

      // Add generateStaticParams to prevent static generation
      const updatedContent = content.replace(
        /(export default)/,
        '// Prevent static generation for this page\nexport const generateStaticParams = () => [];\n\n$1'
      );

      fs.writeFileSync(fullPath, updatedContent);
      console.log(`Updated ${fullPath}`);
    }
  }
}

// Disable static generation for all dashboard pages
disableStaticGeneration('app/dashboard');
console.log('Done!');