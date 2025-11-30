const net = require('net');

function testTcp(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port }, () => {
      console.log(`TCP connect success: ${host}:${port}`);
      socket.end();
      resolve();
    });
    socket.on('error', (err) => {
      console.error(`TCP connect failed: ${host}:${port}`, err);
      resolve();
    });
  });
}

(async () => {
  await testTcp('my-redis-redis-sentinel-redis-0.redis.default.svc.cluster.local', 26379);
  await testTcp('sentinel.default.svc.cluster.local', 26379);
})();

