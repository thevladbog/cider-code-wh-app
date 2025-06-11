import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import * as fs from 'fs';
import * as path from 'path';

// Функция для динамического получения версии
function getAppVersion(): string {
  // Сначала пробуем взять версию из переменной окружения (приоритет для CI/CD)
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION;
  }
  
  // Иначе читаем из package.json
  try {
    const packageData = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    return packageData.version;
  } catch (error) {
    console.warn('Warning: Could not read package.json, using default version');
    return '1.0.0';
  }
}

// Загружаем данные пакета для получения метаданных  
// const packageData = JSON.parse(fs.readFileSync('./package.json', 'utf8')); // Больше не нужно
const appVersion = getAppVersion();

// Check if certs directory exists before including it
const certsPath = path.join(__dirname, 'certs');
const extraResources = [];

// Only include certs if they exist and we're not in CI
if (fs.existsSync(certsPath) && !process.env.CI) {
  try {
    // Verify we can read the directory
    fs.readdirSync(certsPath);
    extraResources.push('./certs');
    console.log('✓ Including certs directory in package');
  } catch (error) {
    console.warn('⚠️  Certs directory exists but cannot be read, skipping...');
  }
} else if (process.env.CI) {
  console.log('ℹ️  Skipping certs directory inclusion in CI environment');
} else {
  console.log('ℹ️  Certs directory not found, skipping...');
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '**/node_modules/{electron-squirrel-startup}/**/*'
    },
    // Conditionally add certs as extra resources if they exist
    ...(extraResources.length > 0 && { extraResource: extraResources }),
    // Добавляем иконку приложения
    icon: './src/assets/icon',
    // Настройки для Windows
    win32metadata: {
      CompanyName: 'v-b.tech',
      ProductName: 'Bottle CODE WH App',
      FileDescription: 'Warehouse Management Application',
      OriginalFilename: 'bottle-code-wh-app.exe'
    }
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      setupExe: `bottle-code-wh-app-${appVersion}-setup.exe`,
      noMsi: true,
      // Добавляем иконку для установщика (используем новый ICO файл)
      setupIcon: './src/assets/icon.ico',
      // Настройки для автоматического обновления
      // remoteReleases: 'http://localhost:3001', // Для локального тестирования
      // Опции для подписи (только если есть сертификаты)
      ...(process.env.WINDOWS_CERTIFICATE_FILE && {
        certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
        certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD
      })
    }), 
    new MakerZIP({
      // Для MakerZIP нет свойства name, но можно задать через outDir
    }, ['darwin']), 
    new MakerDMG({
      name: `bottle-c-wh-${appVersion}`,
      // Настройки для DMG
      format: 'ULFO',
      // Добавляем иконку для DMG
      icon: './src/assets/icon.icns'
    }, ['darwin']),
    new MakerRpm({
      options: {
        name: 'bottle-code-wh-app',
        productName: 'bottle-code-wh-app'
      }
    }), 
    new MakerDeb({
      options: {
        name: 'bottle-code-wh-app',
        productName: 'bottle-code-wh-app',
        maintainer: 'Vladislav Bogatyrev <vladislav.bogatyrev@gmail.com>'
      }
    })
  ],
  // Настройка для публикации в GitHub Releases
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'thevladbog',
          name: 'cider-code-wh-app'
        },
        draft: true,
        prerelease: appVersion.includes('beta')
      }
    }
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
