// 拿到执行路径，以及执行文件
const childPath = process.env.CHILD_CMD_PATH;
const childCwd = process.env.CHILD_CWD;
const { join, isAbsolute } = require('path');
const { CHILD_PROCESS_EXCEPTION_EXIT_CODE } = require('./constants');

// get the child process execArgs
const runArgs = process.argv.slice(2);
if (runArgs.includes('--keepalive')) {
  process.once('unhandledRejection', err => {
    console.error(err);
    process.exit(CHILD_PROCESS_EXCEPTION_EXIT_CODE);
  });

  process.once('uncaughtException', err => {
    console.error(err);
    process.exit(CHILD_PROCESS_EXCEPTION_EXIT_CODE);
  });
}

process.on('message', data => {
  if (data.title === 'server-kill') {
    process.emit('SIGINT');
  }
});

process.chdir(childCwd);
if (isAbsolute(childPath)) {
  require(childPath);
} else {
  require(join(childCwd, childPath));
}
