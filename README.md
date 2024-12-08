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

# run with kill timeout
$ npx mwtsc --watch --run ./bootstrap.js --kill-timeout 5000

# the child process keep avaliable during the development
$ npx mwtsc --watch --run ./bootstrap.js --keepalive

# run with inspect and debug in chrome or other supported tools
$ npx mwtsc --watch --inspect --run ./bootstrap.js
$ npx mwtsc --watch --inspect-brk --run ./bootstrap.js
```

## Different with tsc and tsc-watch

* 1、support `--run` option, run file after compile success
* 2、support copy non-ts file to dist directory when build source code
* 3、support ts alias path by tsc-alias


## About `--kill-timeout`

Process kill timeout in milliseconds. When restarting the application, if the process doesn't exit within this time, it will be forcefully killed.

Default: `2000`

When using `Ctrl+C` to stop the process, it will follow the `kill-timeout` to kill the process.

## About `--inspect` and `--inspect-brk`

If you're using VSCode or JetBrains IntelliJ IDEA (or other IDEs), you won't need to manually start the child process with debugging flags like --inspect or --inspect-brk. The IDE will automatically attach the debugger to the child process. 

However, if you wish to debug the child process within Chrome, you can utilize --inspect or --inspect-brk to initiate the child process with the debugger enabled.

```bash
$ npx mwtsc --watch --inspect --run ./bootstrap.js
$ npx mwtsc --watch --inspect-brk --run ./bootstrap.js
```

Unfortunately, Chrome DevTools cannot directly access local files with certain special protocols due to security policies. To overcome this, we set up a proxy server to serve the source files. You will need to configure the proxy server's location in your tsconfig.json to properly handle source maps.

```json
{
  "compilerOptions": {
    "sourceRoot": "http://localhost:7788/"
  }
}
```

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
