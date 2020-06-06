/*
    jquery.chart
*/
;
(function ($, W, D, undefined) {
    'use strict';
    var pluginName = "auth",
        defaults = {
            action: "login",
            selector: ".login"
        };

    const msalConfig = {
        auth: {
            clientId: "59d19f8c-9524-4667-be2c-b9406dba21c8",
        },
    };

    const msalInstance = new Msal.UserAgentApplication(msalConfig);
    W.msalInstance = msalInstance;

    msalInstance.handleRedirectCallback((error, response) => {
        debugger;
        // handle redirect response or error
    });

    var loginRequest = {
         scopes: ["email", "openid","https://isvcanvas.onmicrosoft.com/isvcanvasapi/Read",  "https://isvcanvas.onmicrosoft.com/isvcanvasapi/Save"], // optional Array<string>
    };

    function Plugin(element, options) {
        var self = this;
        this.element = element;
        this.$element = $(element);
        this.options = $.extend({}, defaults, options);
        this._defaults = defaults;
        this._name = pluginName;
        this.init();
    }

    Plugin.prototype = {

        getApiToken: function () {
            // if the user is already logged in you can acquire a token
            if (window.msalInstance.getAccount()) {
                var tokenRequest = {
                    scopes: ["https://isvcanvas.onmicrosoft.com/isvcanvasapi/Read", "https://isvcanvas.onmicrosoft.com/isvcanvasapi/Save"], // optional Array<string>
                };
                return window.msalInstance
                    .acquireTokenSilent(tokenRequest)
                    .then((response) => {
                        // get access token from response
                        // response.accessToken
                        return "Bearer " + response.accessToken;
                    })
                    .catch((err) => {
                        // could also check if err instance of InteractionRequiredAuthError if you can import the class.
                        if (err.name === "InteractionRequiredAuthError") {
                            return msalInstance
                                .acquireTokenPopup(tokenRequest)
                                .then((response) => {
                                    // get access token from response
                                    // response.accessToken

                                    return "Bearer " + response.accessToken;
                                })
                                .catch((err) => {
                                    // handle error
                                });
                        }
                    });
            } else {
                // user is not logged in, you will need to log them in to acquire a token
            }
        },


        init: function () {
            var self = this;


            switch (self.options.action) {
                case "login":
                    self.login();
                    break;
                case "signout":
                    console.log("aaa");
                    self.signOut();
                    break;
            }
            self.login();

        },

        login: function () {
            var self = this;

            msalInstance
                .loginPopup(loginRequest)
                .then((response) => {
                    self.$element.trigger("ssr.loggedin", response.account);
                })
                .catch((err) => {
                    console.log(err);
                    // handle error
                });
        },

        signOut: function () {
            const config = {
                auth: {
                    clientId: msalConfig.auth.clientId
                }
            }

            const userAgentApplication = new Msal.UserAgentApplication(config);
            userAgentApplication.logout();
        }
    };

    $.fn[pluginName] = function (options) {
        return this.each(function () {
            if (typeof (options) === 'string') {
                var data = $.data(this, "ssr.plugin." + pluginName);
                if (data && $.isFunction(data[options])) {
                    data[options]();
                }
            }
            else {
                $.data(this, "ssr.plugin." + pluginName, new Plugin(this, options));
            }
        });
    };

})(jQuery, window, document);
