const { parseArgs } = require('../lib/util');
describe('test/util.test.js', () => {
  it('should parse', () => {
    expect(parseArgs(['node', 'tsc'])).toEqual([undefined, [], []]);
    expect(parseArgs(['node', 'tsc', '--watch'])).toEqual([undefined, ['--watch'], []]);
    expect(parseArgs(['node', 'tsc', '--watch', '--run', 'index.js'])).toEqual(['index.js', ['--watch'], []]);
    expect(parseArgs(['node', 'tsc', '--watch', '--run', 'index.js', '--', '--port', '3000'])).toEqual(['index.js', ['--watch'], ['--', '--port', '3000']]);
    expect(parseArgs(['node', 'tsc', '--watch', '--project', 'tsconfig.prod.json'])).toEqual([undefined, ['--watch', '--project', 'tsconfig.prod.json'], []]);
    expect(parseArgs(['node', 'tsc', '--watch', '--run'])).toEqual([undefined, ['--watch'], []]);
  });
});
