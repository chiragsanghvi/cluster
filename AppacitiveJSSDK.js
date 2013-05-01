/** workaround for __getter__ and __setter__ API's for IE
**/

try {
   if (!Object.prototype.__defineGetter__ && Object.defineProperty({},"x",{get: function(){return true}}).x) {
      Object.defineProperty(Object.prototype, "__defineGetter__",
         {
         	enumerable: false, 
         	configurable: true,
          	value: function(name,func)
             {Object.defineProperty(this,name,
                 {
                 	get:func,
                 	enumerable: true,
                 	configurable: true
                 });
      }});
      Object.defineProperty(Object.prototype, "__defineSetter__",
         {
         	enumerable: false, 
         	configurable: true,
          	value: function(name,func)
             {
             	Object.defineProperty(this,name,
                 {
                 	set:func,
                 	enumerable: true,
                 	configurable: true
                 });
      }});
   }
} catch(defPropException) {/*Do nothing if an exception occurs*/};
// monolithic file

var global = {};

(function () {

	"use strict";

	// create the global object
    
	if (typeof window == 'undefined') {
		global = process;
	} else {
		global = window;
		console.log('window')
	}

	var _initialize = function () {
		var t;
		if (!global.Appacitive) {
			global.Appacitive = {
				runtime: {
					isNode: typeof process != typeof t,
					isBrowser: typeof window != typeof t
				}
			};
		}

//		if (typeof module != 'undefined' && typeof module.exports != 'undefined') {
//			exports = global.Appacitive;
//		}
	};
	_initialize();

	// httpRequest class, encapsulates the request 
	// without bothering about how it is going to be fired.
	/**
	 * @constructor
	 */
	var HttpRequest = function () {
		this.url = '';
		this.data = {};
		this.async = true;
		this.headers = [];
		this.method = 'GET';
	};

	// httpBuffer class, stores a queue of the requests
	// and fires them. Global level pre and post processing 
	// goes here. 
	// requires httpTransport class that is able to actually 
	// send the request and receive the response
	/**
	 * @constructor
	 */
	var HttpBuffer = function (httpTransport) {

		// validate the httpTransport passed
		// and assign the callback
		if (!httpTransport || !httpTransport.send || typeof httpTransport.send != 'function') {
			throw new Error('No applicable httpTransport class found');
		} else {
			httpTransport.onResponse = this.onResponse;
		}

		// internal handle to the http requests
		var _queue = [];

		// handle to the list of pre-processing functions
		var _preProcessors = {}, _preCount = 0;

		// handle to the list of post-processing functions
		var _postProcessors = {}, _postCount = 0;

		// public method to add a processor
		this.addProcessor = function (processor) {
			if (!processor) return;
			processor.pre = processor.pre || function () {};
			processor.post = processor.post || function () {};

			addPreprocessor(processor.pre);
			addPostprocessor(processor.post);
		};

		// stores a preprocessor
		// returns a numeric id that can be used to remove this processor
		var addPreprocessor = function (preprocessor) {
			_preCount += 1;
			_preProcessors[_preCount] = preprocessor;
			return _preCount;
		};

		// removes a preprocessor
		// returns true if it exists and has been removed successfully
		// else false
		var removePreprocessor = function (id) {
			if (_preProcessors[id]) {
				delete(_preProcessors[id]);
				return true;
			} else {
				return false;
			}
		};

		// stores a postprocessor
		// returns a numeric id that can be used to remove this processor
		var addPostprocessor = function (postprocessor) {
			_postCount += 1;
			_postProcessors[_postCount] = postprocessor;
			return _postCount;
		};

		// removes a postprocessor
		// returns true if it exists and has been removed successfully
		// else false
		var removePostprocessor = function (id) {
			if (_postProcessors[id]) {
				delete(_postProcessors[id]);
				return true;
			} else {
				return false;
			}
		};

		// enqueues a request in the queue
		// returns true is succesfully added
		this.enqueueRequest = function (request) {
			_queue.push(request);
		};

		// notifies the queue that there are requests pending
		// this will start firing the requests via the method 
		// passed while initalizing
		this.notify = function () {
			if (_queue.length === 0) return;

			// for convienience, extract the postprocessing object into an array
			var _callbacks = [];
			for (var processor in _postProcessors) {
				if (_postProcessors.hasOwnProperty(processor)) {
					_callbacks.push(_postProcessors[processor]);
				}
			}

			while (_queue.length > 0) {
				var toFire = _queue.shift();

				// execute the preprocessors
				// if they return anything, pass it along
				// to be able to access it in the post processing callbacks
				var _state = [];
				for (var processor in _preProcessors) {
					if (_preProcessors.hasOwnProperty(processor)) {
						_state.push(_preProcessors[processor](toFire));
					}
				}

				// send the requests
				// and the callbacks and the 
				// results returned from the preprocessors
				httpTransport.send(toFire, _callbacks, _state);
			}
		};

		// callback to be invoked when a request has completed
		this.onResponse = function (responseData) {
			console.dir(responseData);
		};

	};


	// base httpTransport class
	/**
	 * @constructor
	 */
	var HttpTransport = function () {
		var _notImplemented = function () {
			throw new Error('Not Implemented Exception');
		}
		var _notProvided = function () {
			throw new Error('Delegate not provided');
		}

		// implements this
		this.send = _notImplemented;
		this.inOnline = _notImplemented;

		// needs these callbacks to be set
		this.onResponse = function (response, request) {
			_notImplemented()
		};
		this.onError = function (request) {
			_notImplemented()
		};
	}

	// jquery based http transport class
	/**
	 * @constructor
	 */
	var JQueryHttpTransport = function () {

		var _super = new HttpTransport();

		_super.type = 'jQuery based http provider';

		_super.send = function (request, callbacks, states) {
			if (typeof request.beforeSend == 'function') {
				request.beforeSend(request);
			}

			switch (request.method.toLowerCase()) {
				case 'get':
					_get(request, callbacks, states);
					break;
				case 'post':
					_post(request, callbacks, states);
					break;
				case 'put':
					_put(request, callbacks, states);
					break;
				case 'delete':
					_delete(request, callbacks, states);
					break;
				default:
					throw new Error('Unrecognized http method: ' + request.method);
			}
		};

		_super.isOnline = function () {
			return window.navigator.onLine || true;
		};

		var _executeCallbacks = function (response, callbacks, states) {
			if (callbacks.length != states.length) {
				throw new Error('Callback length and state length mismatch!');
			}

			for (var x = 0; x < callbacks.length; x += 1) {
				callbacks[x].apply({}, [response, states[x]]);
			}
		};

		var that = _super;

		$ = $ || {};
		$.ajax = $.ajax || {};

		var _get = function (request, callbacks, states) {
			$.ajax({
				url: request.url,
				type: 'GET',
				async: request.async,
				beforeSend: function (xhr) {
					for (var x = 0; x < request.headers.length; x += 1) {
						xhr.setRequestHeader(request.headers[x].key, request.headers[x].value);
					}
				},
				success: function (data) {
					// Hack to make things work in FF
					try {
						data = JSON.parse(data);
					} catch (e) {}

					// execute the callbacks first
					_executeCallbacks(data, callbacks, states);

					that.onResponse(data, request);
				},
				error: function () {
					that.onError(request);
				}
			});
		};

		var _post = function (request, callbacks, states) {
			$.ajax({
				url: request.url,
				type: 'POST',
				async: request.async,
				contentType: "application/json",
				data: JSON.stringify(request.data),
				beforeSend: function (xhr) {
					for (var x = 0; x < request.headers.length; x += 1) {
						xhr.setRequestHeader(request.headers[x].key, request.headers[x].value);
					}
				},
				success: function (data) {
					// Hack to make things work in FF
					try {
						data = JSON.parse(data);
					} catch (e) {}

					// execute the callbacks first
					_executeCallbacks(data, callbacks, states);

					that.onResponse(data, request);
				},
				error: function () {
					that.onError(request);
				}
			});
		};

		var _put = function (request, callbacks, states) {
			$.ajax({
				url: request.url,
				type: 'PUT',
				contentType: "application/json",
				data: JSON.stringify(request.data),
				async: request.async,
				beforeSend: function (xhr) {
					for (var x = 0; x < request.headers.length; x += 1) {
						xhr.setRequestHeader(request.headers[x].key, request.headers[x].value);
					}
				},
				success: function (data) {
					// Hack to make things work in FF
					try {
						data = JSON.parse(data);
					} catch (e) {}

					// execute the callbacks first
					_executeCallbacks(data, callbacks, states);

					that.onResponse(data, request);
				},
				error: function () {
					that.onError(request);
				}
			});
		};

		var _delete = function (request, callbacks, states) {
			$.ajax({
				url: request.url,
				type: 'DELETE',
				async: request.async,
				beforeSend: function (xhr) {
					for (var x = 0; x < request.headers.length; x += 1) {
						xhr.setRequestHeader(request.headers[x].key, request.headers[x].value);
					}
				},
				success: function (data) {
					// Hack to make things work in FF
					try {
						data = JSON.parse(data);
					} catch (e) {}

					// execute the callbacks first
					_executeCallbacks(data, callbacks, states);

					that.onResponse(data, request);
				},
				error: function () {
					that.onError(request);
				}
			});
		};

		return _super;
	};

	var NodeHttpTransport = function () {

		var _super = new HttpTransport();

		_super.type = 'Http provider for nodejs';

		_super.send = function (request, callbacks, states) {

			if (typeof request.beforeSend == 'function') {
				request.beforeSend(request);
			}
            
            sendHttp(request, callbacks, states);
		};

		_super.isOnline = function () {
			return true;
		};

		var _executeCallbacks = function (response, callbacks, states) {
			if (callbacks.length != states.length) {
				throw new Error('Callback length and state length mismatch!');
			}

			for (var x = 0; x < callbacks.length; x += 1) {
				callbacks[x].apply({}, [response, states[x]]);
			}
		};

		var that = _super;

        var o = {
		    host: 'localhost',
		    port: 443,
		    path: '',
		    data: "{}",
		    method: 'GET',
		    headers: {
		        'Content-Type': 'application/json',
		        'accept': 'application/json'
		    }
		};
        
        var http = require('http');

		var sendHttp = function(options, callbacks, states) {
            
            var reqUrl = require('url').parse(options.url);

            options = options || {};
		    for (var key in options) {
		        if (key == 'headers') {
		            for(var i = 0 ; i < options.headers.length; i = i + 1) {
		                o.headers[options.headers[i].key] = options.headers[i].value;
		            }
		        } else {
		            o[key] = options[key];
		        }
		    }
		    o.host = reqUrl.host;
            o.port = reqUrl.port || 80;
            o.path = reqUrl.path;
            o.method = options.method.toUpperCase();
		    
		    if (typeof o.data != 'string') o.data = JSON.stringify(o.data);
		    o.headers['Content-Length'] = o.data.length;
            
		    var x = http.request(o, function (res) {
		        
		        var receivedData = '';

		        res.setEncoding('utf8');

		        res.on('data', function (data) {
                    receivedData += data;
		        });

		        res.on('end', function() {

					if(res.headers["content-type"] == "application/json" && res.statusCode == "200" ){
	            
			            if (receivedData[0] != "{") receivedData = receivedData.substr(1, receivedData.length - 1);
			            res.json = JSON.parse(receivedData);

						// execute the callbacks first
						_executeCallbacks(res.json, callbacks, states);

						that.onResponse(res.json, options);
					} else {
		                res.text = receivedData;
		                that.onError(options,res);
		            };
		        });
		    });

		    x.write(o.data);
		    x.on('error',function(e){
		    	res.text = receivedData;
                that.onError(options,res);
		    });
		    x.end();
		};

		return _super;
	};

	// http functionality provider
	/**
	 * @constructor
	 */
	var HttpProvider = function () {

		// actual http provider
		var _inner = global.Appacitive.runtime.isBrowser ? new JQueryHttpTransport() : new NodeHttpTransport();

		// the http buffer
		var _buffer = new HttpBuffer(_inner);

		// used to pause/unpause the provider
		var _paused = false;

		// allow pausing/unpausing
		this.pause = function () {
			_paused = true;
		}
		this.unpause = function () {
			_paused = false;
		}

		// allow adding processors to the buffer
		this.addProcessor = function (processor) {
			var _processorError = new Error('Must provide a processor object with either a "pre" function or a "post" function.');
			if (!processor) throw _processorError;
			if (!processor.pre && !processor.post) throw _processorError;

			_buffer.addProcessor(processor);
		}

		// the method used to send the requests
		this.send = function (request) {
			_buffer.enqueueRequest(request);

			// notify the queue if the actual transport 
			// is ready to send the requests
			if (_inner.isOnline() && _paused == false) {
				_buffer.notify();
			}
		}

		// method used to clear the queue
		this.flush = function (force) {
			if (!force) {
				if (_inner.isOnline()) {
					_buffer.notify();
				}
			} else {
				_buffer.notify();
			}
		}

		// the error handler
		this.onError = function (request) {
			if (request.onError) {
				if (request.context) {
					request.onError.apply(request.context, []);
				} else {
					request.onError();
				}
			}
		}
		_inner.onError = this.onError;

		// the success handler
		this.onResponse = function (response, request) {
			if (request.onSuccess) {
				if (request.context) {
					request.onSuccess.apply(request.context, [response]);
				} else {
					request.onSuccess(response);
				}
			}
		}
		_inner.onResponse = this.onResponse;
	}

	// create the http provider and the request
	global.Appacitive.http = new HttpProvider();
	global.Appacitive.HttpRequest = HttpRequest;

	/* PLUGIN: Http Utilities */

	// optional plugin
	(function (global) {

		if (!global.Appacitive) return;
		if (!global.Appacitive.http) return;

		global.Appacitive.http.addProcessor({
			pre: function (req) {
				return new Date().getTime()
			},
			post: function (response, state) {
				var timeSpent = new Date().getTime() - state;
				response._timeTakenInMilliseconds = timeSpent;
			}
		});

	})(global);

	// compulsory plugin
	// handles session and shits
	(function (global) {

		if (!global.Appacitive) return;
		if (!global.Appacitive.http) return;

		global.Appacitive.http.addProcessor({
			pre: function (request) {
				return request;
			},
			post: function (response, request) {
				if(false) {
					var _valid = global.Appacitive.session.isSessionValid(response);
					if (!_valid) {
						if (global.Appacitive.session.get() != null) {
							global.Appacitive.session.resetSession();
							global.Appacitive.session.onSessionCreated = function () {
								global.Appacitive.http.unpause();
								global.Appacitive.http.flush();
								global.Appacitive.session.onSessionCreated = function () {};
							}
							global.Appacitive.session.recreate();
							global.Appacitive.http.pause();
						}
						global.Appacitive.http.send(request);
					}
				}
			}
		});

	})(global);

	/* Http Utilities */

})();

