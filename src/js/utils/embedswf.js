import { Browser } from 'environment/environment';

define([
    'utils/helpers',
    'utils/backbone.events',
    'utils/underscore'
], function(utils, Events, _) {

    // Defaults
    var BGCOLOR = '#000000';

    function appendParam(object, name, value) {
        var param = document.createElement('param');
        param.setAttribute('name', name);
        param.setAttribute('value', value);
        object.appendChild(param);
    }

    function addGetter(obj, property, value) {
        Object.defineProperty(obj, property, {
            get: function() {
                return value;
            }
        });
    }

    function embed(swfUrl, container, id, wmode) {
        var swf;
        var queueCommands = true;

        wmode = wmode || 'opaque';

        if (Browser.MSIE) {
            // IE9 works best with outerHTML
            var temp = document.createElement('div');
            container.appendChild(temp);

            temp.outerHTML = '<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"' +
                ' width="100%" height="100%" id="' + id +
                '" name="' + id +
                '" tabindex="0">' +
                '<param name="movie" value="' + swfUrl + '">' +
                '<param name="allowfullscreen" value="true">' +
                '<param name="allowscriptaccess" value="always">' +
                '<param name="wmode" value="' + wmode + '">' +
                '<param name="bgcolor" value="' + BGCOLOR + '">' +
                '<param name="menu" value="false">' +
                '</object>';

            var objectElements = container.getElementsByTagName('object');
            for (var i = objectElements.length; i--;) {
                if (objectElements[i].id === id) {
                    swf = objectElements[i];
                }
            }

        } else {
            swf = document.createElement('object');
            swf.setAttribute('type', 'application/x-shockwave-flash');
            swf.setAttribute('data', swfUrl);
            swf.setAttribute('width', '100%');
            swf.setAttribute('height', '100%');
            swf.setAttribute('bgcolor', BGCOLOR);
            swf.setAttribute('id', id);
            swf.setAttribute('name', id);

            appendParam(swf, 'allowfullscreen', 'true');
            appendParam(swf, 'allowscriptaccess', 'always');
            appendParam(swf, 'wmode', wmode);
            appendParam(swf, 'menu', 'false');

            container.appendChild(swf, container);
        }

        swf.className = 'jw-swf jw-reset';
        swf.style.display = 'block';
        swf.style.position = 'absolute';
        swf.style.left = 0;
        swf.style.right = 0;
        swf.style.top = 0;
        swf.style.bottom = 0;
        if (Browser.ie && ('PointerEvent' in window)) {
            swf.style.pointerEvents = 'none';
        }

        // flash can trigger events
        var processEventsTimeout = -1;
        addGetter(swf, 'on', Events.on);
        addGetter(swf, 'once', Events.once);
        addGetter(swf, '_eventQueue', []);
        addGetter(swf, 'off', function() {
            var args = Array.prototype.slice.call(arguments);
            if (!args.length) {
                swf._eventQueue.length = 0;
                clearTimeout(processEventsTimeout);
            }
            return Events.off.apply(swf, args);
        });
        addGetter(swf, 'trigger', function(type, json) {
            var eventQueue = swf._eventQueue;
            eventQueue.push({ type: type, json: json });
            if (processEventsTimeout > -1) {
                return;
            }
            processEventsTimeout = setTimeout(function() {
                var length = eventQueue.length;
                processEventsTimeout = -1;
                while (length--) {
                    var event = eventQueue.shift();
                    if (event.json) {
                        var data = JSON.parse(decodeURIComponent(event.json));
                        Events.trigger.call(swf, event.type, data);
                    } else {
                        Events.trigger.call(swf, event.type);
                    }
                }
            });
        });

        let events = {};
        Object.defineProperty(swf, '_events', {
            get: function () {
                return events;
            },
            set: function (value) {
                events = value;
            }
        });

        // javascript can trigger SwfEventRouter callbacks
        addGetter(swf, 'triggerFlash', function(name) {
            if (name === 'setupCommandQueue') {
                queueCommands = false;
            }

            if (name !== 'setup' && queueCommands || !swf.__externalCall) {
                var commandQueue = swf.__commandQueue;
                // remove any earlier commands with the same name
                for (var j = commandQueue.length; j--;) {
                    if (commandQueue[j][0] === name) {
                        commandQueue.splice(j, 1);
                    }
                }
                commandQueue.push(Array.prototype.slice.call(arguments));
                return swf;
            }

            var args = Array.prototype.slice.call(arguments, 1);
            var status = utils.tryCatch(function() {
                if (args.length) {
                    // remove any nodes from arguments
                    // cyclical structures cannot be converted to JSON
                    for (var k = args.length; k--;) {
                        if (typeof args[k] === 'object') {
                            _.each(args[k], deleteHTMLElement);
                        }
                    }
                    var json = JSON.stringify(args);
                    swf.__externalCall(name, json);
                } else {
                    swf.__externalCall(name);
                }
            });

            if (status instanceof utils.Error) {
                console.error(name, status);
                if (name === 'setup') {
                    status.name = 'Failed to setup flash';
                    return status;
                }
            }
            return swf;
        });

        // commands are queued when __externalCall is not available
        addGetter(swf, '__commandQueue', []);

        return swf;
    }

    function remove(swf) {
        if (swf && swf.parentNode) {
            swf.style.display = 'none';
            swf.parentNode.removeChild(swf);
            swf = null;
        }
    }

    function deleteHTMLElement(value, prop, object) {
        if (value instanceof window.HTMLElement) {
            delete object[prop];
        }
    }

    return {
        embed: embed,
        remove: remove
    };
});
