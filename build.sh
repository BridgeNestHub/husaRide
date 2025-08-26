#!/bin/bash

echo "🏗️  Building HusaRide..."

# Clean previous build
rm -rf dist/

# Compile TypeScript
echo "📦 Compiling TypeScript..."
npx tsc

# Copy static assets
echo "📁 Copying static assets..."
cp -r public dist/
cp -r views dist/
cp -r models dist/
cp -r routes dist/
cp -r utils dist/

# Ensure all CSS files are present
echo "🎨 Verifying CSS files..."
ls -la dist/public/css/

# Copy environment files if they exist
if [ -f .env ]; then
    cp .env dist/
fi

echo "✅ Build complete!"
echo "📂 Build output: dist/"