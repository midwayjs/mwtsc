process.on('SIGINT', () => {
  process.send('server-kill-complete');
  // process.exit(0);
});

// process.on('SIGTERM', () => {
//   process.send('server-kill-complete');
//   process.exit(0);
// });

process.send({
  title: 'server-ready',
});
