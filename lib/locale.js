const { colors } = require('./util');

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
    versionWarn:
      'Some of the installed Midway components are not compatible with the core version, which may cause system abnormalities\nThe following modules have version issues in node_modules',
    allow: 'Available versions',
    updateTip: `Please use ${colors.cyan(
      'npx midway-version -u'
    )} command to update`,
    continuePrompt: `Do you want to continue? (${underline('y')}es/${underline(
      'n'
    )}o): `,
    exitMessage: 'Exiting the process.',
    proceedMessage: 'Proceeding to the next step...',
    invalidInput: 'Invalid input. Please enter "yes" or "no".',
  },
  zh: {
    greeting: '你好，世界！',
    versionWarn:
      '当前部分安装的 Midway 组件和 core 版本不兼容，可能会引起系统异常\n以下模块在 node_modules 中的版本存在问题',
    allow: '可用版本',
    updateTip: `请使用 ${colors.cyan('npx midway-version -u')} 命令更新`,
    continuePrompt: `是否继续启动？(${underline('y')}es/${underline('n')}o):`,
    exitMessage: '正在退出程序。',
    proceedMessage: '进入下一步...',
    invalidInput: '输入无效。请输入“是”或“否”。',
  },
};

exports.getLocalizedString = key => {
  const locale = locales[language];
  return locale[key];
};
