/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
function loadWebworks(win, device) {
    var builder = require('../../../platform/builder'),
        platform = "handset",
        webworks;

    switch (device.id) {
    case "Playbook":
        platform = "tablet/2.0.0";
        break;
    case "Z10":
    case "Q10":
        platform = "bb10/1.0.0";
        break;
    default:
        platform = "handset/2.0.0";
        break;
    }

    webworks = require('./platform/webworks.' + platform + '/spec');

    builder.build(webworks.objects).into(win);
    builder.build(webworks.objects).into(window);
}

module.exports = {
    id: "cordova",
    version: "2.0.0",
    name: "Apache Cordova",
    type: "platform",
    nativeMethods: {},

    config: require('./spec/config'),
    device: require('./spec/device'),
    ui: require('./spec/ui'),
    events: require('./spec/events'),

    initialize: function (win) {
        var honeypot = require('../../../honeypot'),
            devices = require('../../../devices'),
            device = devices.getCurrentDevice(),
            bridge = require('./bridge'),
            cordova,
            topCordova = window.top.require('./spec'),
            get = function () {
                return cordova;
            },
            set = function (orig) {
                if (cordova) {
                    return;
                }

                cordova = orig;

                cordova.define.remove("cordova/exec");
                cordova.define("cordova/exec", function (require, exports, module) {
                    module.exports = bridge.exec;
                });

                cordova.UsePolling = true;

                //do nothing here as we will just call the callbacks ourselves
                cordova.define.remove("cordova/plugin/android/polling");
                cordova.define("cordova/plugin/android/polling", function (require, exports, module) {
                    module.exports = function () {};
                });

                var builder = cordova.require('cordova/builder'),
                    allTheThings = win,
                    base,
                    iosPlugin;

                //HACK: We should really start using platform versions for this
                try {
                    base = cordova.require('cordova/common');
                    //HACK: Overwrite all the things, handles when cordova.js executes before we start booting
                    if (builder.build) {
                        builder.build(base.objects).intoAndClobber(allTheThings);
                    } else {
                        //Support for cordova 2.3 and onward
                        builder.buildIntoAndClobber(base.objects, allTheThings);
                    }
                }
                catch (e) {
                    //HACK: Support for cordova 2.5+ .. this is not the module you are looking for
                }

                cordova.require('cordova/channel').onNativeReady.fire();
                //  DIRTY HACK: once cordova is cleaned up, we do not
                //  need this.
                // reference issue: https://issues.apache.org/jira/browse/CB-1013
                try {
                    iosPlugin = cordova.require('cordova/plugin/ios/device');
                    bridge.exec(function (info) {
                        iosPlugin.setInfo(info);
                    }, null, 'Device', 'getDeviceInfo', []);
                } catch (e) {
                    cordova.require('cordova/channel').onCordovaInfoReady.fire();
                }
            };

        if (window.FileReader && !topCordova.nativeMethods.FileReader) {
            topCordova.nativeMethods.FileReader = window.FileReader;
        }

        if (device.manufacturer === "BlackBerry") {
            loadWebworks(win, device);
        }

        honeypot.monitor(win, "cordova").andRun(get, set);
    },

    objects: {
        MediaError: {
            path: "cordova/2.0.0/MediaError"
        },
        Acceleration: {
            path: "w3c/1.0/Acceleration"
        },
        Coordinates: {
            path: "w3c/1.0/Coordinates"
        },
        Position: {
            path: "w3c/1.0/Position"
        },
        PositionError: {
            path: "w3c/1.0/PositionError"
        },
        navigator: {
            path: "w3c/1.0/navigator",
            children: {
                geolocation: {
                    path: "w3c/1.0/geolocation"
                }
            }
        },
        org: {
            children: {
                apache: {
                    children: {
                        cordova: {
                            children: {
                                Logger: {
                                    path: "cordova/2.0.0/logger"
                                },
                                JavaPluginManager: {
                                    path: "cordova/2.0.0/JavaPluginManager"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};
