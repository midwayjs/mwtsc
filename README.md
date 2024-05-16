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

# the child process keep avaliable during the development
$ npx mwtsc --watch --run ./bootstrap.js --keepalive
```

## Different with tsc and tsc-watch

* 1、support `--run` option, run file after compile success
* 2、support copy non-ts file to dist directory when build source code
* 3、support ts alias path by tsc-alias

## API

You can use `mwtsc` API in your code to extend your own logic.

mwtsc API:

* `run` - run tsc compile
* `chokidar` - watch file change

run API:
* `exit` - exit process
* `restart` - restart process
* `onExit` - on exit event

```ts
// custom.js
const { run, chokidar } = require('mwtsc');
const { restart, exit, onExit } = run();

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
    "dev": "NODE_ENV=local node ./custom.js --watch --run ./bootstrap.js"
  }
}
```
