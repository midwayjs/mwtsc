const { init } = require('./dist/a.js')
init().then(() => {
  process.send({ title: 'server-ready' });
});
