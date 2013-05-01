Appacitive.session.environment = 'sandbox';
var _sessionOptions = { "apikey": Appacitive.apikey, app: 'hub' }

var eventId = Appacitive.eventManager.subscribe('session.success', function () {
    console.log("Session created");
    Appacitive.eventManager.unsubscribe(eventId);

    var rooms = new Appacitive.ArticleCollection({ schema: 'room' });
    rooms.getQuery().extendOptions({
        pageSize: 20,
        pageNumber:1
    });
    rooms.fetch(function() {
        var rArticles = rooms.getAll();

        message.rooms = [];
        for(var i = 0 ; i < rArticles.length ; i = i + 1 ){
           message.rooms.push(rArticles[i].getArticle());
        }
        completed(message);
    },function(){
        message.rooms=[];
        completed(message);
    });
});

Appacitive.eventManager.subscribe('session.error',function(){
   completed(message);
});

Appacitive.session.create(_sessionOptions);