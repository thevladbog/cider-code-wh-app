#!/usr/bin/env node

/**
 * Скрипт для создания ICO файла из PNG с использованием ico-endec
 */

const fs = require('fs');
const path = require('path');

async function createIcoFile() {
  try {
    const { encode } = require('ico-endec');
    const sharp = require('sharp');
    
    const assetsDir = path.join(__dirname, '..', 'src', 'assets');
    const iconPath = path.join(assetsDir, 'icon.png');
    const icoPath = path.join(assetsDir, 'icon.ico');
    
    if (!fs.existsSync(iconPath)) {
      console.error('❌ Файл icon.png не найден в src/assets/');
      process.exit(1);
    }
    
    console.log('🎨 Создание ICO файла из PNG...');
    
    // Создаем изображения разных размеров
    const sizes = [16, 24, 32, 48, 64, 128, 256];
    const images = [];
    
    for (const size of sizes) {
      console.log(`📏 Создание размера ${size}x${size}...`);
      const buffer = await sharp(iconPath)
        .resize(size, size)
        .png()
        .toBuffer();
      
      images.push(buffer);
    }
    
    // Создаем ICO файл
    console.log('🔨 Кодирование ICO файла...');
    const icoBuffer = encode(images);
    
    // Сохраняем ICO файл
    fs.writeFileSync(icoPath, icoBuffer);
    
    console.log('✅ ICO файл успешно создан:', icoPath);
    console.log('📊 Размер файла:', Math.round(icoBuffer.length / 1024), 'KB');
    
  } catch (error) {
    console.error('❌ Ошибка при создании ICO файла:', error.message);
    process.exit(1);
  }
}

createIcoFile();
