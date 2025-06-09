#!/usr/bin/env node

/**
 * Скрипт для настройки автоматического обновления сертификатов
 * Работает на Linux, macOS и Windows
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const APP_PATH = process.cwd();
const SCRIPT_PATH = path.join(APP_PATH, 'scripts', 'renew-certificates.cjs');
const LOG_PATH = path.join(APP_PATH, 'logs', 'cert-renewal.log');

// Убедимся, что директория для логов существует
const logDir = path.dirname(LOG_PATH);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function setupLinuxCron() {
  console.log('🐧 Setting up cron job for Linux...');
  
  try {
    // Проверяем, есть ли уже наша задача в crontab
    let currentCrontab = '';
    try {
      currentCrontab = execSync('crontab -l 2>/dev/null || true').toString();
    } catch (e) {
      // Игнорируем ошибку, если crontab пуст
    }
    
    const cronJob = `0 2 * * * cd ${APP_PATH} && /usr/bin/node ${SCRIPT_PATH} >> ${LOG_PATH} 2>&1`;
    
    if (currentCrontab.includes(SCRIPT_PATH)) {
      console.log('✅ Cron job already exists');
      return;
    }
    
    // Добавляем новую задачу
    const newCrontab = currentCrontab + '\n' + cronJob + '\n';
    
    // Записываем временный файл crontab
    const tempCrontab = path.join(os.tmpdir(), 'temp_crontab');
    fs.writeFileSync(tempCrontab, newCrontab);
    
    // Устанавливаем новый crontab
    execSync(`crontab ${tempCrontab}`);
    
    // Удаляем временный файл
    fs.unlinkSync(tempCrontab);
    
    console.log('✅ Cron job installed successfully');
    console.log(`📅 Schedule: Daily at 2:00 AM`);
    console.log(`📋 Command: ${cronJob}`);
    
  } catch (error) {
    console.error('❌ Failed to setup cron job:', error.message);
    console.log('💡 Manual setup:');
    console.log('   1. Run: crontab -e');
    console.log(`   2. Add: 0 2 * * * cd ${APP_PATH} && /usr/bin/node ${SCRIPT_PATH} >> ${LOG_PATH} 2>&1`);
  }
}

function setupMacOSLaunchd() {
  console.log('🍎 Setting up launchd for macOS...');
  
  const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', 'com.bottle-code.cert-renewal.plist');
  
  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.bottle-code.cert-renewal</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>${SCRIPT_PATH}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${APP_PATH}</string>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>${LOG_PATH}</string>
    <key>StandardErrorPath</key>
    <string>${LOG_PATH}</string>
</dict>
</plist>`;

  try {
    // Создаем директорию LaunchAgents если она не существует
    const launchAgentsDir = path.dirname(plistPath);
    if (!fs.existsSync(launchAgentsDir)) {
      fs.mkdirSync(launchAgentsDir, { recursive: true });
    }
    
    // Записываем plist файл
    fs.writeFileSync(plistPath, plistContent);
    
    // Загружаем задачу
    execSync(`launchctl load ${plistPath}`);
    
    console.log('✅ LaunchAgent installed successfully');
    console.log(`📋 Plist file: ${plistPath}`);
    
  } catch (error) {
    console.error('❌ Failed to setup LaunchAgent:', error.message);
    console.log('💡 Manual setup:');
    console.log(`   1. Create file: ${plistPath}`);
    console.log(`   2. Run: launchctl load ${plistPath}`);
  }
}

function setupWindowsTask() {
  console.log('🪟 Setting up Windows Task Scheduler...');
  
  try {
    const taskName = 'Certificate Renewal';
    const nodeExe = execSync('where node').toString().trim();
    
    // Создаем XML для задачи
    const taskXml = `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Date>2025-01-01T00:00:00</Date>
    <Author>Certificate Manager</Author>
    <Description>Automatic certificate renewal</Description>
  </RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>2025-01-01T02:00:00</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
      </ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>HighestAvailable</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>false</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>true</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT1H</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions>
    <Exec>
      <Command>${nodeExe}</Command>
      <Arguments>${SCRIPT_PATH}</Arguments>
      <WorkingDirectory>${APP_PATH}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>`;

    // Записываем XML в временный файл
    const tempXmlPath = path.join(os.tmpdir(), 'cert-renewal-task.xml');
    fs.writeFileSync(tempXmlPath, taskXml);
    
    // Удаляем существующую задачу, если она есть
    try {
      execSync(`schtasks /delete /tn "${taskName}" /f`, { stdio: 'pipe' });
    } catch (e) {
      // Игнорируем ошибку, если задача не существует
    }
    
    // Создаем новую задачу
    execSync(`schtasks /create /tn "${taskName}" /xml "${tempXmlPath}"`);
    
    // Удаляем временный файл
    fs.unlinkSync(tempXmlPath);
    
    console.log('✅ Windows Task Scheduler task installed successfully');
    console.log(`📅 Schedule: Daily at 2:00 AM`);
    console.log(`📋 Task name: ${taskName}`);
    
  } catch (error) {
    console.error('❌ Failed to setup Windows task:', error.message);
    console.log('💡 Manual setup:');
    console.log('   1. Open Task Scheduler');
    console.log('   2. Create Basic Task...');
    console.log(`   3. Action: Start a program`);
    console.log(`   4. Program: ${nodeExe || 'node'}`);
    console.log(`   5. Arguments: ${SCRIPT_PATH}`);
    console.log(`   6. Start in: ${APP_PATH}`);
  }
}

function showInstructions() {
  console.log('\n📋 Setup Complete!');
  console.log('\n🔧 Environment Variables:');
  console.log('   Set these environment variables for your certificate renewal:');
  console.log('   - DOMAIN_NAME: Your domain name');
  console.log('   - ACME_EMAIL: Your email for Let\'s Encrypt');
  console.log('   - CERT_PATH: Path to certificate directory (optional)');
  console.log('   - WEBHOOK_URL: Slack/Teams webhook for notifications (optional)');
  console.log('   - SERVICES_TO_RESTART: Services to restart after renewal (optional)');
  
  console.log('\n📊 Monitoring:');
  console.log(`   - Log file: ${LOG_PATH}`);
  console.log('   - Check logs: tail -f ' + LOG_PATH);
  
  console.log('\n🧪 Testing:');
  console.log('   - Test renewal: node ' + SCRIPT_PATH);
  console.log('   - Dry run: DOMAIN_NAME=test.com node ' + SCRIPT_PATH);
  
  console.log('\n🗑️  Uninstall:');
  if (process.platform === 'win32') {
    console.log('   - schtasks /delete /tn "Certificate Renewal" /f');
  } else if (process.platform === 'darwin') {
    console.log('   - launchctl unload ~/Library/LaunchAgents/com.bottle-code.cert-renewal.plist');
    console.log('   - rm ~/Library/LaunchAgents/com.bottle-code.cert-renewal.plist');
  } else {
    console.log('   - crontab -e (remove the certificate renewal line)');
  }
}

// Основная логика
function main() {
  console.log('🔧 Setting up automatic certificate renewal...');
  console.log(`🖥️  Platform: ${process.platform}`);
  console.log(`📁 App path: ${APP_PATH}`);
  console.log(`📜 Script path: ${SCRIPT_PATH}`);
  
  // Проверяем, существует ли скрипт обновления
  if (!fs.existsSync(SCRIPT_PATH)) {
    console.error(`❌ Certificate renewal script not found: ${SCRIPT_PATH}`);
    console.log('💡 Make sure you have run: npm run setup');
    process.exit(1);
  }
  
  // Настраиваем автоматическое обновление в зависимости от платформы
  switch (process.platform) {
    case 'win32':
      setupWindowsTask();
      break;
    case 'darwin':
      setupMacOSLaunchd();
      break;
    case 'linux':
    default:
      setupLinuxCron();
      break;
  }
  
  showInstructions();
}

main();