////// unit test
var t = 0;
while (t-- > 0) {
	var req1 = new Appacitive.HttpRequest();
	req1.url = 'https://apis.appacitive.com/sessionservice.svc/getGraph?rawData=true&from=-1hours&target=stats.pgossamer.account{0}.application1918338163933441.deployment10938369762787624.success';
	req1.method = 'get';
	req1.headers = [{
		key: 'appacitive-session',
		value: 'BxqkdySwptR0C5iaJfWXd2+6bkWYtEmMYuPC77odDXE='
	}, {
		key: 'appacitive-environment',
		value: 'sandbox'
	}];
	req1.onSuccess = function (response) {
		console.dir(response);
	}
	req1.onError = function () {
		console.log('error occured');
	}
	Appacitive.http.send(req1);
}(function (global) {
    /**
     * @param {...string} var_args
     */
    String.format = function (text, var_args) {
        if (arguments.length <= 1) {
            return text;
        }
        var tokenCount = arguments.length - 2;
        for (var token = 0; token <= tokenCount; token++) {
            //iterate through the tokens and replace their placeholders from the original text in order
            text = text.replace(new RegExp("\\{" + token + "\\}", "gi"),
                                                arguments[token + 1]);
        }
        return text;
    };
    String.prototype.toPascalCase = function () {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };
    String.prototype.trimChar = function (char1) {
        var pattern = new RegExp("^" + char1);
        var returnStr = this;
        if (pattern.test(returnStr)) returnStr = returnStr.slice(1, returnStr.length);
        pattern = new RegExp(char1 + "$");
        if (pattern.test(returnStr)) returnStr = returnStr.slice(0, -1);
        return returnStr;
    };
    String.toSearchString = function (text) {
        if (typeof (text) == 'undefined')
            text = '';

        var result = '';
        for (var x = 0; x < text.length; x = x + 1) {
            if (' .,;#'.indexOf(text[x]) == -1)
                result += text[x];
        }

        result = result.toLowerCase();

        return result;
    }

    String.contains = function (s1, s2) {
        return (s1.indexOf(s2) != -1);
    }

    String.startsWith = function (s1, s2) {
        return (s1.indexOf(s2) == 0);
    }

    global.dateFromWcf = function (input, throwOnInvalidInput) {
        var pattern = /Date\(([^)]+)\)/;
        var results = pattern.exec(input);
        if (results.length != 2) {
            if (!throwOnInvalidInput) {
                return s;
            }
            throw new Error(s + " is not .net json date.");
        }
        return new Date(parseFloat(results[1]));
    }

    /**
     * @constructor
     */
    var UrlFactory = function () {
        global.Appacitive.bag = global.Appacitive.bag || {};
        global.Appacitive.bag.accountName = global.Appacitive.bag.accountName || {};
        global.Appacitive.bag.selectedType = global.Appacitive.bag.selectedType || {};

        global.Appacitive.bag.apps = global.Appacitive.bag.apps || {};
        global.Appacitive.bag.apps.selected = global.Appacitive.bag.apps.selected || {};
        global.Appacitive.bag.apps.selected.name = global.Appacitive.bag.apps.selected.name || {};

        global.Appacitive.bag.selectedCatalog = global.Appacitive.bag.selectedCatalog || {};
        global.Appacitive.bag.selectedCatalog.Id = global.Appacitive.bag.selectedCatalog.Id || 0;
        global.Appacitive.bag.selectedCatalog.blueprintid = global.Appacitive.bag.selectedCatalog.blueprintid || 0;
        global.Appacitive.bag.selectedCatalog.BlueprintId = global.Appacitive.bag.selectedCatalog.BlueprintId || 0;

        global.Appacitive.models = global.Appacitive.models || {};
        global.Appacitive.models.deploymentCollection = global.Appacitive.models.deploymentCollection || {};
        global.Appacitive.models.deploymentCollection.deployments = global.Appacitive.models.deploymentCollection.deployments || {};

        var baseUrl = (global.Appacitive.config||{apiBaseUrl:''}).apiBaseUrl;
        if (baseUrl.lastIndexOf("/") == baseUrl.length - 1)
            baseUrl = baseUrl.substring(0, baseUrl.length - 1);
        
        this.session = {

            sessionServiceUrl: baseUrl + '/sessionservice',

            getCreateSessionUrl: function (deploymentName) {
                return String.format("{0}/create?deploymentName={1}", this.sessionServiceUrl, deploymentName);
            },
            getPingSessionUrl: function () {
                return String.format("{0}/ping", this.sessionServiceUrl);
            },
            getValidateTokenUrl: function (token) {
                return String.format("{0}/validatetoken?token={1}", this.sessionServiceUrl, token);
            },
            getDeleteSessionUrl: function (deploymentName) {
                return String.format("{0}/delete?deploymentName={1}", this.sessionServiceUrl, deploymentName);
            }
        };
        
        this.email = {
            emailServiceUrl: 'email',
            
            getSendEmailUrl: function() {
                return String.format("{0}/send", this.emailServiceUrl)
            }
        };

        this.identity = {

            identityServiceUrl: baseUrl + '/accountservice',
            getUpdateUserUrl: function () {
                return String.format("{0}/updateuser", this.identityServiceUrl);
            },
            getUserUrl: function (userId) {
                return String.format("{0}/user/{1}", this.identityServiceUrl, userId);
            },
            getChangePasswordUrl: function () {
                return String.format("{0}/changepwd", this.identityServiceUrl);
            },
            getUploadUrl: function (accountId) {
                return String.format("{0}/file/{1}", this.identityServiceUrl, accountId);
            }
        };
        this.user = {

            userServiceUrl: baseUrl + '/user',
            getCreateUserUrl: function () {
                return String.format("{0}/create", this.userServiceUrl);
            },
            getAuthenticateUserUrl: function () {
                return String.format("{0}/authenticate", this.userServiceUrl);
            },
            getUpdateUserUrl: function (userId, deploymentId) {
                return String.format("{0}/{1}", this.userServiceUrl, userId);
            },
            getUserUrl: function (userId, deploymentId) {
                return String.format("{0}/{1}", this.userServiceUrl, userId);
            },
            getUserDeleteUrl: function (userId) {
                return String.format("{0}/{1}", this.userServiceUrl, userId);
            },
            getSearchAllUrl: function (deploymentId, queryParams, pageSize) {
                var url = '';

                url = String.format('{0}/search/user/all', new UrlFactory().article.articleServiceUrl);

                if (pageSize)
                    url = url + '?psize=' + pageSize;
                else
                    url = url + '?psize=10';
                if (typeof (queryParams) !== 'undefined' && queryParams.length > 0) {
                    for (var i = 0; i < queryParams.length; i = i + 1) {
                        if (queryParams[i].trim().length == 0) continue;
                        url = url + "&" + queryParams[i];
                    }
                }
                return url;
            },
            getGetAllLinkedAccountsUrl: function(userId) {
                var url = String.format("{0}/{1}/linkedaccounts", this.userServiceUrl, userId);
                return url;
            }
        };
        this.application = {

            applicationServiceUrl: baseUrl + '/applicationservice',

            getSearchAllUrl: function (queryParams) {
                var url = String.format('{0}/find/{1}/all', this.applicationServiceUrl, global.Appacitive.bag.accountName);

                if (typeof (queryParams) !== 'undefined' && queryParams.length > 0) {
                    for (var i = 0; i < queryParams.length; i = i + 1) {
                        if (queryParams[i].trim().length > 0) {
                            url = url + "&" + queryParams[i];
                        }
                    }
                }

                return url;
            },

            getCreateUrl: function () {
                return String.format('{0}/create', this.applicationServiceUrl);
            },
            getCreateSessionUrl: function (appName) {
                return String.format('{0}/session?appName={1}', this.applicationServiceUrl, appName);
            },
            getDeleteUrl: function (applicationId) {
                return String.format('{0}/{1}', this.applicationServiceUrl, applicationId);
            },
            getCheckNameUrl: function (name) {
                return String.format('{0}/doesNameExist/{1}/{2}', this.applicationServiceUrl, global.Appacitive.bag.accountName, name);
            },
            getHasAppUrl: function () {
                return String.format('{0}/hasApp', this.applicationServiceUrl);
            },
            getGetPublishStatusUrl: function (refId) {
                return String.format('{0}/status/{1}', this.applicationServiceUrl, refId);
            },
            getGetUrl: function (name) {
                return String.format('{0}/{1}', this.applicationServiceUrl, name);
            },
            getGenerateKeyUrl: function (name) {
                return String.format('{0}/generatekey/{1}', this.applicationServiceUrl, name);
            },
            getUpdateKeyStatusUrl: function (name) {
                return String.format('{0}/updatekey/{1}', this.applicationServiceUrl, name);
            },
            getUpdateApplicationUrl: function (applicationId) {
                return String.format('{0}/{1}', this.applicationServiceUrl, applicationId);
            },
            getDeleteApiKey: function (applicationId) {
                return String.format('{0}/deletekey/{1}', this.applicationServiceUrl, applicationId);
            },
            getUploadUrl: function () {
                return String.format("{0}/file/", this.applicationServiceUrl);
            }
        };
        this.article = {
            articleServiceUrl: baseUrl + 'article',

            getExportUrl: function (id, type) {
                return 'Articles.exp?ctype=Article&blueprintid=' + id + '&type=' + type;
            },

            getEntityId: function () {
                return global.Appacitive.bag.selectedCatalog.id;
            },
            getGetUrl: function (schemaId, articleId) {
                return String.format('{0}/{1}/{2}', this.articleServiceUrl, schemaId, articleId);
            },
            getMultiGetUrl: function (deploymentId, schemaId, articleIds) {
                return String.format('{0}/multiGet/{1}/{2}', this.articleServiceUrl, schemaId, articleIds);
            },
            getMultiDeleteUrl: function (deploymentId, schemaId) {
                return String.format('{0}/multidelete/{1}', this.articleServiceUrl, schemaId);
            },
            getBlobUploadUrl: function () {
                return String.format('{0}/blob/upload', this.articleServiceUrl);
            },
            getBlobUpdateUrl: function (articledId) {
                return String.format('{0}/blob/update?&articleid={1}', this.articleServiceUrl, articledId);
            },

            getSearchAllUrl: function (deploymentId, schemaId, queryParams, pageSize) {
                var url = '';

                url = String.format('{0}/search/{1}/all', this.articleServiceUrl, schemaId);

                if (pageSize)
                    url = url + '?psize=' + pageSize;
                else
                    url = url + '?psize=10';
                if (typeof (queryParams) !== 'undefined' && queryParams.length > 0) {
                    for (var i = 0; i < queryParams.length; i = i + 1) {
                        if (queryParams[i].trim().length == 0) continue;
                        url = url + "&" + queryParams[i];
                    }
                }
                return url;
            },

            getProjectionQueryUrl: function() {
                return String.format('{0}/search/project', this.articleServiceUrl);
            },

            getPropertiesSearchUrl: function (deploymentId, schemaName, query) {
                var url = String.format('{0}/search/{1}/all', this.articleServiceUrl, schemaName);
                url += '?properties=' + query;

                return url;
            },
            getDeleteUrl: function (schemaName, articleId) {
                return String.format('{0}/{1}/{2}?verbose=true&debug=true', this.articleServiceUrl, schemaName, articleId);
            },
            getCreateUrl: function (schemaName) {
                return String.format('{0}/{1}', this.articleServiceUrl, schemaName);
            },
            getUpdateUrl: function (schemaType, articleId) {
                return String.format('{0}/{1}/{2}', this.articleServiceUrl, schemaType, articleId);
            },
            getDownloadUrl: function (url) {
                return String.format('article.file?fileurl=' + escape(url));
            }
        };
        
        this.catalog = {

            catalogServiceUrl: baseUrl + '/blueprintservice',

            getSearchAllUrl: function (queryParams) {
                var url = String.format('{0}/find/all?', this.catalogServiceUrl);
                url = url + '?psize=1000';
                if (typeof (queryParams) !== 'undefined' && queryParams.length > 0) {
                    for (var i = 0; i < queryParams.length; i = i + 1) {
                        if (queryParams[i].trim().length == 0) continue;
                        url = url + "&" + queryParams[i];
                    }
                }
                return url;
            },
            getPropertiesSearchUrl: function (deploymentId, schemaName, query) {
                var url = String.format('{0}/search/{1}/{2}/all', this.articleServiceUrl, deploymentId, schemaName);
                url += '?properties=' + query;

                return url;
            },
            getDeleteUrl: function (deploymentId, articleId, schemaName) {
                return String.format('{0}/delete/{1}/{2}/{3}', this.articleServiceUrl, deploymentId, articleId, schemaName);
            },
            getCreateUrl: function (deploymentId) {
                return String.format('{0}/create/{1}', this.articleServiceUrl, deploymentId);
            },
            getUpdateUrl: function (deploymentId, articleId) {
                return String.format('{0}/update/{1}/{2}', this.articleServiceUrl, deploymentId, articleId);
            }
        };
        this.connection = {
            connectionServiceUrl: baseUrl + 'connection',

            getEntityId: function () {
                return global.Appacitive.bag.selectedCatalog.id;
            },
            getGetUrl: function (relationId, connectionId) {
                return String.format('{0}/{1}/{2}', this.connectionServiceUrl, relationId, connectionId);
            },
            getCreateUrl: function (relationId) {
                return String.format('{0}/{1}', this.connectionServiceUrl, relationId);
            },
            getUpdateUrl: function (deploymentId, relationType, relationId) {
                return String.format('{0}/update/{1}/{2}', this.connectionServiceUrl, relationType, relationId);
            },
            getDeleteUrl: function (relationId, connectionId) {
                return String.format('{0}/{1}/{2}', this.connectionServiceUrl, relationId, connectionId);
            },
            getMultiDeleteUrl: function (deploymentId, relationId) {
                return String.format('{0}/multidelete/{1}', this.connectionServiceUrl, relationId);
            },
            getSearchByArticleUrl: function (deploymentId, relationId, articleId, label, queryParams) {
                var url = '';

                url = String.format('{0}/{1}/find/all?label={2}&articleid={3}', this.connectionServiceUrl, relationId, label, articleId);
                // url = url + '?psize=1000';
                if (typeof (queryParams) !== 'undefined' && queryParams.length > 0) {
                    for (var i = 0; i < queryParams.length; i = i + 1) {
                        url = url + "&" + queryParams[i];
                    }
                }
                return url;
            },
            getConnectedArticles: function (deploymentId, relationId, articleId, queryParams) {
                var url = '';
                url = String.format('{0}/{1}/{2}/find', this.connectionServiceUrl, relationId, articleId);
                if (queryParams && queryParams.length && queryParams.length > 0) {
                    for (var x = 0; x < queryParams.length; x += 1) {
                        if (x == 0) {
                            url += '?' + queryParams[x];
                        } else {
                            url += '&' + queryParams[x];
                        }
                    }
                }
                return url;
            },
            getInterconnectsUrl: function (deploymentId) {
                var url = '';
                url = String.format('{0}/connectedarticles', this.connectionServiceUrl);
                return url;
            },
            getPropertiesSearchUrl: function (deploymentId, relationName, query) {
                var url = String.format('{0}/{1}/find/all', this.connectionServiceUrl, relationName);
                url += '?properties=' + query;

                return url;
            }
        };
        this.schema = {

            schemaServiceUrl: baseUrl + '/schemaservice',

            //Return  blueprint Id or deployments blueprint Id
            getEntityId: function () {
                if (global.Appacitive.bag.selectedType == 'deployment') {
                    return global.Appacitive.bag.selectedCatalog.blueprintid;
                }
                return global.Appacitive.bag.selectedCatalog.id;
            },

            getExportUrl: function (id) {
                return 'Schemas.exp?ctype=Schema&blueprintid=' + id;
            },



            getSearchAllUrl: function (catalogName, queryParams) {
                var url = '';
                if (catalogName) {
                    url = String.format('{0}/find/all/{1}', this.schemaServiceUrl, catalogName);
                }
                url = url + '?psize=200';
                if (typeof (queryParams) !== 'undefined' && queryParams.length > 0) {
                    for (var i = 0; i < queryParams.length; i = i + 1) {
                        url = url + "&" + queryParams[i];
                    }
                }
                return url;
            },

            getGetPropertiesUrl: function (schemaId) {
                return String.format('{0}/get/{1}/{2}/true', this.schemaServiceUrl, this.getEntityId(), schemaId);
            },

            getCreateUrl: function () {
                return String.format('{0}/create/{1}', this.schemaServiceUrl, this.getEntityId());
            },

            getDeleteUrl: function (schemaId) {
                return String.format('{0}/delete/{1}/{2}', this.schemaServiceUrl, this.getEntityId(), schemaId);
            },

            getUpdateUrl: function (schemaId) {
                return String.format('{0}/update/{1}/{2}', this.schemaServiceUrl, this.getEntityId(), schemaId);
            },

            getUpdateAttributesUrl: function (schemaId) {
                return String.format('{0}/updateAttributes/{1}/{2}', this.schemaServiceUrl, this.getEntityId(), schemaId);
            },

            getAddPropertyUrl: function (schemaId) {
                return String.format('{0}/addProperty/{1}/{2}', this.schemaServiceUrl, this.getEntityId(), schemaId);
            },

            getDeletePropertyUrl: function (schemaId, propertyId) {
                return String.format('{0}/deleteProperty/{1}/{2}/{3}', this.schemaServiceUrl, this.getEntityId(), schemaId, propertyId);
            },

            getUpdatePropertyUrl: function (schemaId) {
                return String.format('{0}/updateProperty/{1}/{2}', this.schemaServiceUrl, this.getEntityId(), schemaId);
            },

            getGetUrl: function (schemaId) {
                var eId = global.Appacitive.bag.selectedType == 'blueprint' ? global.Appacitive.bag.selectedCatalog.Id : global.Appacitive.bag.selectedCatalog.BlueprintId;
                return String.format('{0}/get/{1}/{2}', this.schemaServiceUrl, eId, schemaId);
            }
        };
        this.relation = {

            relationServiceUrl: baseUrl + '/relationservice',

            //Return  blueprint Id or deployments blueprint Id
            getEntityId: function () {
                if (global.Appacitive.bag.selectedType == 'deployment') {
                    return global.Appacitive.bag.selectedCatalog.blueprintid;
                }
                return global.Appacitive.bag.selectedCatalog.id;
            },

            getExportUrl: function (id) {
                return 'Relations.exp?ctype=Relation&blueprintid=' + id;
            },

            getSearchBySchemaUrl: function (blueprintName, schemaName, queryParams) {
                var url = '';
                url = String.format('{0}/{1}/find/{2}', this.relationServiceUrl, blueprintName, schemaName);
                url = url + '?psize=200';
                if (typeof (queryParams) !== 'undefined' && queryParams.length > 0) {
                    for (var i = 0; i < queryParams.length; i = i + 1) {
                        url = url + "&" + queryParams[i];
                    }
                }
                return url;
            },

            getSearchAllUrl: function (catalogName, queryParams) {
                var url = '';
                if (catalogName) {
                    url = String.format('{0}/find/all/{1}', this.relationServiceUrl, catalogName);
                }
                url = url + '?psize=200';
                if (typeof (queryParams) !== 'undefined' && queryParams.length > 0) {
                    for (var i = 0; i < queryParams.length; i = i + 1) {
                        url = url + "&" + queryParams[i];
                    }
                }
                return url;
            },

            getGetPropertiesUrl: function (relationId) {
                return String.format('{0}/get/{1}/{2}/true', this.relationServiceUrl, this.getEntityId(), relationId);
            },

            getCreateUrl: function () {
                return String.format('{0}/create/{1}', this.relationServiceUrl, this.getEntityId());
            },

            getDeleteUrl: function (relationId) {
                return String.format('{0}/delete/{1}/{2}', this.relationServiceUrl, this.getEntityId(), relationId);
            },

            getUpdateUrl: function (relationId) {
                return String.format('{0}/update/{1}/{2}', this.relationServiceUrl, this.getEntityId(), relationId);
            },

            getUpdateAttributesUrl: function (relationId) {
                return String.format('{0}/updateAttributes/{1}/{2}', this.relationServiceUrl, this.getEntityId(), relationId);
            },

            getAddPropertyUrl: function (relationId) {
                return String.format('{0}/addProperty/{1}/{2}', this.relationServiceUrl, this.getEntityId(), relationId);
            },

            getDeletePropertyUrl: function (relationId, propertyId) {
                return String.format('{0}/deleteProperty/{1}/{2}/{3}', this.relationServiceUrl, this.getEntityId(), relationId, propertyId);
            },

            getUpdatePropertyUrl: function (relationId) {
                return String.format('{0}/updateProperty/{1}/{2}', this.relationServiceUrl, this.getEntityId(), relationId);
            },

            getUpdateEndPointUrl: function (relationId, type) {
                return String.format('{0}/updateEndpoint/{1}/{2}/{3}', this.relationServiceUrl, this.getEntityId(), relationId, type);
            },

            getGetUrl: function (relationId) {
                var eId = global.Appacitive.bag.selectedType == 'blueprint' ? global.Appacitive.bag.selectedCatalog.Id : global.Appacitive.bag.selectedCatalog.BlueprintId;
                return String.format('{0}/get/{1}/{2}', this.relationServiceUrl, eId, relationId);
            }
        };
        this.cannedList = {

            cannedListServiceUrl: baseUrl + '/listservice',

            //Return  blueprint Id or deployments blueprint Id
            getEntityId: function () {
                if (global.Appacitive.bag.selectedType == 'deployment') {
                    return global.Appacitive.bag.selectedCatalog.blueprintid;
                }
                return global.Appacitive.bag.selectedCatalog.id;
            },

            getExportUrl: function (id) {
                return 'CannedLists.exp?ctype=List&blueprintid=' + id;
            },

            getListItemExportUrl: function (id, cannedListId) {
                return 'CannedLists.exp?ctype=ListItems&blueprintid=' + id + '&type=' + cannedListId;
            },

            getSearchAllUrl: function (catalogName, queryParams) {
                var url = '';
                if (catalogName) {
                    url = String.format('{0}/find/all/{1}', this.cannedListServiceUrl, catalogName);
                }
                url = url + '?psize=200';
                if (typeof (queryParams) !== 'undefined' && queryParams.length > 0) {
                    for (var i = 0; i < queryParams.length; i = i + 1) {
                        url = url + "&" + queryParams[i];
                    }
                }
                return url;
            },

            getGetItemsUrl: function (cannedListId) {
                return String.format('{0}/get/{1}/{2}', this.cannedListServiceUrl, this.getEntityId(), cannedListId);
            },

            getCreateUrl: function () {
                return String.format('{0}/create/{1}', this.cannedListServiceUrl, this.getEntityId());
            },

            getDeleteUrl: function (cannedListId) {
                return String.format('{0}/delete/{1}/{2}', this.cannedListServiceUrl, this.getEntityId(), cannedListId);
            },

            getSearchListItemsUrl: function (cannedListId, queryParams) {
                var url = String.format('{0}/searchListItems/{1}/{2}', this.cannedListServiceUrl, this.getEntityId(), cannedListId);
                if (typeof (queryParams) !== 'undefined' && queryParams.length > 0) {
                    url = url + '?';
                    for (var i = 0; i < queryParams.length; i = i + 1) {
                        url = url + queryParams[i] + "&";
                    }
                    url = url.substring(0, url.length - 1);
                }
                return url;
            },

            getUpdateListItemPositionUrl: function (cannedListId, currentPosition, newPosition) {
                return String.format('{0}/updateListItemPosition/{1}/{2}/{3}/{4}', this.cannedListServiceUrl, this.getEntityId(), cannedListId, currentPosition, newPosition);
            },

            getDeleteListItemUrl: function (cannedListId, listItemName) {
                return String.format('{0}/removeListItem/{1}/{2}/{3}', this.cannedListServiceUrl, this.getEntityId(), cannedListId, listItemName);
            },

            getAddListItemsUrl: function (cannedListId) {
                return String.format('{0}/addListItems/{1}/{2}', this.cannedListServiceUrl, this.getEntityId(), cannedListId);
            },

            getUpdateListItemUrl: function (cannedListId, oldName) {
                return String.format('{0}/updateListItem/{1}/{2}/{3}', this.cannedListServiceUrl, this.getEntityId(), cannedListId, oldName);
            },

            getUpdateUrl: function (listId) {
                return String.format('{0}/update/{1}/{2}', this.cannedListServiceUrl, this.getEntityId(), listId);
            },

            getGetUrl: function (relationId) {
                var eId = global.Appacitive.bag.selectedType == 'blueprint' ? global.Appacitive.bag.selectedCatalog.Id : global.Appacitive.bag.selectedCatalog.BlueprintId;
                return String.format('{0}/get/{1}/{2}', this.cannedListServiceUrl, eId, relationId);
            }

        };
        this.catalog = {

            catalogServiceUrl: baseUrl + '/blueprintservice',

            getSearchAllUrl: function (queryParams) {
                var url = String.format('{0}/find/all?', this.catalogServiceUrl);
                url = url + '?psize=1000';
                if (typeof (queryParams) !== 'undefined' && queryParams.length > 0) {
                    for (var i = 0; i < queryParams.length; i = i + 1) {
                        url = url + "&" + queryParams[i];
                    }
                }
                return url;
            }
        };
        this.blueprint = {

            blueprintServiceUrl: baseUrl + '/blueprintservice',

            getGetUrl: function (id) {
                return String.format('{0}/get/{1}', this.blueprintServiceUrl, id);
            },

            getDeleteUrl: function (id) {
                return String.format('{0}/delete/{1}', this.blueprintServiceUrl, id);
            },

            getCreateUrl: function () {
                return String.format('{0}/create', this.blueprintServiceUrl);
            },

            getSchemasUrl: function (bId) {
                var url = String.format('{0}/getSchemas/{1}?', this.blueprintServiceUrl, bId);
                url = url + '?psize=1000';
                return url
            },

            getRelationsUrl: function (bId) {
                var url = String.format('{0}/{1}/contents/relations?', this.blueprintServiceUrl, bId);
                url = url + '?psize=1000';
                return url;
            },

            getCannedListsUrl: function (bId) {
                var url = String.format('{0}/{1}/contents/lists?', this.blueprintServiceUrl, bId);
                url = url + '?psize=1000';
                return url;
            }
        };
        this.deployment = {

            deploymentServiceUrl: baseUrl + '/deploymentservice',

            getGetUrl: function (id) {
                return String.format('{0}/get/{1}', this.deploymentServiceUrl, id);
            },

            getGetPublishStatusUrl: function (refId, onSuccess, onError) {
                return String.format('{0}/status/{1}', this.deploymentServiceUrl, refId);
            },

            getCreateUrl: function () {
                return String.format('{0}/create', this.deploymentServiceUrl);
            },

            getFetchAllDeploymentsUrl: function () {
                var url = String.format('{0}/fetchAll', this.deploymentServiceUrl);
                return url;
            },

            getSearchAllSchemaUrl: function (dId) {
                var url = String.format('{0}/getSchemas/{1}', this.deploymentServiceUrl, dId);
                url = url + '?psize=1000';
                return url;
            },

            getSearchAllRelationsUrl: function (dId) {
                var url = String.format('{0}/getRelations/{1}', this.deploymentServiceUrl, dId);
                url = url + '?psize=1000';
                return url;
            },

            getSearchAllListsUrl: function (dId) {
                var url = String.format('{0}/getLists/{1}', this.deploymentServiceUrl, dId);
                url = url + '?psize=1000';
                return url;
            },

            getExportUrl: function (dId, bName) {
                var url = String.format('{0}/{1}/{2}', this.deploymentServiceUrl, dId, bName);
                return url;
            },

            getMergeUrl: function (dId, bName) {
                var url = String.format('{0}/{1}/{2}', this.deploymentServiceUrl, dId, bName);
                return url;
            },

            getUpdateDeployemntUrl: function (deploymentId) {
                return String.format('{0}/{1}', this.deploymentServiceUrl, deploymentId);
            },

            getProfilerUrl: function (referenceId) {
                return String.format('{0}/profile/{1}?deploymentid={2}', this.deploymentServiceUrl, referenceId, global.Appacitive.bag.selectedCatalog.id);
            },

            getLiveToStageUrl: function () {
                var liveId = global.Appacitive.models.deploymentCollection.deployments.filter(function (d) {
                    return d.name.toLowerCase() == global.Appacitive.bag.apps.selected.name.toLowerCase();
                })[0].id;
                var sandboxName = '__Sandbox_' + global.Appacitive.bag.apps.selected.name;
                var url = '{0}/Execute/{1}/mergelivetosandbox?livedeploymentid={2}';
                url = String.format(url, this.deploymentServiceUrl, sandboxName , liveId);
                return url;
            }
        };
        this.tag = {

            tagServiceUrl: baseUrl + '/tagsservice',

            //Return  blueprint Id or deployments blueprint Id
            getEntityId: function () {
                if (global.Appacitive.selectedType == 'deployment') {
                    return global.Appacitive.bag.selectedCatalog.blueprintid;
                }
                return global.Appacitive.bag.selectedCatalog.id;
            },

            getAddTagUrl: function (type, entityId, parentEntityId, tagValue) {
                return String.format("{0}/addTag/{1}/{2}/{3}/{4}?tag={5}", this.tagServiceUrl, this.getEntityId(), type, entityId, parentEntityId, tagValue);
            },

            getRemoveTagUrl: function (type, entityId, parentEntityId, tagValue) {
                return String.format("{0}/removeTag/{1}/{2}/{3}/{4}?tag={5}", this.tagServiceUrl, this.getEntityId(), type, entityId, parentEntityId, tagValue);
            }
        };
        this.invoice = {
            invoiceServiceUrl: baseUrl + '/invoiceservice',

            getUsageStatsUrl: function () {
                //
                return this.invoiceServiceUrl + '/usage/' + global.Appacitive.bag.accountName;
            }
        };
        this.account = {
            accountServiceUrl: baseUrl + '/accountservice',

            getCreateNewAccountUrl: function (queryParam) {
                return String.format("{0}/createaccount?skipValid={1}", this.accountServiceUrl, queryParam);
            },

            getAccountIdUrl: function (accName) {
                return this.accountServiceUrl + '/accountId/' + accName;
            },
            checkAccountNameUrl: function (accName) {
                return this.accountServiceUrl + '/exists/' + accName;
            },
            createInvite: function (token) {
                return String.format("{0}/createInvite?args={1}", this.accountServiceUrl, token);
            },
            requestInvite: function () {
                return this.accountServiceUrl + '/createtoken';
            },
            checkToken: function (token, queryParam) {
                return String.format("{0}/searchToken/{1}?skipValid={2}", this.accountServiceUrl, token, queryParam);
            },
            isHuman: function (challenge, userResponse) {
                return this.accountServiceUrl + '/captcha/' + challenge + '/' + userResponse;
            }
        };
        this.query = {
            params: function (key) {
                var match = [];
                if (location.search == "" || location.search.indexOf("?") == -1) return match;
                if (!key) return location.search.split("?")[1].split("=");
                else {
                    key = key.toLowerCase();
                    var splitQuery = location.search.split("?")[1].split("&");
                    splitQuery.forEach(function (i, k) {
                        var splitKey = k.split("=");
                        var value = splitKey[1];
                        if (splitKey.length > 2) {
                            splitKey.forEach(function (ii, kk) {
                                if (ii == 0 || ii == 1) return;
                                value = value + "=" + splitKey[ii];
                            });
                        }
                        if (splitKey[0].toLowerCase() == key) match = [splitKey[0], value];
                    });
                    return match;
                }
            }
        };
        this.announcement = {
            announcementServiceUrl: baseUrl + "/announcementservice",
            getSummaryUrl: function () {
                return this.announcementServiceUrl + "/summary";
            }
        };
        this.graphite = {
            graphiteBaseUrl: baseUrl + '/sessionservice/getGraph',

            getBaseUrl: function () {
                return this.graphiteBaseUrl;
            }
        };
        this.emailtemplate = {
            emailTemplateServiceUrl: baseUrl + "/emailservice",
            getCreateUrl: function () {
                return this.emailTemplateServiceUrl + "/create";
            },
            getUpdateUrl: function (id) {
                return this.emailTemplateServiceUrl + "/" + id;
            },
            getAllNames: function () {
                return this.emailTemplateServiceUrl + "/find/all";
            },
            getSearchByNameUrl: function (id) {
                return this.emailTemplateServiceUrl + "/" + id;
            },
            getDeleteUrl: function (name) {
                return this.emailTemplateServiceUrl + "/" + name;
            }
        };
    }

    global.Appacitive.storage = global.Appacitive.storage || {};
    global.Appacitive.storage.urlFactory = new UrlFactory();

})(global);/**
Depends on  NOTHING
**/

