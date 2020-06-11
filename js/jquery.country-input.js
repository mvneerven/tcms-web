/*
    jquery.country-input
*/
;
(function ($, W, D, undefined) {
    'use strict';
    var pluginName = "country-input",
	defaults = {
	    title: ''
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
        }
    };

    $.fn[pluginName] = function (options) {
        return this.each(function () {
            if (typeof (options) === 'string') {
                var data = $.data(this, "ssr.plugin." + pluginName);
                if (data && $.isFunction(data[options])){
                    data[options]();
                }
            }
            else {
                $.data(this, "ssr.plugin." + pluginName, new Plugin(this, options));
            }
        });
    };

    $(function(){
        $("input[type=country]").css({border: "1px solid red"});

    })

})(jQuery, window, document);
