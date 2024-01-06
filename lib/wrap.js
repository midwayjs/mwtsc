// 拿到执行路径，以及执行文件
const childPath = process.env.CHILD_CMD_PATH;
const childCwd = process.env.CHILD_CWD;

process.on('message', data => {
  if (data.title === 'server-kill') {
    process.emit('SIGINT');
  }
});

process.chdir(childCwd);
require(childPath);
