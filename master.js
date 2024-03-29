var cluster = require('cluster');

cluster.setupMaster({
  exec : "runner.js",
  silent : false
});
//This will be fired when the forked process becomes online
cluster.on( "online", function(worker) {
    var timer = 0;

    worker.on( "message", function(msg) {
        clearTimeout(timer); //The worker responded in under 5 seconds, clear the timeout
        console.log(msg);
        worker.destroy(); //Don't leave him hanging 

    });
    timer = setTimeout( function() {
        worker.destroy(); //Give it 5 seconds to run, then abort it
        console.log("worker timed out");
    }, 50000);

    worker.send('completed();' ); //Send the code to run for the worker
});
cluster.fork();