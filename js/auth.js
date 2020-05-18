//import * as Msal from "msal";
// if using cdn version, 'Msal' will be available in the global scope

(function ($, W, D, undefined) {
  const msalConfig = {
    auth: {
      clientId: "59d19f8c-9524-4667-be2c-b9406dba21c8",
    },
  };

  const msalInstance = new Msal.UserAgentApplication(msalConfig);
  W.msalInstance = msalInstance;

  msalInstance.handleRedirectCallback((error, response) => {
    // handle redirect response or error
  });

  var loginRequest = {
    scopes: ["Read","Save"], // optional Array<string>
  };
  $("#login").on("click", (e) => {
    msalInstance
      .loginPopup(loginRequest)
      .then((response) => {
        console.log(response);
        $("#user").text(response.account.userName);
        $("#login").hide();
        // handle response
      })
      .catch((err) => {
        // handle error
      });
  });
  $("#token").on("click", (e) => {
    getApiToken().then((el) => {
      $("#tokenvalue").text(el);
    });
  });
})(jQuery, window, document);

function getApiToken() {
  // if the user is already logged in you can acquire a token
  if (window.msalInstance.getAccount()) {
    var tokenRequest = {
     scopes: ["Read","Save"],
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
}
