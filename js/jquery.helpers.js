/*
    jquery.chart
*/
;
(function ($, W, D, undefined) {
    'use strict';
    var pluginName = "dialog",
	defaults = {
	    title: 'Modal title',
        message: 'One fine body&hellip;',
        confirm: 'OK',
        dismiss: 'Cancel',
        confirmVisible: true,
        dismissVisible: true,
    };

    //const colors = ["#CB6731", "#888","#EABD5D", "#CB5B5A", "#AC557A", "#8D4C7D", "#6B406E", "#40324F"];
    
    const dlgTpl = '<div class="modal fade" id="confirm" tabindex="-1" role="dialog" aria-labelledby="confirm-label" aria-hidden="true">' +
        '<div class="modal-dialog modal-sm">' +
            '<div class="modal-content">' +
                '<div class="modal-header">' +
                    
                    '<h4 class="modal-title" id="confirm-label"></h4>' +
                    '<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<p class="message"></p>' +
                '</div>' +
                '<div class="modal-footer">' +
                    '<button type="button" class="btn btn-default dismiss" data-dismiss="modal"></button>' +
                    '<button type="button" class="btn btn-primary confirm" data-dismiss="modal"></button>' +
                '</div>' +
            '</div>' +
        '</div>' +
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
            var elm = $(dlgTpl);
            $('.modal-title', elm).html(this.options.title);
            $('.message', elm).html(this.options.message);
            $('.confirm', elm).html(this.options.confirm)[self.options.confirmVisible ? "show" : "hide"]();
            $('.dismiss', elm).html(this.options.dismiss)[self.options.dismissVisible ? "show" : "hide"]();

            elm.on('click', '.confirm', function (event) {
                elm.data('confirm', true);
            }).on("keypress", function(e){
                if(e.keyCode == 13){
                    elm.data('confirm', true);
                    elm.modal('hide');
                }
            });

            elm.on('hide.bs.modal', function (event) {
                self.$element.trigger("hide");
                if (elm.data('confirm')) {
                    elm.removeData('confirm');
                    elm.trigger('confirm', event);
                } else {
                    elm.trigger('dismiss', event);
                }

                elm.off('confirm dismiss');
            });
            elm.modal('show');
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