(function(global) {

    "use strict";

    /**
     * @constructor
    */

    var EventManager = function () {

        function GUID() {
            var S4 = function () {
                return Math.floor(
                    Math.random() * 0x10000 /* 65536 */
                ).toString(16);
            };

            return (
                S4() + S4() + "-" +
                S4() + "-" +
                S4() + "-" +
                S4() + "-" +
                S4() + S4() + S4()
            );
        }

        var _subscriptions = {};

        this.subscribe = function (eventName, callback) {
            if (typeof (eventName) != "string" || typeof (callback) != "function")
                throw new Error("Incorrect subscription call");

            if (typeof (_subscriptions[eventName]) == "undefined")
                _subscriptions[eventName] = [];

            var _id = GUID();
            _subscriptions[eventName].push({
                callback: callback,
                id: _id
            });

            return _id;
        };

        this.unsubscribe = function (id) {
            if (!id) return false;
            var index = -1, eN = null;
            for (var eventName in _subscriptions) {
                for (var y = 0; y < _subscriptions[eventName].length; y = y + 1) {
                    if (_subscriptions[eventName][y].id == id) {
                        index = y;
                        eN = eventName;
                        break;
                    }
                }
            }
            if (index != -1) {
                _subscriptions[eN].splice(index, 1);
                return true;
            }
            return false;
        };

        this.fire = function (eventName, sender, args) {
            if (typeof (eventName) != "string") throw new Error("Incorrect fire call");

            if (typeof (args) == "undefined" || args === null)
                args = {};
            args.eventName = eventName;

            // shifted logging here
            // for better debugging
            if (console && console.log && typeof console.log == 'function')
                console.log(eventName + ' fired');

            if (typeof (_subscriptions["all"]) != "undefined") {
                for (var x = 0; x < _subscriptions["all"].length; x = x + 1) {
                    //try {
                    _subscriptions["all"][x].callback(sender, args);
                    //} catch (e) { }
                }
            }

            var _callback = function (f, s, a) {
                setTimeout(function () {
                    f(s, a);
                }, 0);
            };

            if (typeof (_subscriptions[eventName]) != "undefined") {
                for (var y= 0; y < _subscriptions[eventName].length; y = y + 1) {
                    _callback(_subscriptions[eventName][y].callback, sender, args);
                }
            }
        };

        this.clearSubscriptions = function (eventName) {
            if (typeof (eventName) != 'string')
                throw new Error('Event Name must be string in EventManager.clearSubscriptions');

            if (_subscriptions[eventName]) _subscriptions[eventName].length = 0;

            return this;
        };

        this.clearAndSubscribe = function (eventName, callback) {
            this.clearSubscriptions(eventName);
            this.subscribe(eventName, callback);
        };

        this.dump = function () {
            console.dir(_subscriptions);
        };

    };

    global.Appacitive.eventManager = new EventManager();

})(global);(function(global) {

	"use strict";

	global.Appacitive.config = {
		apiBaseUrl: 'https://apis.appacitive.com/'
	};

}(global));(function(global) {

	"use strict";

	/**
	 * @constructor
	 */
	var SessionManager = function() {

		/**
		 * @constructor
		 */
		var _sessionRequest = function() {
			this.apikey = '';
			this.isnonsliding = false;
			this.usagecount = -1;
			this.windowtime = 240;
		};

		var _sessionKey = null;
		var _appName = null;
		var _options = null;

		this.onSessionCreated = function() {};

		this.recreate = function() {
			global.Appacitive.session.create(_options);
		};

		this.create = function(options) {
			//if (_sessionKey !== null) return;

			options = options || {};
			_options = options;

			// track the application 
			_appName = options.app || '';

			// create the session
			var _sRequest = new _sessionRequest();
			_sRequest.apikey = options.apikey || '';
			_sRequest.isnonsliding = options.isnonsliding || _sRequest.isnonsliding;
			_sRequest.usagecount = options.usagecount || _sRequest.usagecount;
			_sRequest.windowtime = options.windowtime || _sRequest.windowtime;

			var _request = new global.Appacitive.HttpRequest();
			_request.url = global.Appacitive.config.apiBaseUrl + 'application.svc/session';
			_request.method = 'put';
			_request.data = _sRequest;
			_request.onSuccess = function(data) {
				if (data && data.status && data.status.code == '200') {
					_sessionKey = data.session.sessionkey;
					global.Appacitive.eventManager.fire('session.success', {}, data);
					global.Appacitive.http.addProcessor({
						pre: function(req) {
							req.headers.push({ key: 'appacitive-session', value: _sessionKey });
						}
					});
					global.Appacitive.session.onSessionCreated();
				}
				else {
					global.Appacitive.eventManager.fire('session.error', {}, data);
				}
			};
			global.Appacitive.http.send(_request);
		};

		var _authToken = null, authEnabled = false;
		global.Appacitive.http.addProcessor({
			pre: function(request) {
				if (authEnabled === true) {
					var userAuthHeader = request.headers.filter(function (uah) {
						return uah.key == 'appacitive-user-auth';
					});
					if (userAuthHeader.length == 1) {
						request.headers.forEach(function (uah) {
							if (uah.key == 'appacitive-user-auth') {
								uah.value = _authToken;
							}
						});
					} else {
						request.headers.push({ key: 'appacitive-user-auth', value: _authToken });
					}
				}
			}
		});

		this.setUserAuthHeader = function(authToken) {
			authEnabled = true;
			_authToken = authToken;
		};

		this.removeUserAuthHeader = function() {
			authEnabled = false;
		};

		this.isSessionValid = function(response) {
			if (!response) return true;
			if (response.status) {
				if (response.status.code) {
					if (response.status.code == '8027' || response.status.code == '8002') {
						return false;
					}
				}
			} else if (response.code) {
				if (response.code == '8027' || response.code == '8002') {
					return false;
				}
			}
			return true;
		};

		this.resetSession = function() {
			_sessionKey = null;
		};

		this.get = function() {
			return _sessionKey;
		};

		// the name of the environment, simple public property
		var _env = 'sandbox';
		this.__defineGetter__('environment', function() {
			return _env;
		});
		this.__defineSetter__('environment', function(value) {
			if (value != 'sandbox' && value != 'live')
				value = 'sandbox';
			_env = value;
		});
	};

	global.Appacitive.session = new SessionManager();

} (global));


