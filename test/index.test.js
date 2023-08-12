const execa = require('execa');
const { join } = require('path');
const { existsSync } = require('fs');

const mtscPath = join(__dirname, '../bin/mtsc');

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
        cp.kill();
        resolve();
      });
    })
  });

  it.only('should compile ts file and run custom js', async () => {
    await new Promise(resolve => {
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
        expect(existsSync(join(runPath, 'dist/a.js'))).toBeTruthy();
        cp.kill();
        resolve();
      });
    })
  });
});