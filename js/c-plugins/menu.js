class Menu {
  constructor(C, elm) {
    var self = this;
    this.elm = elm;
    this.C = C;

    elm.tooltip("Go to ISV Canvas homepage").on("click", (e) => {
      if (C(e.target).is("nav")) {
        window.location.href = "/";
      }
    });

    const tpl = `<div class="menu-wrap">
        <input type="checkbox" class="toggler" title="Open menu">
        <div class="hamburger" ><div></div></div>
        <div class="menu">
          <div>
            <div>
              <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/about.html">About</a></li>
                <li><a href="/#/survey">Survey</a></li>
                <li><a href="mailto:info@isvcanvas.com?subject=ISV%20Canvas">Contact</a></li>
                <li><a href="#sign-out">Sign out</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>`;


    C.require("/js/c-plugins/menu.css", function () {
      self.build(tpl);
    });
    
  }

  build(tpl) {
    let self = this;

    this.elm.html(tpl).on("click", (e) => {
      if (self.C(e.target).is(".menu a")) {
        setTimeout(self.toggle(), 10);
      }
    })

    this.C(document).on("keydown", (e) => {
      if (e.keyCode === 27 && this.elm.find(".menu-wrap .toggler").is(":checked")) {
        this.toggle();
      }
    });

    this.toggler = this.elm.find(".toggler");
  }

  toggle() {
    this.toggler.get(0).click();
  }
}