# midway tsc

it's a tsc wrapper, like tsc-watch.

## Usage

```bash
# run package file
$ npx mtsc --watch --run @midwayjs/mock/app.js

# run file
$ npx mtsc --watch --run ./bootstrap.js

# run with tsc options
$ npx mtsc --watch --project tsconfig.production.json --run ./bootstrap.js
```