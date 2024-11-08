const Table = require('cli-table3');
const { EventEmitter } = require('events');
const { colors, getIp, output } = require('./util');

class ConsoleOutput extends EventEmitter {
  constructor() {
    super();
  }

  renderPerfInit(items) {
    const table = new Table({
      head: ['name', 'duration(ms)'],
    });

    for (const item of items) {
      if (item.entryType === 'measure') {
        table.push([item.name.replace('MidwayInitialize:', ''), (item.duration).toFixed(2)]);
      }
    }

    console.log(table.toString());
  }

  renderKeepAlive() {
    output(colors.red('*'.repeat(120)));
    output(
      `A ${colors.red(
        `${colors.bright(
          'Critical unhandledRejection or uncaughtException'
        )}`
      )} was detected and the process has exited automatically.`
    );
    output('Please make sure to handle it.');
    output(
      'The --keepalive parameter was enabled, we will do our best to ensure the process remains normal.'
    );
    output(colors.red('*'.repeat(120)));
  }

  renderServerFirstReady(serverReportOption, during, hasPaths, debugUrl) {
    // 第一次启动把端口等信息打印出来
    console.log('');
    output(
      `${colors.green('Node.js server')} ${colors.dim(
        'started in'
      )} ${during} ms ${
        hasPaths
          ? colors.dim('and enable compile with ') + 'tsc-alias'
          : ''
      }\n`
    );
    if (serverReportOption && serverReportOption.port) {
      const protocol = serverReportOption.ssl ? 'https' : 'http';
      output(
        `${colors.green('➜')}  Local:    ${colors.cyan(
          `${protocol}://127.0.0.1:${colors.bright(
            serverReportOption.port
          )}${colors.cyan('/')}`
        )} `
      );
      const netWorkIp = getIp();
      if (netWorkIp) {
        output(
          `${colors.green('➜')}  ${colors.dim(
            `Network:  ${protocol}://${netWorkIp}:${serverReportOption.port}/ `
          )}`
        );
      }
      if (debugUrl) {
        output(
          `${colors.green('➜')}  ${colors.dim(
            `Debugger: devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=${debugUrl.replace(
              'ws://',
              ''
            )}`
          )}`
        );
      }
      console.log('');
    }
  }

  renderServerReady(during, debugUrl) {
    output('');
    output(
      `${colors.green('Node.js server')} ${colors.dim(
        'restarted in'
      )} ${during} ms`
    );
    if (debugUrl) {
      output(
        `${colors.green('➜')}  ${colors.dim(
          `Debugger: devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=${debugUrl.replace(
            'ws://',
            ''
          )}`
        )}`
      );
    }
    output('');
  }
}

module.exports = new ConsoleOutput();
