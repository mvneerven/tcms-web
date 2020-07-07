class Survey {
    constructor(C, elm) {

        let self = this;
        let debug = window.location.hostname == "localhost";
        let url = debug ? "http://localhost:8080" : C(".survey-cta").attr("href");

        self.start = () => {            
            elm.addClass("iframe-container").html('<iframe allow-transparency="true" src="' + url + '"></iframe>');
        }

        self.stop = () => {
            window.location.refresh();
        }

        C(window).on("load hashchange", (e) =>{

            if(window.location.hash === "#/survey"){
                self.start();
            }
        });
    }
}

