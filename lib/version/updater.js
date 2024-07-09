const { Worker } = require('worker_threads');
const path = require('path');
const { debug } = require('../util');

/**
 * 创建并执行一个 worker 线程来下载和更新 npm 包
 * @param {string} packageName - 需要更新的包名
 */
const updatePackageInWorker = (packageName, targetDir, version = 'latest') => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.resolve(__dirname, 'worker.js'), {
      workerData: { packageName, targetDir, version },
    });

    worker.on('message', message => {
      debug(message);
    });

    worker.on('error', error => {
      debug(`Worker error: ${error.message}`);
      resolve(); // 吞掉异常，不抛出错误
    });

    worker.on('exit', code => {
      if (code !== 0) {
        debug(`Worker stopped with exit code ${code}`);
      }
      resolve();
    });
  });
};

exports.updatePackageInWorker = updatePackageInWorker;
