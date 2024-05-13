# midway tsc

it's a tsc wrapper, like tsc-watch.

## Usage

```bash
# run package file
$ npx mwtsc --watch --run @midwayjs/mock/app.js

# run file
$ npx mwtsc --watch --run ./bootstrap.js

# run with tsc options
$ npx mwtsc --watch --project tsconfig.production.json --run ./bootstrap.js
```

## Different with tsc and tsc-watch

* 1、support `--run` option, run file after compile success
* 2、support copy non-ts file to dist directory when build source code
* 3、support ts alias path by tsc-alias

## API

You can use `mwtsc` API in your code to extend your own logic.

```ts
// custom.js
const { run, chokidar } = require('mwtsc');
const { restart, exit, onExit, onRestart } = run();

const watcher = chokidar.watch('node_modules/**/*.ts', {
  ignoreInitial: true,
  ignored: ['**/*.d.ts'],
});

watcher.on('all', (event, path) => {
  console.log(event, path);
  restart([
    '/home/admin/workspace/midwayjs/midway/packages/mock/src/app.ts',
  ]);
});

onExit(async () => {
  await watcher.close();
});

```

Rewrite dev command in `package.json` .

```json
{
  "scripts": {
    "dev": "./custom.js --watch --run ./bootstrap.js"
  }
}
```
