const { join, resolve } = require('path');
const { unlink } = require('fs/promises');
const { existsSync, writeFileSync, readFileSync  } = require('fs');
const { forkRun } = require('../lib/process');
const { execa, sleep, removeFile } = require('./util');

const mtscPath = join(__dirname, '../bin/mwtsc.js');

describe('/test/index.js', () => {
  it('should compile ts file completely and exit', async () => {
    const runPath = join(__dirname, 'fixtures/test_build');
    await removeFile([
      join(runPath, 'a.js'),
    ]);

    const cp = await execa('node', [mtscPath], {
      cwd: runPath,
    });

    await new Promise(resolve => {
      const h = setTimeout(() => {
        throw new Error('Child process is running timeout');
      }, 1000);

      cp.on('exit', code => {
        clearTimeout(h);
        expect(existsSync(join(runPath, 'a.js'))).toBeTruthy();
        console.log('exit', code);
        resolve();
      });
    });
  });

  it('should compile ts file and ignore run script without watch args', async () => {
    const runPath = join(__dirname, 'fixtures/base');
    const cp = await execa('node', [mtscPath, '--run', './run.js'], {
      cwd: runPath,
    });

    await new Promise((resolve, reject) => {
      cp.on('exit', code => {
        try {
          expect(existsSync(join(runPath, 'dist/a.js'))).toBeTruthy();
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      setTimeout(() => {
        cp.kill();
      }, 3000);
    });
  });

  it('should test ts file change and reload process', async () => {
    // prepare
    const runPath = join(__dirname, 'fixtures/add_file');
    const file = join(runPath, 'a.ts');
    await removeFile([
      file,
      join(runPath, 'dist/a.js'),
    ]);

    const cp = await execa('node', [mtscPath, '--watch', '--run', './run.js'], {
      cwd: runPath,
    });

    // add a new file
    writeFileSync(file, 'console.log("a")');

    await sleep(500);

    // change file
    writeFileSync(file, 'console.log("b")');

    await sleep(500);

    await new Promise((resolve, reject) => {
      cp.on('exit', code => {
        try {
          expect(existsSync(join(runPath, 'dist/a.js'))).toBeTruthy();
          expect(readFileSync(join(runPath, 'dist/a.js'), 'utf-8')).toMatch(/"b"/);
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      setTimeout(() => {
        cp.kill();
      }, 3000);
    });
  });

  it.skip('should test ts file and directory removed', async () => {
    // prepare
    const runPath = join(__dirname, 'fixtures/remove_file');
    const file = join(runPath, 'src/a.ts');
    await removeFile([
      file,
      join(runPath, 'dist/a.js'),
    ]);

    const cp = await execa('node', [mtscPath, '--watch', '--run', './run.js'], {
      cwd: runPath,
    });

    // add a new file
    writeFileSync(file, 'console.log("a")');
    await sleep(2000);

    expect(existsSync(join(runPath, 'dist/a.js'))).toBeTruthy();

    // remove file
    await unlink(file);

    await sleep(2000);

    // check file removed
    expect(existsSync(file)).toBeFalsy();
    expect(existsSync(join(runPath, 'dist/a.js'))).toBeFalsy();

    await new Promise((resolve, reject) => {
      cp.on('exit', code => {
        try {
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      setTimeout(() => {
        cp.kill();
      }, 10000);
    });
  });

  it('should test ts file init error and reload process', async () => {

    // prepare
    const runPath = join(__dirname, 'fixtures/add_file');
    const file = join(runPath, 'a.ts');
    await removeFile([
      file,
      join(runPath, 'dist/a.js'),
    ]);

    // add a error file
    writeFileSync(file, 'console.log("a)');

    const cp = await execa('node', [mtscPath, '--watch', '--run', './run.js'], {
      cwd: runPath,
    });

    // change file
    writeFileSync(file, 'console.log("b")');

    await sleep(1000);

    await new Promise((resolve, reject) => {
      cp.on('exit', code => {
        try {
          expect(existsSync(join(runPath, 'dist/a.js'))).toBeTruthy();
          expect(readFileSync(join(runPath, 'dist/a.js'), 'utf-8')).toMatch(/"b"/);
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      setTimeout(() => {
        cp.kill();
      }, 3000);
    });
  });

  it('should send server-kill event to child process and receive response', (done) => {
    const childProcess = forkRun(resolve(__dirname, './fixtures/custom-event.js'));
    childProcess.getRealChild().on('message', (data) => {
      if (data === 'server-kill-complete') {
        childProcess.kill();
        done();
      }
    });
    childProcess.onServerReady(() => {
      childProcess.getRealChild().send({
        title: 'server-kill',
      });
    });
  });

  it('should restart when running failed with error and file changed soon', async () => {
    // prepare
    const runPath = join(__dirname, 'fixtures/unreject_error');
    const file = join(runPath, 'a.ts');
    await removeFile([
      file,
      join(runPath, 'dist/a.js'),
    ]);

    const tpl = `
(async () => {
  throw new Error('error')
})();
`;

    // write to a.ts
    writeFileSync(file, tpl);

    const cp = await execa('node', [mtscPath, '--watch', '--run', './run.js'], {
      cwd: runPath,
    });

    await sleep(1000);

    // change file
    writeFileSync(file, 'console.log("b")');

    await new Promise((resolve, reject) => {
      cp.on('exit', code => {
        try {
          expect(existsSync(join(runPath, 'dist/a.js'))).toBeTruthy();
          expect(readFileSync(join(runPath, 'dist/a.js'), 'utf-8')).toMatch(/"b"/);
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      setTimeout(() => {
        cp.kill();
      }, 3000);
    });
  });

  it('should not restart when bootstrap fail in keepalive mode', async () => {
    // prepare
    const runPath = join(__dirname, 'fixtures/init_error');
    await removeFile([
      join(runPath, 'dist/a.js'),
    ]);

    const cp = await execa('node', [mtscPath, '--watch', '--run', './run.js', '--keepalive'], {
      cwd: runPath,
    });

    await new Promise((resolve, reject) => {
      cp.on('exit', code => {
        try {
          expect(existsSync(join(runPath, 'dist/a.js'))).toBeTruthy();
          expect(readFileSync(join(runPath, 'dist/a.js'), 'utf-8')).toMatch(/"b"/);
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      setTimeout(() => {
        cp.kill();
      }, 3000);
    });
  });
});
