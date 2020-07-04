class Menu {
  constructor(C, elm) {
    this.elm = elm;
    elm.tooltip("Go to ISV Canvas homepage").on("click", (e) => {
      if (C(e.target).is("nav")) {
        window.location.href = "/";
      }
    });

    this.C = C;

    const tpl = `<div class="menu-wrap">
        <input type="checkbox" class="toggler" title="Open menu">
        <div class="hamburger" ><div></div></div>
        <div class="menu">
          <div>
            <div>
              <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/about.html">About</a></li>
                <li><a href="/survey.html">Survey</a></li>
                <li><a href="mailto:info@isvcanvas.com?subject=ISV%20Canvas">Contact</a></li>
                <li><a href="#sign-out">Sign out</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>`;

    var self = this;
    C.require("/js/c-plugins/menu.css", function () {
      self.build(tpl)
    });
  }

  build(tpl) {
    var loc = window.location.pathname;

    this.elm.html(tpl).addClass("cp-menu").find("a").each((el) => { 
      var path = el.href.replace(window.location.origin, "");
      if (path === loc) {
        this.C(el).up("li").addClass("menu-item-active").find("a").on("click", (e) => {
          this.toggle();
          e.returnValue = false;
          e.cancelBubble = true;
          return false;
        });
      }
    });

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