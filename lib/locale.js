const { colors } = require('./util');
const { format } = require('util');

function underline(str) {
  return `\x1b[4m${str}\x1b[0m`;
}

const getLanguage = () => {
  const lang = process.env.LC_ALL || process.env.LANG || process.env.LANGUAGE;
  if (!lang) {
    return 'en';
  }

  const languageCode = lang.split('.')[0];
  const primaryLanguage = languageCode.split('_')[0];

  if (primaryLanguage !== 'en' && primaryLanguage !== 'zh') {
    return 'en';
  }

  return primaryLanguage;
};

const language = getLanguage();

const locales = {
  en: {
    greeting: 'Hello, world!',
    versionWarn: `Some installed Midway components are not compatible with the core version, which may cause system exceptions\nThere are ${colors.red(
      '%s'
    )} modules with version issues in node_modules`,
    updateTip: `Please use ${colors.cyan(
      '(p)npx midway-version -m'
    )} to update to the compatible version\nor ${colors.cyan(
      '(p)npx midway-version -u'
    )} to update to the latest version`,
    continuePrompt: `Do you want to continue? (${underline('y')}es/${underline(
      'n'
    )}o): `,
    exitMessage: 'Exiting the process.',
    proceedMessage: 'Proceeding to the next step...',
    invalidInput: 'Invalid input. Please enter "yes" or "no".',
  },
  zh: {
    greeting: '你好，世界！',
    versionWarn: `${colors.yellow('Warning')} ${colors.dim(
      '检查到以下'
    )}${colors.yellow(' %s ')}${colors.dim('个 Midway 组件存在兼容性问题')}`,
    versionItem: `${colors.yellow('➜')}  ${colors.dim(
      '%s 当前版本：'
    )}%s ${colors.dim('可用版本: ')}%s`,
    updateTip: `请使用 ${colors.cyan(
      '(p)npx midway-version -m'
    )} 命令更新到兼容版本\n或 ${colors.cyan(
      '(p)npx midway-version -u'
    )} 更新到最新版本`,
    continuePrompt: `是否继续启动？(${underline('y')}es/${underline('n')}o):`,
    exitMessage: '正在退出程序。',
    proceedMessage: '进入下一步...',
    invalidInput: '输入无效。请输入“是”或“否”。',
  },
};

exports.getLocalizedString = (key, args = []) => {
  const locale = locales[language];
  return format(locale[key], ...args);
};
