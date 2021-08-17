import html2canvas from "html2canvas";
import gifshot from 'gifshot';
import bowser from 'bowser';
import deburgerButton from './components/deburger-button/button';
import { encryption, abtob64 } from './utils/utils.js'
require('./deburger.css');

var Deburger = function (options) {
    let depth = 0;
    let _options = Object.assign({
        screen: {
            interval: 1000,
            maxImages: 15
        },
        autoDetect: false,
        url: 'http://localhost:8090',
        project: 'deburger',
        name: 'deburger',
        depth: {
            max: 5
        }
    }, options);
    let deburger = {
        initialize: function(options){
            this.options = options;
        },
        watcher: {
            handlers: {},
            subscribe: function (eventName, fn) {
                if(!Object.prototype.hasOwnProperty.call(this.handlers, eventName)){
                    this.handlers[eventName] = [];
                }
                this.handlers[eventName].push(fn);
            },
            fire: function (eventName, data, scope) {
                let _scope = scope || window;
                if(!Object.prototype.hasOwnProperty.call(this.handlers, eventName)){
                    return false;
                }
                this.handlers[eventName].forEach(function (handler) {
                    handler.call(_scope, data);
                });
            }
        },
        capture: {
            screen: {
                data: null,
                _interval: null,
                _images: [],
                record: function () {
                    console.log('🍔 screen recording...');

                    let self = this;
                    //[Fix] This part fix a bug on Html2Canvas (@see https://github.com/niklasvh/html2canvas/issues/117)
                    var styleSheet = document.createElement("style")
                    styleSheet.type = "text/css"
                    styleSheet.innerText = `.html2canvas-container { width: ${window.innerWidth}px !important; height: ${window.innerHeight}px !important; }`
                    document.head.appendChild(styleSheet)
                    //[/Fix]

                    self.interval = setInterval(function () {
                        html2canvas(document.body, {
                            scrollY: -window.scrollY,
                        }).then((canvas) => {
                            let ctx = canvas.getContext('2d');
                            ctx.font = '36px serif';
                            ctx.fillText(self._images.length, 10, 46);

                            const base64image = canvas.toDataURL("image/png");
                            self._images.push(base64image);
                            if (self._images.length > _options.screen.maxImages) {
                                self._images.shift();
                            }
                        });
                    }, _options.screen.interval)
                },
                stop: async function () {
                    let self = this;
                    clearInterval(self.interval);
                    gifshot.createGIF({
                        images: self._images,
                        gifWidth: window.innerWidth,
                        gifHeight: window.innerHeight,
                        frameDuration: _options.screen.interval / 100,
                    }, function (obj) {
                        if (!obj.error) {
                            deburger.capture.screen.data = obj.image;
                            self.afterGifGenerated(obj.image)
                        }
                    });
                },
            },

            logs: {
                data: [],
                add: function (data) {
                    let self = this;
                    self.data.push(data);
                    if (self.data.length > 30) {
                        self.data.shift();
                    }
                },
                record: function () {
                    console.log('🍔 logs recording...');
                    let self = this;
                    window.addEventListener('error', function (error) {
                        self.add({
                            file:error.filename,
                            line: error.lineno,
                            message: error.message,
                            type: error.type
                        })
                        if(deburger.options.autoDetect){
                            deburger.watcher.fire('log:error', error)
                        }
                    })
                    let _console = window.console.error;
                    window.console.error = function(){
                        let args = Array.from(arguments)
                        self.add({
                            type: 'log',
                            message: args[0],
                            arguments: args
                        })
                        return _console(...args)
                    }
                }
            },

            network: {
                data: [],
                add: function (data) {
                    let self = this;
                    self.data.push(data);
                    if (self.data.length > 30) {
                        self.data.shift();
                    }
                },
                record: function () {
                    console.log('🍔 network recording...');
                    let self = this;
                    //Fetch listener
                    let _fetch = window.fetch;
                    window.fetch = function () {
                        return _fetch(...arguments).then(function (response) {
                            self.add({
                                url: encodeURI(response.url.toString()),
                                status: response.status.toString(),
                                body: response.status === 500 ? response.text() : 0
                            })
                            return response;
                        });
                    }
                    //XHR listener
                    let _xhrOpen = XMLHttpRequest.prototype.open
                    XMLHttpRequest.prototype.open = function () {
                        let enc = new TextEncoder()
                        this.addEventListener('load', function () {
                            self.add({
                                url: encodeURI(this.responseURL.toString()),
                                status: this.status.toString(),
                                body: this.status === 500 ? this.responseText : 0
                            })
                        });
                        _xhrOpen.apply(this, arguments);
                    };
                },
            },

            start: function (capturing) {
                for (let c of capturing) {
                    if (Object.prototype.hasOwnProperty.call(this, c)) {
                        this[c].record();
                    }
                }
            },
            read: function () {
                let data = {
                    browser:{
                        screen: `${screen.width} x ${screen.height}`,
                        ...bowser.parse(window.navigator.userAgent)
                    }
                }

                for (let c of ['screen', 'network', 'logs']) {
                    if (Object.prototype.hasOwnProperty.call(this, c)) {
                        data[c] = this[c].data;
                    }
                }
                return data;
            },
            stop: function (capturing) {
                for (let c of capturing) {
                    if (Object.prototype.hasOwnProperty.call(this, c)) {
                        this[c].stop();
                    }
                }
            }
        },
    }
    return deburger;
}
window.deburger = new Deburger();
deburgerButton.load();
