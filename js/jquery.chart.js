/*
    jquery.chart
*/
;
(function ($, W, D, undefined) {
    'use strict';
    var pluginName = "chart",
	defaults = {
	    selector: ".chart",
        type: "circular",
        value: 100,
        title: "Percentage"
    };

    //const colors = ["#CB6731", "#888","#EABD5D", "#CB5B5A", "#AC557A", "#8D4C7D", "#6B406E", "#40324F"];
    
    const circularChartTemplate = '<div class="flex-wrapper #outerClass#">'+
            '<div class="single-chart #innerClass#">'+
                '<svg viewBox="0 0 36 36" class="circular-chart">'+
                    '<path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /> '+
                    '<path class="circle" style="fill: #fill#; stroke: #color#" stroke-dasharray="###, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />'+
                    '<text x="18" y="20.35" class="percentage">###%</text> '+
                '</svg>'+
                '<p>title</p>'+
            '</div>'+
        '</div>';

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
            switch(self.options.type){
                case "circular":
                    self.showCircularChart();
                    break;
            }
        },

        showCircularChart: function(){
            var div = this.$element;
            var entry = circularChartTemplate
                .replace(/###/g, this.options.value.toString())
                .replace(/\btitle\b/g, this.options.title)
                .replace('#outerClass#', this.options.outerClass)
                .replace('#innerClass#', this.options.innerClass)
                .replace("#fill#", this.options.fillColor)
                .replace('#color#' , this.options.color);
            div.get(0).outerHTML= entry;
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

})(jQuery, window, document);
