/*
    jquery.chart
*/
;
(function ($, W, D, undefined) {
    'use strict';
    var pluginName = "auth",
        defaults = {
            action: "login",
            type: "none",
            selector: ".login"
        };

    const msalConfig = {
        auth: {
            clientId: "f2d88ec2-9d1d-4f25-a1ce-c9e1b2d395c9",
            authority: "https://isvcanvas.b2clogin.com/isvcanvas.onmicrosoft.com/B2C_1A_signup_signinAAD",
            validateAuthority: false
        },
        cache: {
            cacheLocation: "sessionStorage",
            storeAuthStateInCookie: true
        }

    };

    var loginRequest = {
        scopes: ["email", "openid", "offline_access"] // optional Array<string>
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

        init: function () {
            var self = this;

            W.msalInstance = new Msal.UserAgentApplication(msalConfig);

            W.msalInstance.handleRedirectCallback((error, response) => {
                debugger;
                // handle redirect response or error
            });

            W.getApiToken = function () {

                // if the user is already logged in you can acquire a token
                if (W.msalInstance.getAccount()) {

                    var tokenRequest = {
                        scopes: ["openid", "https://isvcanvas.onmicrosoft.com/isvcanvasapisocial/Survey.Save"] // optional Array<string>
                        //scopes: ["https://isvcanvas.onmicrosoft.com/isvcanvasapi/Read", "https://isvcanvas.onmicrosoft.com/isvcanvasapi/Save"], // optional Array<string>
                    };



                    return W.msalInstance
                        .acquireTokenSilent(tokenRequest)
                        .then((response) => {
                            // get access token from response
                            // response.accessToken
                            return "Bearer " + response.accessToken;
                        })
                        .catch((err) => {
                            // could also check if err instance of InteractionRequiredAuthError if you can import the class.
                            if (err.name === "InteractionRequiredAuthError") {
                                return W.msalInstance
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
            };

            switch (self.options.action) {
                case "login":
                    self.login();
                    break;
                case "signout":
                    self.signOut();
                    break;
            }
        },

        login: function () {
            var self = this;

            W.msalInstance.loginPopup(loginRequest).then((response) => {
                var acc = response.account;
                var type = "per";
                var idp = acc.idToken.idp.replace("https://", "");

                idp = idp.split('/')[0];
                switch (idp) {
                    case "login.microsoftonline.com":
                        type = "org";
                        break;
                    default:
                        type = "per";
                        break;
                }

                self.$element.trigger("ssr.loggedin", {
                    type: type,
                    name: acc.idToken.name,
                    email: acc.idToken.emails ? acc.idToken.emails[0] : acc.idToken.email
                });
            })
            .catch((err) => {
                console.log(err);
                // handle error
            });
        },

        signOut: function () {
            const config = {
                auth: {
                    clientId: msalConfig.auth.clientId,
                    redirectUri: W.location.href,
                    postLogoutRedirectUri: W.location.href 
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