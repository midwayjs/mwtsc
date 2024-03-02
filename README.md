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
