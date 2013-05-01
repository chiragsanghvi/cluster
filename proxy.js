var proxyServer = require('http-proxy');
var servers = [
  {
    host: "localhost",
    port: 8081
  },
  {
    host: "localhost",
    port: 8082
  }
];

proxyServer.createServer(function (req, res, proxy) {
  var target = servers.shift();
  console.log("Sent request to " +target.port);
  proxy.proxyRequest(req, res, target);
  servers.push(target);
}).listen(8080);