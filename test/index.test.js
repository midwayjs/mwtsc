const execa = require('execa');
const { join, resolve } = require('path');
const { existsSync, unlinkSync, writeFileSync, readFileSync } = require('fs');
const { forkRun } = require('../lib/process');

const mtscPath = join(__dirname, '../bin/mwtsc.js');

describe('/test/index.js', () => {
  it('should throw error when no --run parameter', async () => {
    await new Promise(resolve => {
      process.stderr.on('data', data => {
        console.log(data.toString());
        resolve();
      });

      process.stdout.on('data', data => {
        console.log(data.toString());
        resolve();
      });

      const cp = execa('node', [mtscPath], []);
      cp.stdout.pipe(process.stdout);
      cp.stderr.pipe(process.stderr);

      cp.on('exit', code => {
        console.log('exit', code);
        resolve();
      });

      setTimeout(() => {
        cp.kill();
      }, 3000);
    })
  });

  it('should compile ts file and run custom js', async () => {
    await new Promise((resolve, reject) => {
      process.stderr.on('data', data => {
        console.log(data.toString());
        resolve();
      });

      process.stdout.on('data', data => {
        console.log(data.toString());
        resolve();
      });

      const runPath = join(__dirname, 'fixtures/base');
      const cp = execa('node', [mtscPath, '--run', './run.js'], {
        cwd: runPath,
      });
      cp.stdout.pipe(process.stdout);
      cp.stderr.pipe(process.stderr);

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

  it('should test ts file change and reload process', async () => {

    // prepare
    const runPath = join(__dirname, 'fixtures/add_file');
    const file = join(runPath, 'a.ts');
    if (existsSync(file)) {
      unlinkSync(file);
    }

    const cp = execa('node', [mtscPath, '--watch', '--run', './run.js'], {
      cwd: runPath,
      // stdio: 'ignore',
    });

    // add a new file
    writeFileSync(file, 'console.log("a")');

    // change file
    writeFileSync(file, 'console.log("b")');

    await new Promise((resolve, reject) => {
      cp.on('exit', code => {
        try {
          expect(existsSync(join(runPath, 'dist/a.js'))).toBeTruthy();
          expect(readFileSync(join(runPath, 'dist/a.js'), 'utf-8')).toMatch(/b/);
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
