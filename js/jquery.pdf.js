/*
    jquery.pdf.js

    Late-loads canvg.js, html2canvas.js and jspdf.js to output PDF of given element.
*/
;
(function ($, W, D, undefined) {
    'use strict';
    var pluginName = "pdf",
	defaults = {
	    selector: ".pdf",
        mode: "portrait",
        paperSize: "a4"
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
            
            $.when(
                $.getScript("https://cdn.jsdelivr.net/npm/canvg/dist/browser/canvg.min.js"),
                $.getScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/0.5.0-beta4/html2canvas.min.js"), 
                $.getScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/1.0.272/jspdf.min.js"), 
                $.getScript("https://cdnjs.cloudflare.com/ajax/libs/canvg/1.4/rgbcolor.min.js")

            ).done(function(){
                self.render(self);
            });
        },
        
        render: function(self){
            
            var doc = new jsPDF(self.options.mode, 'pt', self.options.paperSize, true);    
            var elementHandler = {    
                '#ignorePDF': function(element, renderer) {    
                    return true;    
                }    
            };    
            
            var source = self.element;    
            doc.fromHTML(source, 15, 15, {    
                'width': 560,    
                'elementHandlers': elementHandler    
            });    
            
            var svg = document.querySelector('svg');    
            var canvas = document.createElement('canvas');    
            var canvasIE = document.createElement('canvas');    
            var context = canvas.getContext('2d');    
            
            var data = (new XMLSerializer()).serializeToString(svg);    
            canvg(canvas, data);    
            var svgBlob = new Blob([data], {    
                type: 'image/svg+xml;charset=utf-8'    
            });    
            
            var url = canvas.toDataURL(svgBlob);//DOMURL.createObjectURL(svgBlob);    
            
            // TODO: convert into handler for ALL svg elements
            var img = new Image();    
            img.onload = function() {    
                context.canvas.width = $('.single-chart').find('svg').width();;    
                context.canvas.height = $('.single-chart').find('svg').height();;    
                context.drawImage(img, 0, 0);    
                // freeing up the memory as image is drawn to canvas    
                //DOMURL.revokeObjectURL(url);    
            
                var dataUrl = canvas.toDataURL('image/jpeg');    
                
                doc.addImage(dataUrl, 'JPEG', 20, 365, 560, 350); // 365 is top     
            
                var bottomContent = document.getElementById("bottom-content");    
                doc.fromHTML(bottomContent, 15, 750, {   //700 is bottom content top  if you increate this then you should increase above 365    
                    'width': 560,    
                    'elementHandlers': elementHandler    
                });    
            
                setTimeout(function() {    
                    doc.save('HTML-To-PDF-Dvlpby-Bhavdip.pdf');    
                }, 2000);    
            };    
            img.src = url;    
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

