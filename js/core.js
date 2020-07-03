/*
    CoreJS - Extremely compact basic JS lib, inspired by other frameworks
*/
; (function (W, D, undefined) {
    'use strict';
    const _noop = function () { }, _st = setTimeout, _isF = (f) => { return typeof (f) === "function" };
    var _log = _noop;

    W.core = (function () {
        var k = (selector, context) => {
            return new k.fn.init(selector, context);
        };
        k.data = _noop;
        k.src = {};
        k.debug = D.location.hostname == "localhost";
        if (k.debug) {
            _log = (...args) => { console.log(...args) }
        }
        k.prototype = {
            _data: {},

            _do: function (name, opts) {
                opts = opts || {};
                var self = this, _args = arguments, ret = null,
                    a = function (e) {
                        Array.prototype.unshift.call(_args, e);
                        return name.bind(e).apply(k, _args);
                    };

                if (opts.index != undefined) {
                    return k(this.sel[opts.index]);
                }
                else {
                    if (this.sel == undefined) {
                        this.sel = this._gN();
                    }
                    else if (this.sel.length == undefined) {
                        this.sel = this._gN(this.sel);
                    }
                    Array.prototype.forEach.call(this.sel, a);
                }
                return this;
            },

            _gS: function (getF, setF, n, v, d) {
                if (v !== undefined) {
                    return this._do(function (el) {
                        setF(el, n, v);
                    });
                }
                var h;
                this._do(function (el) {
                    h = getF(el, n);
                });
                return h || d;
            },

            _gN: (function () { // https://stackoverflow.com/questions/13351966/create-node-list-from-a-single-node-in-javascript
                var nodelist = D.createDocumentFragment().childNodes;
                return (node) => {
                    if (node == undefined) {
                        return Object.create(nodelist, {
                            'length': { value: 0 },
                            'item': {
                                "value": function (i) {
                                    return this[+i || 0];
                                },
                                enumerable: true
                            }
                        });
                    }
                    else if (node.toString() == "[object NodeList]") {
                        return node;
                    }
                    else {
                        return Object.create(nodelist, {
                            '0': { value: node, enumerable: true },
                            'length': { value: 1 },
                            'item': {
                                "value": function (i) {
                                    return this[+i || 0];
                                },
                                enumerable: true
                            }
                        });
                    }
                };
            }()),

            init: function (selector, context) {
                this.length = 0;
                if (!selector)
                    return this;

                if (_isF(selector)) {
                    k.ready(selector);
                }
                else {
                    this.context = context;
                    if (typeof (selector) == "object") {
                        this.sel = this._gN(selector);
                    }
                    else if (selector.indexOf('<') !== -1) {
                        let parser = new DOMParser(),
                            doc = parser.parseFromString(selector, 'text/html');
                        this.sel = doc.body.firstChild;
                    }
                    else {
                        if (context != undefined) {
                            if (context.toString() == "[object NodeList]") {
                                context = context[0];
                            }
                        }
                        this.sel = (context || D).querySelectorAll(selector, context);
                    }
                }
                if (this.sel && this.sel.length)
                    this.length = this.sel.length;
            },


            data: function (n, v) {
                return this._gS(
                    (el) => { return this._data[n] },
                    (el) => { this._data[n] = v },
                    n, v, ""
                )
            },

            html: function (t) {
                return this._do((el) => { el.innerHTML = t; })
            },

            text: function (v) {
                return this._gS(
                    (el) => { return el.innerText },
                    (el) => { el.innerText = v; el.text = v },
                    undefined, v, ""
                )
            },

            attr: function (n, v) {
                return this._gS(
                    (el) => { return el.getAttribute(n) },
                    (el) => { el.setAttribute(n, v) },
                    n, v, ""
                )
            },

            prop: function (n, v) {
                return this._gS(
                    (el) => { return el[n] },
                    (el) => { el[n] = v }
                )
            },

            val: function (v) {
                return this._gS(
                    (el) => { return el.value },
                    (el) => { el.value = v }
                    , undefined, v, ""
                )
            },

            removeAttr: function (n) {
                return this._do((el) => { el.removeAttribute(n) });
            },

            addClass: function (n) {
                n = (n || "").trim().split(" ");
                return this._do((el) => { for (var c in n) { el.classList.add(n[c]); } })
            },

            removeClass: function (n) {
                return this._do((el) => { el.classList.remove(n) })
            },

            hasClass: function (n) {
                var h = false;
                this._do((el) => { h = el.classList.contains(n) });
                return h;
            },

            remove: function () {
                return this._do((el) => { el.remove(); })
            },

            show: function () {
                return this._do((el) => { el.style.display = 'block' });
            },

            hide: function () {
                return this._do((el) => { el.style.display = 'none' });
            },

            fadeIn: function () {
                return this.removeClass("c-hide").addClass('c-show');
            },

            fadeOut: function () {
                return this.removeClass("c-show").addClass('c-hide');
            },

            each: function (f) { return this._do(f) },

            is: function (selector) {
                var m = false;
                this._do((el) => {
                    if (el.matches(selector))
                        m = true;
                })
                return m;
            },

            shown: function () {
                var v = false;
                return this._do((el) => {
                    if (el.offsetWidth > 0 || el.offsetHeight > 0)
                        v = true;
                });
                return v;
            },

            get: function (x) {
                var el = this._do(_noop, { index: x });
                return el.sel[0];
            },

            scrollTo: function () {
                return this._do((el) => { el.scrollIntoView() })
            },

            trigger: function (type, x) {
                return this._do((el) => {
                    let ev = new CustomEvent(type, { detail: x });
                    el.dispatchEvent(ev);
                })
            },

            on: function (s, f, once) {
                return this._do((el) => {
                    s.trim().split(' ').forEach((name) => {
                        el.addEventListener(name, f, { once: once != undefined ? once : false })
                    })
                })
            },

            one: function (name, f) {
                return this.on(name, f, true);
            },

            block: function (on) {
                if (on === undefined) on = true;
                const c = "disabled";
                return this._do((el) => {
                    if (on) {
                        el.classList.add(c);
                        el.setAttribute(c, c);
                    }
                    else {
                        el.classList.remove(c);
                        el.removeAttribute(c, c);
                    }
                });
            },

            tooltip: function (v) {
                return this.attr("title", v);
            },

            select: function (hEl) {
                return this.k(hEl);
            },

            find: function (s) {
                var els;
                this._do((el) => { els = el.querySelectorAll(s) });
                return k(els);
            },

            up: function (s, fromParent) {
                var els;
                this._do((el) => { els = fromParent ? el.parentNode.closest(s) : el.closest(s) });
                return k(els);
            },

            style: function (css) {
                css = css || {};
                return this._do((el) => { for (var s in css) { el.style = s + ":" + css[s] } });
            },

            toggleClass: function (c) {
                return this._do((el) => { el.classList.toggle(c) });
            },

            getPlugin: function (name) {
                return this.data("c-plugin-" + name);
            },

            put: function (p, r) {
                var f = _noop;
                r = (r && r.sel) ? r = r.sel[0] : k(r).sel[0]; // get reference node
                switch (p) {
                    case "after":
                        f = (el) => { r.parentNode.insertBefore(el, r.nextSibling) }
                        break;
                    case "before":
                        f = (el) => { r.parentNode.insertBefore(el, r) }
                        break;
                    case "append":
                        f = (el) => { r.appendChild(el) }
                        break;
                    case "prepend":
                        f = (el) => { r.insertBefore(el, r.firstChild) }
                        break;
                }
                return this._do(f);
            }
        };

        k.fn = k.prototype;
        k.extend = k.fn.extend = function () {
            var e, t, n, r, i, o, a = arguments[0] || {}, s = 1, u = arguments.length, l = !1;
            for ("boolean" == typeof a && (l = a,
                a = arguments[s] || {},
                s++),
                "object" == typeof a || m(a) || (a = {}),
                s === u && (a = this,
                    s--); s < u; s++)
                if (null != (e = arguments[s]))
                    for (t in e)
                        r = e[t],
                            "__proto__" !== t && a !== r && (l && r && (k.isPlainObject(r) || (i = Array.isArray(r))) ? (n = a[t],
                                o = i && !Array.isArray(n) ? [] : i || k.isPlainObject(n) ? n : {},
                                i = !1,
                                a[t] = k.extend(l, o, r)) : void 0 !== r && (a[t] = r));
            return a
        };

        k.extend({
            c2d: function (s) {
                return s.replace(/[A-Z]/g, m => "-" + m.toLowerCase()).substr(1);
            },
            ready: function (fn) {
                if (D.readyState === "complete" || D.readyState === "interactive") {
                    _st(fn, 1);
                } else {
                    D.addEventListener("DOMContentLoaded", fn);
                }
            },

            req: function (o) {
                var opts = k.extend({
                    method: 'GET',
                    contentType: "application/json",
                    dataType: "json",
                    responseType: 'text',
                    timeout: null,
                    headers: [],
                    success: _noop,
                }, o), parse = function (r) {
                    var result;
                    if (opts.responseType !== 'text' && opts.responseType !== '') {
                        return { data: r.response, xhr: r };
                    }
                    try {
                        result = JSON.parse(r.responseText);
                    } catch (e) {
                        result = r.responseText;
                    }
                    return { data: result, xhr: r };
                };

                if (opts.data) opts.method = 'POST';

                var request = new XMLHttpRequest(), // Create the XHR request
                    xhrP = new Promise((resolve, reject) => { // Return it as a Promise
                        request.onreadystatechange = function () { // Setup our listener to process compeleted requests
                            if (request.readyState !== 4) return; // Only run if the request is complete
                            if (!request.status) return; // Prevent timeout errors from being processed
                            if (request.status >= 200 && request.status < 300) { // Process the response
                                var obj = parse(request); // If successful
                                opts.success(obj);
                                resolve(obj);
                            } else {
                                reject({ // If failed
                                    status: request.status,
                                    statusText: request.statusText,
                                    responseText: request.responseText
                                });
                            }
                        };
                        request.open(opts.method || 'GET', opts.url, true); // Setup our HTTP request
                        request.responseType = opts.responseType;

                        for (var header in opts.headers) {
                            if (opts.headers.hasOwnProperty(header)) {
                                request.setRequestHeader(header, opts.headers[header]);
                            }
                        }
                        if (opts.timeout) {
                            request.timeout = opts.timeout;
                            request.ontimeout = function (e) {
                                reject({
                                    status: 408,
                                    statusText: 'Request timeout'
                                });
                            };
                        }

                        request.send(opts.data);

                    });

                xhrP.cancel = function () {
                    request.abort();
                };
                return xhrP;
            },

            uid: function () {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            },

            get: function (url, f) {
                return this.req({
                    method: "GET",
                    contentType: "application/json",
                    dataType: "json",
                    url: url
                }).then(f)
            },

            log: function (...args) {
                this._log(...args)
            },

            dlg: function (o) {
                if (o == undefined) {
                    k(".c-dlg").remove();
                    return;
                }
                o = k.extend({
                    modal: true,
                    body: "",
                    title: "Dialog",
                    cancelVisible: false,
                    confirmText: "OK",
                    cancelText: "Cancel",
                    confirm: _noop,
                    cancel: _noop,
                    hide: _noop,
                    id: "dlg-" + k.uid()
                }, o);

                const mdl = `<div class="c-dlg" role="dialog">
                     <div class="c-dlg-c">
                      <div class="c-dlg-h">
                       <div class="c-dlg-t">{0}<button type="button" class="dlg-bc dlg-x dismiss" ><span>&times;</span></button></div>
                      </div>
                     <div class="c-dlg-b">{1}</div>
                     <div class="c-dlg-f">
                      <button type="button" class="dlg-x btn btn-default dismiss" >{2}</button>
                      <button type="button" class="dlg-x btn btn-primary confirm" >{3}</button>
                     </div>
                     </div>
                    </div>`;
                var m = this(
                    mdl.replace('{0}', o.title).replace("{1}", o.body).replace("{2}", o.cancelText).replace("{3}", o.confirmText)
                ).attr("id", o.id).addClass(o.cancelVisible ? "dlg-cv" : "dlg-ch");

                const c = function (e, confirm) {
                    k("#" + o.id).remove();
                    W.location.hash = "na";
                    var b = k(e.target);
                    if (confirm || b.hasClass("confirm")) {
                        o.confirm.apply(this);
                    }
                    else {
                        o.cancel.apply(this);
                    }
                    o.hide.apply(this);
                };

                m.put("append", "body").find(".dlg-x").on("click", c);
                k("body").one("keydown", function (e) {
                    if (e.keyCode === 27) c(e);
                    if (e.keyCode === 13) c(e, true);
                });

                if (!o.modal)
                    _st(function () { k("body").one("click", c) }, 10)

                W.location.hash = o.id;
            },

            // Require script or stylesheet
            require: function (src, c) {
                var attr, tag, ext = src.split('.'), cSrc = src;
                if (!cSrc.startsWith('/')) cSrc = "/" + cSrc;

                ext = ext[ext.length - 1].toLowerCase();
                if (ext === "css") {
                    attr = "href";
                    tag = "link"
                }
                else {
                    attr = "src";
                    tag = "script"
                }

                var f = function (s) {
                    if (s && s.target) {
                        k.src[cSrc] = 1;
                    }

                    if (_isF(c)) c.apply();

                }, ex = k(tag + '[' + attr + '="' + src + '"]');

                if (!ex.sel || ex.sel.length === 0) {
                    let elm = D.createElement(tag);
                    elm.onload = f
                    elm[attr] = src;
                    if (tag === "link") elm["rel"] = "stylesheet";
                    k.src[cSrc] = 0;
                    k(elm).put("append", "head");
                }
                else {
                    var wait = function () {
                        k.src[cSrc] === 1 ? f() : _st(wait, 10);
                    }
                    _st(wait, 10);
                }
            },

            instantiate: function (name, ...a) {
                var c = eval(name);
                return new c(...a);
            }
        });

        k.ready(() => {

            k.require("/css/core.css");

            k("[data-c-plugin]").each(function (e) { // add plugins
                var ce = k(e);
                ce.attr("data-c-plugin").trim().split(' ').forEach((name) => {
                    var url = "/js/c-plugins/" + k.c2d(name) + ".js";
                    k.require(url, function (obj) {
                        ce.data("c-plugin-" + name, k.instantiate(name, k, ce));
                    });
                })
            })
        });

        k.fn.init.prototype = k.fn;
        return k;
    })();

})(window, document);