// compulsory http plugin
// attaches the appacitive environment headers
(function (global){

	if (!global.Appacitive) return;
	if (!global.Appacitive.http) return;

	global.Appacitive.http.addProcessor({
		pre: function(req) {
			req.headers.push({ key: 'appacitive-environment', value: global.Appacitive.session.environment });
		}
	});

})(global);(function(global) {

	"use strict";

	global.Appacitive.queries = {};

	// basic query for contains pagination
	/** 
	* @constructor
	**/
	var PageQuery = function(o) {
		var options = o || {};
		this.pageNumber = options.pageNumber || 1;
		this.pageSize = options.pageSize || 200;
	};
	PageQuery.prototype.toString = function() {
		return 'psize=' + this.pageSize + '&pnum=' + this.pageNumber;
	};

	// sort query
	/** 
	* @constructor
	**/
	var SortQuery = function(o) {
		o = o || {};
		this.orderBy = o.orderBy || '__UtcLastUpdatedDate';
		this.isAscending = typeof o.isAscending == 'undefined' ? false : o.isAscending;
	};
	SortQuery.prototype.toString = function() {
		return 'orderBy=' + this.orderBy + '&isAsc=' + this.isAscending;
	};

	// base query
	/** 
	* @constructor
	**/
	var BaseQuery = function(o) {
		var options = o || {};

		this.pageQuery = new PageQuery(o);
		this.sortQuery = new SortQuery(o);
		this.type = o.type || 'article';
		this.baseType = o.schema || o.relation;
		this.filter = '';
		this.freeText = '';

		this.extendOptions = function(changes) {
			for (var key in changes) {
				options[key] = changes[key];
			}
			this.pageQuery = new PageQuery(options);
			this.sortQuery = new SortQuery(options);
		};

		this.setFilter = function(filter) {
			this.filter = filter;
		};

		this.setFreeText = function(tokens) {
            this.freeText = tokens;
        };

        this.toUrl = function() {
			var finalUrl = global.Appacitive.config.apiBaseUrl +
				this.type + '.svc/' +
				this.baseType + '/find/all?' + this.pageQuery.toString() + '&' + this.sortQuery.toString();

			if (this.filter.trim().length > 0) {
				finalUrl += '&query=' + this.filter;
			}

			if (this.freeText.trim().length > 0) {
                finalUrl += "&freetext=" + this.freeText + "&language=en";
            }

			return finalUrl;
		};
	};

	// search all type query
	/** 
	* @constructor
	**/
	global.Appacitive.queries.SearchAllQuery = function(options) {

		options = options || {};
		var inner = new BaseQuery(options);

		// simple query
		this.toRequest = function() {
			var r = new global.Appacitive.HttpRequest();
			r.url = inner.toUrl();
			r.method = 'get';
			return r;
		};

		this.extendOptions = function() {
			inner.extendOptions.apply(inner, arguments);
		};

		this.getOptions = function() {
			var o = {};
			for (var key in inner) {
				if (inner.hasOwnProperty(key) && typeof inner[key] != 'function') {
					o[key] = inner[key];
				}
			}
			return o;
		};
	};

	/** 
	* @constructor
	**/
	global.Appacitive.queries.BasicFilterQuery = function(options) {

		options = options || {};
		var inner = new BaseQuery(options);

		// just append the filters/properties parameter to the query string
		this.toRequest = function() {
			var r = new global.Appacitive.HttpRequest();
			r.url = inner.toUrl();
            
            if (options.filter && options.filter.trim().length > 0)
                r.url += '&query=' + options.filter;

            if (options.freeText && options.freeText.trim().length > 0)
                r.url += "&freetext=" + options.freeText + "&language=en";
           
			r.method = 'get';
			return r;
		};

		this.extendOptions = function() {
			inner.extendOptions.apply(inner, arguments);
		};

		this.getOptions = function() {
			var o = {};
			for (var key in inner) {
				if (inner.hasOwnProperty(key) && typeof inner[key] != 'function') {
					o[key] = inner[key];
				}
			}
			return o;
		};
	};

	/** 
	* @constructor
	**/
	global.Appacitive.queries.GraphQuery = function(options) {

		options = options || {};
		var inner = new BaseQuery(options);

		// just append the filters/properties parameter to the query string
		this.toRequest = function() {
			var r = new global.Appacitive.HttpRequest();
			r.url = global.Appacitive.config.apiBaseUrl;
			r.url += global.Appacitive.storage.urlFactory.article.getProjectionQueryUrl();
			r.method = 'post';
			r.data = options.graphQuery;
			return r;
		};

		this.extendOptions = function() {
			inner.extendOptions.apply(inner, arguments);
		};

		this.getOptions = function() {
			var o = {};
			for (var key in inner) {
				if (inner.hasOwnProperty(key) && typeof inner[key] != 'function') {
					o[key] = inner[key];
				}
			}
			return o;
		};
	};

	/** 
	* @constructor
	**/
	global.Appacitive.queries.ConnectedArticlesQuery = function(options) {

		options = options || {};
		var inner = new BaseQuery(options);

		this.toRequest = function() {
			var r = new global.Appacitive.HttpRequest();
			r.url = global.Appacitive.config.apiBaseUrl + 'connection/' + options.relation + '/' + options.articleId + '/find?' +
				inner.pageQuery.toString() +
				'&' + inner.sortQuery.toString();
			return r;
		};

		this.extendOptions = function() {
			inner.extendOptions.apply(inner, arguments);
		};

		this.setFilter = function() {
			inner.setFilter.apply(inner, arguments);
		};

		this.setFreeText = function() {
            inner.setFreeText.apply(inner,arguments);
        };


		this.getOptions = function() {
			var o = {};
			for (var key in inner) {
				if (inner.hasOwnProperty(key) && typeof inner[key] != 'function') {
					o[key] = inner[key];
				}
			}
			return o;
		};
	};

})(global);(function(global) {

	"use strict";

	//base object for articles and connections
	/**
	* @constructor
	**/
	var _BaseObject = function(raw) {

		var _snapshot = null;

		raw = raw || {};
		var article = raw;

		// crud operations
		// fetch ( by id )
		this.fetch = function(onSuccess, onError) {
			onSuccess = onSuccess || function(){};
			onError = onError || function(){};
			if (!article.__id) {
				onError();
				return;
			}
			// get this article by id
			var that = this;
			var url = global.Appacitive.config.apiBaseUrl  + global.Appacitive.storage.urlFactory[this.type].getGetUrl(article.__schematype || article.__relationtype, article.__id);
			var getRequest = new global.Appacitive.HttpRequest();
			getRequest.url = url;
			getRequest.method = 'get';
			getRequest.onSuccess = function(data) {
				if (data && data.article) {
					_snapshot = data.article;
					article.__id = data.article.__id;
					for (var property in data.article) {
						if (typeof article[property] == 'undefined') {
							article[property] = data.article[property];
						}
					}
					if (that.___collection && that.___collection.collectionType == 'article')
						that.___collection.addToCollection(that);
					onSuccess();
				} else {
					onError(data.status);
				}
			};
			global.Appacitive.http.send(getRequest);
		};

		// delete the article
		this.del = function(onSuccess, onError, options) {
			onSuccess = onSuccess || function(){};
			onError = onError || function(){};
			options = options || {};

			// if the article does not have __id set, 
			// just remove it from the collection
			// else delete the article and remove from collection

			if (!article['__id']) {
				this.___collection.removeByCId(this.__cid);
				onSuccess();
				return;
			}

			// delete this article
			var that = this;
			var url = global.Appacitive.config.apiBaseUrl;
			url += global.Appacitive.storage.urlFactory[this.type].getDeleteUrl(article.__schematype || article.__relationtype, article.__id);

			// for User articles
			if (article && article.__schematype && article.__schematype.toLowerCase() == 'user') {
				url = global.Appacitive.config.apiBaseUrl;
				url += global.Appacitive.storage.urlFactory.user.getUserDeleteUrl(article.__id);
			}

			// if deleteConnections is specified
			if (options.deleteConnections && options.deleteConnections === true) {
				if (url.indexOf('?') == -1) url += '?deleteconnections=true';
				else url += '&deleteconnections=true';
			}

			var _deleteRequest = new global.Appacitive.HttpRequest();
			_deleteRequest.url = url;
			_deleteRequest.method = 'delete';
			_deleteRequest.onSuccess = function(data) {
				if (data.code == '200') {
					if (that.___collection)
						that.___collection.removeById(article.__id);
					onSuccess();
				} else {
					onError(data);
				}
			};
			_deleteRequest.beforeSend = function(r) {
				console.log('DELETE: ' + r.url);
			};
			global.Appacitive.http.send(_deleteRequest);
		};

		this.getArticle = function() { return article; };

		// accessor function for the article's attributes
		this.attributes = function() {
			if (arguments.length === 0) {
				if (!article.__attributes) article.__attributes = {};
				return article.__attributes;
			} else if (arguments.length == 1) {
				if (!article.__attributes) article.__attributes = {};
				return article.__attributes[arguments[0]];
			} else if (arguments.length == 2) {
				if (!article.__attributes) article.__attributes = {};
				article.__attributes[arguments[0]] = arguments[1];
			} else {
				throw new Error('.attributes() called with an incorrect number of arguments. 0, 1, 2 are supported.');
			}
		};

		// accessor function for the article's aggregates
		this.aggregates = function() {
			var aggregates = {};
			for (var key in article) {
				if (!article.hasOwnProperty(key)) return;
				if (key[0] == '$') {
					aggregates[key] = article[key];
				}
			}
			if (arguments.length === 0) {
				return aggregates;
			} else if (arguments.length == 1) {
				return aggregates[arguments[0]];
			} else {
				throw new Error('.aggregates() called with an incorrect number of arguments. 0, and 1 are supported.');
			}
		};

		this.get = function(key) {
			if (key) {
				return article[key];
			}
		};

		this.set = function(key, value) {
			if (key) {
				article[key] = value;
			}
			return value;
		};

		// save
		// if the object has an id, then it has been created -> update
		// else create
		this.save = function(onSuccess, onError) {
			if (article.__id)
				_update.apply(this, arguments);
			else
				_create.apply(this, arguments);
		};

		// to update the article
		var _update = function(onSuccess, onError) {
			var isDirty = false;
			var fieldList = [];
			var changeSet = JSON.parse(JSON.stringify(_snapshot));
			for (var property in article) {
				if (typeof article[property] == 'undefined' || article[property] === null) {
					changeSet[property] = null;
					isDirty = true;
				} else if (article[property] != _snapshot[property]) {
					changeSet[property] = article[property];
					isDirty = true;
				} else if (article[property] == _snapshot[property]) {
					delete changeSet[property];
				}
			}

			if (isDirty) {
				var _updateRequest = new global.Appacitive.HttpRequest();
				_updateRequest.url = global.Appacitive.config.apiBaseUrl + global.Appacitive.storage.urlFactory[this.type].getUpdateUrl(article.__schematype || article.__relationtype, _snapshot.__id);
				_updateRequest.method = 'post';
				_updateRequest.data = changeSet;
				_updateRequest.onSuccess = function(data) {
					if (data && (data.article || data.connection || data.user)) {
						_snapshot = data.article;
						if (typeof onSuccess == 'function') {
							onSuccess();
						}
					} else {
						if (typeof onError == 'function') {
							onError(data.status);
						}
					}
				};
				global.Appacitive.http.send(_updateRequest);
			}
		};

		// to create the article
		var _create = function(onSuccess, onError) {
			// save this article
			var that = this;
			var url = global.Appacitive.config.apiBaseUrl + global.Appacitive.storage.urlFactory[this.type].getCreateUrl(article.__schematype || article.__relationtype);

			// user article
			if (article.__schematype && article.__schematype.toLowerCase() == 'user') {
				url = global.Appacitive.config.apiBaseUrl + global.Appacitive.storage.urlFactory.user.getCreateUserUrl();
			}

			var _saveRequest = new global.Appacitive.HttpRequest();
			_saveRequest.url = url;
			_saveRequest.method = 'put';
			_saveRequest.data = article;
			_saveRequest.onSuccess = function(data) {
				var savedState = null;
				if (data) {
					savedState = data.article || data.connection || data.user;
				}
				if (data && savedState) {
					_snapshot = savedState;
					article.__id = savedState.__id;
					for (var property in savedState) {
						if (typeof article[property] == 'undefined') {
							article[property] = savedState[property];
						}
					}

					// if this is an article and there are collections 
					// of connected articles, set the article Id in them
					if (that.connectionCollections && that.connectionCollections.length > 0) {
						that.connectionCollections.forEach(function (collection) {
							collection.getQuery().extendOptions({ articleId: article.__id });
						});
					}


					if (typeof onSuccess == 'function') {
						onSuccess();
					}
				} else {
					if (typeof onError == 'function') {
						onError(data.status);
					}
				}
			};
			global.Appacitive.http.send(_saveRequest);
		};

	};

	global.Appacitive.BaseObject = _BaseObject;

})(global);(function (global) {

	"use strict";

	var S4 = function () {
		return Math.floor(Math.random() * 0x10000).toString(16);
	};

	var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

	var _utf8_encode = function (string) {
		string = string.replace(/\r\n/g, "\n");
		var utftext = "";
		for (var n = 0; n < string.length; n++) {
			var c = string.charCodeAt(n);
			if (c < 128) {
				utftext += String.fromCharCode(c);
			} else if ((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			} else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
		}
		return utftext;
	};

	var encodeToBase64 = function (input) {
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;
		input = _utf8_encode(input);
		while (i < input.length) {

			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);

			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;

			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}

			output = output +
				_keyStr.charAt(enc1) + _keyStr.charAt(enc2) +
				_keyStr.charAt(enc3) + _keyStr.charAt(enc4);
		}

		return output;
	};

	/**
	 * @constructor
	 **/
	global.Appacitive.GUID = function () {
		return encodeToBase64(
		S4() + S4() + "-" +
			S4() + "-" +
			S4() + "-" +
			S4() + "-" +
			S4() + S4() + S4()).toString();
	};

})(global);(function(global) {

	"use strict";

	/** 
	* @constructor
	**/
	var _ArticleCollection = function(options) {

		var _schema = null;
		var _query = null;
		var _articles = [];
		var _options = options;

		this.collectionType = 'article';

		if (!options || !options.schema) {
			throw new Error('Must provide schema while initializing ArticleCollection.');
		}

		var that = this;
		var _parseOptions = function(options) {
			_schema = options.schema;
			options.type = 'article';
			_query = new global.Appacitive.queries.SearchAllQuery(options);
			that.extendOptions = _query.extendOptions;
			_options = options;
		};

		this.setFilter = function(filterString) {
			_options.filter = filterString;
			_options.type = 'article';
			_options.schema = _schema;
			_query = new global.Appacitive.queries.BasicFilterQuery(options);
		};

        this.setFreeText = function(tokens) {
            if(!tokens && tokens.trim().length==0)
                _options.freeText = "";
            _options.freeText = tokens;
            _options.type = 'article';
            _options.schema = _schema;
            _query = new global.Appacitive.queries.BasicFilterQuery(options);
        };

		this.reset = function() {
			_options = null;
			_schema = null;
			_articles.length = 0;
			_query = null;
		};

		this.getQuery = function() {
			return _query;
		};

		this.setOptions = _parseOptions;
		_parseOptions(options);

		// getters
		this.get = function(index) {
			if (index != parseInt(index, 10)) return null;
			index = parseInt(index, 10);
			if (typeof index != 'number') return null;
			if (index >= _articles.length)  return null;
			return _articles.slice(index, index + 1)[0];
		};

		var fetchArticleById = function(id, onSuccess, onError) {

		};

		this.addToCollection = function(article) {
			if (!article || article.get('__schematype') != _schema)
				throw new Error('Null article passed or schema type mismatch');
			var index =  null;
			_articles.forEach(function(a, i) {
				if (a.get('__id') == article.get('__id')) {
					index = i;
				}
			});
			if (index !=+ null) {
				_articles.splice(index, 1);
			} else {
				_articles.push(article);
			}
		};

		this.getArticle = function(id, onSuccess, onError) {
			onSuccess = onSuccess || function() {};
			onError = onError || function() {};
			var existingArticle = _articles.filter(function (article) {
				return article.get('__id') == id;
			});
			if (existingArticle.length == 1) {
				onSuccess(Array.prototype.slice.call(existingArticle)[0]);
			} else {
				onError();
			}
		};

		this.getAll = function() { return Array.prototype.slice.call(_articles); };

		this.getAllArticles = function() {
			return Array.prototype.slice.call(_articles).map(function (a) {
				return a.getArticle();
			});
		};

		this.removeById = function(id) {
			if (!id) return false;
			var index = null;
			_articles.forEach(function(article, i) {
				if (article.getArticle().__id && article.getArticle().__id == id) {
					index = i;
				}
			});
			if (index !== null) {
				_articles.splice(index, 1);
				return true;
			} else { return false; }
		};

		this.removeByCId = function(id) {
			if (!id) return false;
			var index = null;
			_articles.forEach(function(article, i) {
				if (article.__cid && article.__cid == id) {
					index = i;
				}
			});
			if (index !== null) {
				_articles.splice(index, 1);
				return true;
			} else { return false; }
		};

		var parseArticles = function (data, onSuccess, onError) {
			var articles = data.articles;
			if (!articles) {
				onError(data.status);
				return;
			}
			if (!articles.length || articles.length === 0) articles = [];
			articles.forEach(function (article) {
				var _a = new global.Appacitive.Article(article);
				_a.___collection = that;
				_articles.push(_a);
			});
			var pagingInfo = data.paginginfo || {};
			onSuccess(pagingInfo);
		};

		this.fetch = function(onSuccess, onError) {
			onSuccess = onSuccess || function() {};
			onError = onError || function() {};
			_articles.length = 0;
			var _queryRequest = _query.toRequest();
			_queryRequest.onSuccess = function(data) {
				parseArticles(data, onSuccess, onError);
			};
			global.Appacitive.http.send(_queryRequest);
		};

		this.fetchByPageNumber = function(onSuccess, onError, pageNumber) {
			var pInfo = _query.getOptions().pageQuery;
			pInfo.pageNumber = pageNumber;
			this.fetch(onSuccess, onError);
		};

		this.fetchNextPage = function(onSuccess, onError) {
			var pInfo = _query.getOptions().pageQuery;
			pInfo.pageNumber += 1;
			this.fetch(onSuccess, onError);
		};

		this.fetchPreviousPage = function(onSuccess, onError) {
			var pInfo = _query.getOptions().pageQuery;
			pInfo.pageNumber -= 1;
			if (pInfo.pageNumber === 0) pInfo.pageNumber = 1;
			this.fetch(onSuccess, onError);
		};

		this.createNewArticle = function(values) {
			values = values || {};
			values.__schematype = _schema;
			var _a = new global.Appacitive.Article(values);
			_a.___collection = that;
			_a.__cid = parseInt(Math.random() * 1000000, 10);
			_articles.push(_a);
			return _a;
		};

		this.map = function() { return _articles.map.apply(this, arguments); };
		this.forEach = function() { return _articles.forEach.apply(this, arguments); };
		this.filter = function() { return _articles.filter.apply(this, arguments); };

	};

	global.Appacitive.ArticleCollection = _ArticleCollection;

})(global);(function(global) {

	"use strict";

	/** 
	* @constructor
	**/
	var _ConnectionCollection = function(options) {

		var _relation = null;
		var _schema = null;

		var _query = null;

		var _connections = [];
		var _articles = [];

		var _options = options;
		var connectionMap = {};

		this.collectionType = 'connection';

		if (!options || !options.relation) {
			throw new Error('Must provide relation while initializing ConnectionCollection.');
		}

		var _parseOptions = function(options) {
			_relation = options.relation;
			options.type = 'connection';
			_query = new global.Appacitive.queries.SearchAllQuery(options);
			_options = options;
		};

		this.setFilter = function(filterString) {
			_options.filter = filterString;
			_options.type = 'connection';
			_options.relation = _relation;
			_query = new global.Appacitive.queries.BasicFilterQuery(options);
		};

		this.setQuery = function(query) {
			if (!query) throw new Error('Invalid query passed to connectionCollection');
			_connections.length = 0;
			_query = query;
		};

		this.reset = function() {
			_options = null;
			_relation = null;
			articles.length = 0;
			_connections.length = 0;
			_query = null;
		};

		this.getQuery = function() {
			return _query;
		};

		this.setOptions = _parseOptions;
		_parseOptions(options);

		// getters
		this.get = function(index) {
			if (index != parseInt(index, 10)) return null;
			index = parseInt(index, 10);
			if (typeof index != 'number') return null;
			if (index >= _connections.length)  return null;
			return _connections.slice(index, index + 1)[0];
		};

		this.addToCollection = function(connection) {
			if (!connection || connection.get('__relationtype') != _relation)
				throw new Error('Null connection passed or relation type mismatch');
			var index =  null;
			_connections.forEach(function(c, i) {
				if (c.get('__id') == connection.get('__id')) {
					index = i;
				}
			});
			if (index !== null) {
				_connections.splice(index, 1);
			} else {
				_connections.push(connection);
			}
		};

		this.getConnection = function(id, onSuccess, onError) {
			onSuccess = onSuccess || function() {};
			onError = onError || function() {};
			var existingConnection = _connections.filter(function (connection) {
				return connection.get('__id') == id;
			});
			if (existingConnection.length == 1) {
				onSuccess(Array.prototype.slice.call(existingConnection)[0]);
			} else {
				onError();
			}
		};

		this.getAll = function() { return Array.prototype.slice.call(_connections); };

		this.getAllConnections = function() {
			return Array.prototype.slice.call(_connections).map(function (c) {
				return c.getConnection();
			});
		};

		this.removeById = function(id) {
			if (!id) return false;
			var index = null;
			_connections.forEach(function(connection, i) {
				if (connection.getConnection().__id && connection.getConnection().__id == id) {
					index = i;
				}
			});
			if (index !== null) {
				_connections.splice(index, 1);
				return true;
			} else { return false; }
		};

		this.removeByCId = function(id) {
			if (!id) return false;
			var index = null;
			_connections.forEach(function(connection, i) {
				if (connection.__cid && connection.__cid == id) {
					index = i;
				}
			});
			if (index !== null) {
				_connections.splice(index, 1);
				return true;
			} else { return false; }
		};

		var that = this;
		var parseConnections = function (data, onSuccess, onError) {
			data = data || {};
			var connections = data.connections;
			if (!connections) {
				if (data.status && data.status.code && data.status.code == '200') {
					connections = [];
				} else {
					onError(data.status);
					return;
				}
			}
			if (!connections.length || connections.length === 0) connections = [];
			connections.forEach(function (connection) {
				var _c = new global.Appacitive.Connection(connection);
				_c.___collection = that;
				_connections.push(_c);

				// if this is a connected articles call...
				if (connection.__endpointa.article || connection.__endpointb.article) {
					var article = connection.__endpointa.article || connection.__endpointb.article;
					var _a = new global.Appacitive.Article(article);
					_a.___collection = that;
					_articles.push(_a);
				}
			});

			var pagingInfo = data.paginginfo || {};
			onSuccess(pagingInfo);
		};

		this.getConnectedArticle = function(articleId) {
			if (!_articles || _articles.length === 0) return null;
			var article = _articles.filter(function(a) { return a.get('__id') == articleId; });
			if (article.length > 0) return article[0];
			return null;
		};

		this.fetch = function(onSuccess, onError) {
			onSuccess = onSuccess || function() {};
			onError = onError || function() {};
			_connections.length = 0;
			var _queryRequest = _query.toRequest();
			_queryRequest.onSuccess = function(data) {
				parseConnections(data, onSuccess, onError);
			};
			global.Appacitive.http.send(_queryRequest);
		};

		this.createNewConnection = function(values) {
			values = values || {};
			values.__relationtype = _relation;
			var _a = new global.Appacitive.Connection(values);
			_a.___collection = that;
			_a.__cid = parseInt(Math.random() * 1000000, 10);
			_connections.push(_a);
			return _a;
		};

		this.map = function() { return _connections.map.apply(this, arguments); };

		this.forEach = function(delegate, context) {
			context = context || this;
			return _connections.forEach(delegate, context);
		};

		this.filter = function() { return _connections.filter.apply(this, arguments); };

	};

	global.Appacitive.ConnectionCollection = _ConnectionCollection;

})(global);(function (global) {

	"use strict";

	var _getFacebookProfile = function(onSuccess, onError) {
		var r = new global.Appacitive.HttpRequest();
		r.method = 'get';
		r.url = global.Appacitive.config.apiBaseUrl + global.Appacitive.storage.urlFactory.user.getGetAllLinkedAccountsUrl(this.get('__id'));
		r.onSuccess = function(d) {
			var fbUsername = null;
			if (d && d.identities && d.identities.length > 0) {
				var fb = d.identities.filter(function(identity) {
					return identity.authtype.toLowerCase() == 'facebook';
				});
				if (fb.length == 1) {
					fbUsername = fb[0].username;
				}
			}
			if (fbUsername !== null) {
				FB.api('/' + fbUsername, function(response) {
					if (response) {
						onSuccess(response);
					} else {
						onError();
					}
				});
			} else {
				onError();
			}
		};
		r.onError = function() {
			onError();
		};
		global.Appacitive.http.send(r);
	};

	global.Appacitive.Article = function(options) {
		var base = new global.Appacitive.BaseObject(options);
		base.type = 'article';
		base.connectionCollections = [];

		if (base.get('__schematype') && base.get('__schematype').toLowerCase() == 'user') {
			base.getFacebookProfile = _getFacebookProfile;
		}

		return base;
	};

	global.Appacitive.BaseObject.prototype.getConnectedArticles = function(options) {
		if (this.type != 'article') return null;
		options = options || {};
		options.articleId = this.get('__id');

		var collection = new global.Appacitive.ConnectionCollection({ relation: options.relation });
		collection.connectedArticle = this;
		this.connectionCollections.push(collection);
		var connectedArticlesQuery = new global.Appacitive.queries.ConnectedArticlesQuery(options);
		collection.setQuery(connectedArticlesQuery);

		return collection;
	};

	global.Appacitive.BaseObject.prototype.getConnected = function(options) {
		if (this.type != 'article') return null;
		options = options || {};
		options.onSuccess = options.onSuccess || function(){};
		options.onError = options.onError || function(){};
		options.articleId = this.get('__id');

	};

})(global);(function (global) {

	"use strict";

	var parseEndpoint = function(endpoint) {
		var result = {
			label: endpoint.label
		};

		if (endpoint.articleid) {
			// provided an article id
			result.articleid = endpoint.articleid;
		} else if (endpoint.article && typeof endpoint.article.getArticle == 'function'){
			// provided an instance of Appacitive.ArticleCollection
			// stick the whole article if there is no __id
			// else just stick the __id
			if (endpoint.article.get('__id')) {
				result.articleid = endpoint.article.get('__id');
			} else {
				result.article = endpoint.article.getArticle();
			}
		} else if (typeof endpoint.article == 'object' && endpoint.article.__schematype) {
			// provided a raw article
			// if there is an __id, just add that
			// else add the entire article
			if (endpoint.article.__id) {
				result.articleid = endpoint.article.__id;
			} else {
				result.article = endpoint.article;
			}
		} else {
			throw new Error('Incorrectly configured endpoints provided to setupConnection');
		}

		return result;
	};

	global.Appacitive.Connection = function(options) {
		var base = new Appacitive.BaseObject(options);
		base.type = 'connection';
		base.getConnection = base.getArticle;

		base.__defineGetter__('connectedArticle', function() {
			if (!base.___collection.connectedArticle) {
				throw new Error('connectedArticle can be accessed only by using the getConnectedArticles call');
			}
			var articleId = base.___collection.connectedArticle.get('__id');
			if (!articleId) return null;
			var otherArticleId = base.getConnection().__endpointa.articleid;
			if (base.getConnection().__endpointa.articleid == articleId)
				otherArticleId = base.getConnection().__endpointb.articleid;
			return base.___collection.getConnectedArticle(otherArticleId);
		});

		// helper method for setting up the connection
		base.setupConnection = function(endpointA, endpointB) {
			// validate the endpoints
			if ((!endpointA || !endpointA.id || endpointA.label) || (!endpointB || !endpointB.id || endpointB.label)) {
				throw new Error('Incorrect endpoints configuration passed.');
			}

			// there are two ways to do this
			// either we are provided the article id
			// or a raw article
			// or an Appacitive.Article instance
			// sigh

			// 1
			base.set('__endpointa', parseEndpoint(endpointA));

			// 2
			base.set('__endpointb', parseEndpoint(endpointB));
		};

		return base;
	};

})(global);(function (global) {

	"use strict";

	var UserManager = function() {

		var authenticatedUser = null;

		this.__defineGetter__('currentUser', function() {
			return authenticatedUser;
		});

		this.deleteCurrentUser = function(onSuccess, onError) {
			onSuccess = onSuccess || function(){};
			onError = onError || function(){};

			if (authenticatedUser === null) {
				throw new Error('Current user is not set yet');
			}
			var currentUserId = authenticatedUser.__id;
			this.deleteUser(currentUserId, onSuccess, onError);
		};

		this.deleteUser = function(userId, onSuccess, onError) {
			onSuccess = onSuccess || function(){};
			onError = onError || function(){};

			var request = new global.Appacitive.HttpRequest();
			request.method = 'delete';
			request.url = global.Appacitive.config.apiBaseUrl;
			request.url += global.Appacitive.storage.urlFactory.user.getUserDeleteUrl(userId);
			request.onSuccess = function(data) {
				if (data && data.code && data.code == '200') {
					onSuccess(data);
				} else {
					data = data || {};
					data.message = data.message || 'Server error';
					onError(data);
				}
			};
			request.onError = onError;
			global.Appacitive.http.send(request);
		};

		this.createUser = function(fields, onSuccess, onError) {
			var users = new Appacitive.ArticleCollection({ schema: 'user' });
			var user = users.createNewArticle(fields);
			user.save(function() {
				onSuccess(user);
			}, onError);
		};

		this.createUser1 = function(user, onSuccess, onError) {
			onSuccess = onSuccess || function(){};
			onError = onError || function(){};
			user = user || {};
			user.__schematype = 'user';
			if (!user.username || !user.password) {
				throw new Error('Username and password are mandatory');
			}
			var request = new global.Appacitive.HttpRequest();
			request.method = 'put';
			request.url = global.Appacitive.config.apiBaseUrl + global.Appacitive.storage.urlFactory.user.getCreateUserUrl();
			request.data = user;
			request.onSuccess = function(data) {
				if (data && data.user) {
					onSuccess(data.user);
				} else {
					onError((data || {}).status || 'No response from APIs.');
				}
			};
			request.onError = onError;
			global.Appacitive.http.send(request);
		};

		this.authenticateUser = function(authRequest, onSuccess, onError) {
			onSuccess = onSuccess || function(){};
			onError = onError || function(){};

			var request = new global.Appacitive.HttpRequest();
			request.method = 'post';
			request.url = global.Appacitive.config.apiBaseUrl + global.Appacitive.storage.urlFactory.user.getAuthenticateUserUrl();
			request.data = authRequest;
			request.onSuccess = function(data) {
				if (data && data.user) {
					authenticatedUser = data.user;
					onSuccess(data);
				} else {
					data = data || {};
					onError(data.status);
				}
			};
			request.onError = onError;
			global.Appacitive.http.send(request);
		};

		this.signupWithFacebook = function(onSuccess, onError) {
			onSuccess = onSuccess || function(){};
			onError = onError || function(){};

			FB.api('/me', function(response) {
				var authRequest = {
					"accesstoken": Appacitive.facebook.accessToken,
					"type": "facebook",
					"expiry": 60 * 60,
					"attempts": -1,
					"createnew": true
				};
				var request = new Appacitive.HttpRequest();
				request.url = Appacitive.config.apiBaseUrl + Appacitive.storage.urlFactory.user.getAuthenticateUserUrl();
				request.method = 'post';
				request.data = authRequest;
				request.onSuccess = function(a) {
					if (a.user) {
						authenticatedUser = a.user;
						onSuccess(a);
					} else {
						onError(a);
					}
				};
				request.onError = function() {
					onError();
				};
				Appacitive.http.send(request);
			});
		};

		this.authenticateWithFacebook = this.signupWithFacebook;

	};

	global.Appacitive.Users = new UserManager();

})(global);(function(global) {

	"use strict";

	var _emailManager = function() {

		var config = {
			username: null,
			from: null,
			frompassword: null,
			smtphost: 'smtp.google.com',
			smtpport: 587,
			enablessl: true,
			replyto: null
		};

		this.getConfig = function() {
			var _copy = config;
			return _copy;
		};

		this.sendTemplatedEmail = function(options) {
			throw new Error('Not implemented yet');
		};

		this.setupEmail = function(options) {
			options = options || {};
			config.username = options.username || config.username;
			config.from = options.from || config.from;
			config.frompassword = options.frompassword || config.frompassword;
			config.smtphost = options.smtphost || config.smtphost;
			config.smtpport = options.smtpport || config.smtpport;
			config.enablessl = options.enablessl || config.enablessl;
			config.replyto = options.replyto || config.replyto;
		};

		this.sendRawEmail = function(options, onSuccess, onError) {
			onSuccess = onSuccess || function(){};
			onError = onError || function(){};

			if (!options || !options.to || !options.to.length || options.to.length != 1) {
				throw new Error('Atleast one receipient is mandatory to send an email');
			}
			if (!options.subject) {
				throw new Error('Subject is mandatory to send an email');
			}

			var email = {
				configuration: config,
				to: options.to || [],
				cc: options.cc || [],
				bcc: options.bcc || [],
				subject: options.subject || 'Appacitive',
				body: {
					"BodyText": options.body || '',
					"IsBodyHTML": true,
					"__type": "RawBody"
				}
			};
			var request = new global.Appacitive.HttpRequest();
			request.url = global.Appacitive.config.apiBaseUrl + Appacitive.storage.urlFactory.email.getSendEmailUrl();
			request.method = 'post';
			request.data = email;
			request.onSuccess = function(d) {
				if (d && d.status && d.status.code == '200') {
					onSuccess(d.email);
				} else {
					d = d || {};
					d.status = d.status || {};
					onError(d.status.message || 'Server error');
				}
			};
			global.Appacitive.http.send(request);
		};

	};

	global.Appacitive.email = new _emailManager();

})(global);(function (global) {

	"use strict";

	var _facebook = function() {

		var _accessToken = null;

		this.requestLogin = function(onSuccess, onError) {
			onSuccess = onSuccess || function(){};
			onError = onError || function(){};
			if (!FB) {
				onError();
				return;
			}
			FB.login(function(response) {
				if (response.authResponse) {
					var accessToken = response.authResponse.accessToken;
					_accessToken = accessToken;
					onSuccess(response.authResponse);
				} else {
					onError();
				}
			}, {scope:'email,user_birthday'});
		};

		this.getCurrentUserInfo = function(onSuccess, onError) {
			onSuccess = onSuccess || function(){};
			onError = onError || function(){};
			FB.api('/me', function(response) {
				if (response) {
					onSuccess(response);
				} else {
					onError();
				}
			});
		};

		this.__defineGetter__('accessToken', function() {
			return _accessToken;
		});

		this.__defineSetter__('accessToken', function(val) {
			_accessToken = val;
		});

		this.getProfilePictureUrl = function(username) {
			return 'https://graph.facebook.com/' + username + '/picture';
		};

		this.logout = function(onSuccess, onError) {
			onSuccess = onSuccess || function() {};
			onError = onError || function(){};
			try {
				FB.logout(function(response) {
					onSuccess();
				});
			} catch(e) {
				onError(e.message);
			}
		};

	};

	global.Appacitive.facebook = new _facebook();

})(global);

if (typeof module != 'undefined') {
	module.exports = function(apikey){ 
		global.Appacitive.apikey = apikey;
		return global.Appacitive;
	}
}