var cluster = require('cluster');
var http = require('http');
var numCPUs = require('os').cpus().length;

process.setMaxListeners(0);
if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
    cluster.fork();
  });
} else {
  // Workers can share any TCP connection
  // In this case its a HTTP server
  var vm = require("vm");
  var server = http.createServer(function(req, res) {
    console.log("Got some work");
    var startTime = new Date().getTime();
    var obj = {
      console: { log: console.log, dir: console.dir },
      completed:function(message){
        var result = JSON.stringify(message);
        res.statusCode = "200";
        res.end(result);
      },
      Appacitive : require('./AppacitiveJSSDK.js')('v5VC8m933yOXgc7+LU609YriJD8itYQpQNMpFHMxXt4='),
      c : 10,
      message:{}
    };
    var ctx = vm.createContext(obj);
    require('fs').exists('./code.js', function (exists) {
      if (exists) {
        require('fs').readFile('./code.js', function (err, data) {
          if (err) throw err;
          var script = vm.createScript(data, './code.vm');
          console.log("Setting context took " +(new Date().getTime() - startTime) +"ms");
          script.runInContext(ctx);
        });
      } else {
        completed(message);
      }
    });
    //var script = vm.createScript( "console.log(Appacitive.apikey);Appacitive.session.environment = 'sandbox';var _sessionOptions = { 'apikey': Appacitive.apikey, app: 'hub' };Appacitive.eventManager.subscribe('session.success', function () {console.log('Remote response received in ' + (new Date().getTime() - startTime) + 'ms, forwarding.');console.log('Appacitive session is ' + Appacitive.session.get()); completed();});var startTime = new Date().getTime();Appacitive.session.create(_sessionOptions);");
    //var script = vm.createScript( "console.log(url);Appacitive.session.environment = 'sandbox';var _sessionOptions = { 'apikey': Appacitive.apikey, app: 'hub' };var x='';completed();");
    //var script = vm.createScript( "c=c+10;console.log(c);completed();") ;
    
  });
  server.setMaxListeners(0);
  server.listen(8081);
}