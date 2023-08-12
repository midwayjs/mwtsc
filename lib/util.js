exports.parseArgs = argv => {
  // 去除头两位参数
  const pargs = argv.slice(2);

  // 找到 --run 命令以及后面的所有参数
  const runIndex = pargs.findIndex(arg => arg === '--run');

  if (runIndex === -1) {
    return [undefined, pargs, []];
  }

  // 分出 --run，后一个路径，以及剩余的其他参数
  const runArgs = pargs.slice(runIndex + 1);

  // 简单约定，--run 后面的参数都是给子进程的
  const [runCmdPath, ...runChildArgs] = runArgs;

  // 从 pargs 中移除 --run 命令后面所有参数
  if (runIndex !== -1) {
    pargs.splice(runIndex);
  }

  return [runCmdPath, pargs, runChildArgs];
};
