const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');

const sourceViews = path.join(__dirname, '..', 'views');
const sourcePublic = path.join(__dirname, '..', 'public');
const dest = path.join(__dirname, '..', 'dist');

async function copyAssets() {
    console.log('Starting asset copy...');
    try {
        await fse.copy(sourceViews, path.join(dest, 'views'));
        console.log('Views directory copied successfully!');
        
        await fse.copy(sourcePublic, path.join(dest, 'public'));
        console.log('Public directory copied successfully!');

        console.log('Asset copy complete!');
    } catch (err) {
        console.error('Error copying assets:', err);
        process.exit(1);
    }
}

copyAssets();