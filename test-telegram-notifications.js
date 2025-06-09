const { createStartMessage, createErrorMessage, createSuccessMessage } = (() => {
  // Mock environment variables
  process.env.VERSION = '1.2.3';
  process.env.RELEASE_TYPE = 'beta';
  process.env.BUILD_PLATFORM = 'Windows';
  process.env.GITHUB_REPOSITORY = 'user/repo';
  process.env.GITHUB_SERVER_URL = 'https://github.com';
  process.env.GITHUB_RUN_ID = '12345';
  process.env.GITHUB_RUN_NUMBER = '42';
  process.env.ERROR_MESSAGE = 'Something went wrong';
  process.env.ARTIFACTS_URL = 'https://github.com/user/repo/actions/runs/12345/artifacts';

  // Functions from notify-telegram.cjs
  function getRunUrl() {
    if (!process.env.GITHUB_RUN_ID || !process.env.GITHUB_REPOSITORY) {
      return '';
    }
    return ${process.env.GITHUB_SERVER_URL}//actions/runs/;
  }

  function createStartMessage() {
    const emoji = process.env.RELEASE_TYPE === 'beta' ? '' : '';
    const type = process.env.RELEASE_TYPE === 'beta' ? 'бета' : 'стабильный';
    const runUrl = getRunUrl();
    const runLink = runUrl ? \n\n [Просмотреть процесс]() : '';
    
    return ${emoji} *Начат  релиз v*\n\n +
            Платформа: \n +
            Сборка: #;
  }

  function createErrorMessage() {
    const runUrl = getRunUrl();
    const runLink = runUrl ? \n\n [Просмотреть детали ошибки]() : '';
    const errorDetails = process.env.ERROR_MESSAGE ? \n\n Детали ошибки:\n\\\\n\n\\\` : '';
    
    return  *Ошибка релиза v*\n\n +
            Платформа: \n +
            Сборка: #;
  }

  function createSuccessMessage() {
    const emoji = process.env.RELEASE_TYPE === 'beta' ? '' : '';
    const type = process.env.RELEASE_TYPE === 'beta' ? 'бета' : 'стабильный';
    const runUrl = getRunUrl();
    const runLink = runUrl ? \n\n [Процесс сборки]() : '';
    
    let artifactsSection = '';
    if (process.env.ARTIFACTS_URL) {
      artifactsSection = \n\n *Ссылки на артефакты:*\n;
    }
    
    return ${emoji} *Успешно завершен  релиз v*\n\n +
            Платформа: \n +
            Сборка: #;
  }

  return { createStartMessage, createErrorMessage, createSuccessMessage };
})();

console.log('--- Start Notification ---');
console.log(createStartMessage());
console.log('\n--- Error Notification ---');
console.log(createErrorMessage());
console.log('\n--- Success Notification (Beta) ---');
console.log(createSuccessMessage());

// Switch to stable release
process.env.RELEASE_TYPE = 'stable';
process.env.ARTIFACTS_URL = 'https://github.com/user/repo/releases/tag/v1.2.3';

console.log('\n--- Success Notification (Stable) ---');
console.log(createSuccessMessage());
