const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

console.log('🔍 Starting asset copy process...');
console.log('Script location:', __dirname);
console.log('Working directory:', process.cwd());

try {
  // Paths are relative to project root (where the script is located)
  const sourceViews = path.join(__dirname, 'views');
  const sourcePublic = path.join(__dirname, 'public');
  const dest = path.join(__dirname, 'dist');
  
  console.log('Source views path:', sourceViews);
  console.log('Source public path:', sourcePublic);
  console.log('Destination path:', dest);
  
  // Ensure dist directory exists
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
    console.log('✓ Created dist directory');
  }

  // Copy views directory
  console.log('\n📁 Copying views directory...');
  if (fs.existsSync(sourceViews)) {
    console.log('✓ Found views directory at:', sourceViews);
    
    // Show what we're copying
    const viewsContents = fs.readdirSync(sourceViews);
    console.log('Views directory contents:', viewsContents);
    
    if (fs.existsSync(path.join(sourceViews, 'pages'))) {
      const pagesContents = fs.readdirSync(path.join(sourceViews, 'pages'));
      console.log('Pages directory contents:', pagesContents);
    }
    
    // Copy the views
    copyRecursiveSync(sourceViews, path.join(dest, 'views'));
    console.log('✓ Views copied to dist/views');
    
    // Verify the copy worked
    const destViews = path.join(dest, 'views');
    const destPages = path.join(dest, 'views', 'pages');
    
    if (fs.existsSync(destPages)) {
      const copiedPages = fs.readdirSync(destPages);
      console.log('✅ Verified: dist/views/pages contains:', copiedPages);
      
      // Check for specific files
      if (copiedPages.includes('index.ejs')) {
        console.log('✅ Found index.ejs in destination');
      }
      if (copiedPages.includes('error.ejs')) {
        console.log('✅ Found error.ejs in destination');
      }
    } else {
      console.log('❌ dist/views/pages was not created properly');
      process.exit(1);
    }
  } else {
    console.log('❌ Views directory not found at:', sourceViews);
    process.exit(1);
  }
  
  // Copy public directory
  console.log('\n📁 Copying public directory...');
  if (fs.existsSync(sourcePublic)) {
    console.log('✓ Found public directory at:', sourcePublic);
    copyRecursiveSync(sourcePublic, path.join(dest, 'public'));
    console.log('✓ Public assets copied successfully');
  } else {
    console.log('⚠️  Public directory not found at:', sourcePublic);
  }
  
  console.log('\n✅ Asset copying completed successfully!');
  
} catch (error) {
  console.error('❌ Error copying assets:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}