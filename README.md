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