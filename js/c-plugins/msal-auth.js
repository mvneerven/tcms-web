class MsalAuth {
    constructor( C, elm) {
        var self = this,
            C = window.core;

        C.require("https://alcdn.msftauth.net/lib/1.3.1/js/msal.min.js", () => {
            self.msalConfig = {
                auth: {
                    clientId: "f2d88ec2-9d1d-4f25-a1ce-c9e1b2d395c9",
                    authority: "https://isvcanvas.b2clogin.com/isvcanvas.onmicrosoft.com/B2C_1A_signup_signinAAD",
                    validateAuthority: false
                },
                cache: {
                    cacheLocation: "sessionStorage",
                    storeAuthStateInCookie: true
                }
            }

            self.loginRequest = {
                scopes: ["email", "openid", "offline_access"] // optional Array<string>
            };

            console.log(this.msalConfig);

            self.msalInstance = new Msal.UserAgentApplication(this.msalConfig);

            self.msalInstance.handleRedirectCallback((error, response) => {
                debugger;
                // handle redirect response or error
            });

            self.login = function () {
                var self = this;

                self.msalInstance.loginPopup(self.loginRequest).then((response) => {
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

                    //console.log(acc);
                    elm.trigger("loggedin", {
                        type: type,
                        name: acc.idToken.name,
                        email: acc.idToken.emails ? acc.idToken.emails[0] : acc.idToken.email
                    });
                    
                }).catch((err) => {
                    console.log(err);
                    // handle error
                });
            }

            self.getApiToken = function () {
                // if the user is already logged in you can acquire a token
                if (self.msalInstance.getAccount()) {

                    var tokenRequest = {
                        scopes: ["openid", "https://isvcanvas.onmicrosoft.com/isvcanvasapisocial/Survey.Save"] // optional Array<string>
                        //scopes: ["https://isvcanvas.onmicrosoft.com/isvcanvasapi/Read", "https://isvcanvas.onmicrosoft.com/isvcanvasapi/Save"], // optional Array<string>
                    };
                    return self.msalInstance
                        .acquireTokenSilent(tokenRequest)
                        .then((response) => {
                            // get access token from response
                            // response.accessToken
                            return "Bearer " + response.accessToken;
                        })
                        .catch((err) => {
                            // could also check if err instance of InteractionRequiredAuthError if you can import the class.
                            if (err.name === "InteractionRequiredAuthError") {
                                return self.msalInstance
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

            self.signOut = function () {
                window.location.hash = "";

                const config = {
                    auth: {
                        clientId: self.msalConfig.auth.clientId,
                        redirectUri: window.location.href,
                        postLogoutRedirectUri: window.location.href 
                    }
                }
                const userAgentApplication = new Msal.UserAgentApplication(config);
                userAgentApplication.logout();
            }

            if(elm.attr("data-msal-login") === "auto"){
                self.login();
            }
            
        });
    }
}