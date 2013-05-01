//The runner.js is ran in a separate process and just listens for the message which contains code to be executed
process.on('message', function( UNKNOWN_CODE ) {

    var vm = require("vm");

    var obj = {
    	console: { log: console.log, dir: console.dir },
    	completed:function(){
    		process.send( "finished" );//Send the finished message to the parent process
    	},
    	mysession:'testsession',
    	Appacitive : require('./AppacitiveJSSDK.js')('v5VC8m933yOXgc7+LU609YriJD8itYQpQNMpFHMxXt4=')
    };

    var ctx = vm.createContext(obj);

    var script = vm.createScript( "console.log(Appacitive.apikey);Appacitive.session.environment = 'sandbox';var _sessionOptions = { 'apikey': Appacitive.apikey, app: 'hub' };Appacitive.eventManager.subscribe('session.success', function () {console.log('Session created');" +UNKNOWN_CODE + "});Appacitive.session.create(_sessionOptions);");

    script.runInNewContext(ctx);
     
});