/*
    jquery.survey - Adapted from https://github.com/egbertbouman/survey.js
*/
;
(function ($, W, D, undefined) {
    'use strict';

    var pluginName = "survey",
        defaults = {
            selector: ".survey-container",
            getData: $.noop,
            questions: undefined,
            firstQuestionDisplayed: -1,
            lastQuestionDisplayed: -1,
            src: null,
            finish: $.noop
        };

    function Plugin(element, options) {
        var self = this;
        self.element = element;
        self.$element = $(element);
        self.options = $.extend({}, defaults, options);
        self._defaults = defaults;
        self._name = pluginName;
        self.tmr = null;
        self.interval = 100;
        self.curGroup = null;
        self.debug = D.location.hostname == "localhost";

        var src = self.$element.attr(self.debug ? "data-src-dbg" : "data-src") || self.options.src;
        
        if (src) {
            $.getJSON(src, function (json) {
                self.options.questions = convertToSurvey(json);
                self.init();
            });
        }
        else {
            this.init();
        }
    }

    Plugin.prototype = {

        init: function () {
            var self = this;

            W.addEventListener('beforeunload', (event) => {
                if (!self.completed)
                    event.returnValue = "Are you sure you want to leave?";
            });


            self.cycle = 0;
            self.$element.addClass("survey-container");
            self.addButtons();

            self.questions = self.options.questions;
            var qIx = 0;

            self.questions.forEach(function (question) {
                qIx++;
                question.id = qIx.toString();
                self.generateQuestionElement(question);
            });

            $('.survey-container input').click(function (e) {
                $(e.target).closest(".missing").removeClass("missing").closest(".question").find('> .required-message').hide();
            });

            $('#backBtn').click(function () {
                if (!$('#backBtn').hasClass('disabled')) {
                    self.showPreviousQuestionSet();
                    $('.survey-container').show();
                }
            });

            $('#nextBtn').click(function () {
                var ok = true;
                var numUnanwered = 0;
                for (var i = self.options.firstQuestionDisplayed; i <= self.options.lastQuestionDisplayed; i++) {
                    if (!self.getQuestionAnswer(self.questions[i])) {
                        numUnanwered++;
                        if (self.questions[i]['required'] === true) {
                            var ans = $('.survey-container > div.question:nth-child(' + (i + 1) + ')');
                            ans.find(".answer").addClass("missing");
                            ans.find('> .required-message').show().get(0).scrollIntoView();
                            ok = false;
                        }
                    }
                }
                if (!ok)
                    return;

                var next = function () {

                    if ($('#nextBtn').text().indexOf('Continue') === 0) {
                        self.showNextQuestionSet();
                    }
                    else {
                        self.completed = true;
                        self.options.finish(self);
                    }
                }

                if (numUnanwered) {

                    $("body").dialog({
                        title: "Survey",
                        message: "Are you sure you want to skip " + numUnanwered + " question" + (numUnanwered == 1 ? "" : "s") + " in " + $("#survey").find(".question:visible h2:first").text() + "?"
                    }).one({
                        confirm: function () {
                            next();
                            
                        }
                    });
                }
                else
                    next();
            });
            this.showNextQuestionSet();
        },

        addButtons: function () {
            var self = this;
            self.toolbar = $('<div class="survey-toolbar"><div class="btn-group"><a id="backBtn" href="#" class="button btn btn-default">« Back</a><a id="nextBtn" href="#" class="button btn btn-primary">Continue »</a></div><span class="survey-progress"></span></div>');
            var tb = self.$element.attr("data-toolbar");
            if (self.toolbar) {
                self.toolbar.appendTo($(tb));
            }
            else {
                self.toolbar.insertAfter(self.$element);
            }
        },

        destroy: function () {
            $.removeData(this.element, "ssr.plugin." + pluginName);
        },

        getQuestionAnswer: function (question) {
            var self = this;
            var result;

            if (question.type === 'single-select') {
                result = $('input[type="radio"][name="' + question.id + '"]:checked').val();
            }
            else if (question.type === 'multi-select') {
                var values = new Array();
                $.each($('input[type="checkbox"][name="' + question.id + '"]:checked'), function () {
                    values.push($(this).val());
                });
                result = values;
            }
            else if (question.type === 'single-select-oneline') {
                result = $('input[type="radio"][name="' + question.id + '"]:checked').val();
            }
            else if (question.type === 'text-field-small') {
                result = $('input[name=' + question.id + ']').val();
            }
            else if (question.type === 'email') {
                result = $('input[name=' + question.id + ']').val();
            }
            else if (question.type === 'text-field-large') {
                result = $('textarea[name=' + question.id + ']').val();
            }
            return result ? result : undefined;
        },

        getOption: function (option) {
            option = option.replace(/\s/g, " ");
            var tooltip = "";
            var p = option.indexOf('[');
            if (p != -1) {
                var q = option.indexOf(']', p + 1);
                if (q != -1) {
                    tooltip = option.substr(p + 1, q - (p + 1));
                    option = option.substr(0, p - 1);
                }
            }

            return { title: option, tooltip: tooltip };
        },

        generateQuestionElement: function (question) {
            var self = this;
            var questionElement = $('<div id="' + question.id + '" class="question"></div>');

            var questionTextElement = $('<div class="question-text"></div>');
            var questionAnswerElement = $('<div class="answer"></div>');
            var questionCommentElement = $('<div class="comment"></div>');


            questionElement.appendTo($('.survey-container'));
            questionElement.append(questionTextElement);
            questionElement.append(questionCommentElement);
            questionElement.append(questionAnswerElement);

            questionTextElement.html(question.text.replace(/\s/g, " "));

            questionCommentElement.html(question.comment);
            if (question.type === 'single-select') {
                questionElement.addClass('single-select');
                var i = 0;
                question.options.forEach(function (option) {
                    var opt = self.getOption(option);
                    var label = $('<label class="radio"><input type="radio" value="' + i + '" name="' + question.id + '"/><span>' + opt.title + '</span></label>');
                    if (question.inline) label.addClass("inline col-xs-10, col-sm-4");
                    label.attr("title", opt.tooltip);
                    questionAnswerElement.append(label);
                    i++;
                });
            }
            else if (question.type === 'multi-select') {
                questionElement.addClass('multi-select');
                var i = 0;
                question.options.forEach(function (option) {
                    var opt = self.getOption(option);
                    var label = $('<label class="radio"><input type="checkbox" value="' + i + '" name="' + question.id + '"/><span>' + opt.title + '</span></label>');
                    label.attr("title", opt.tooltip);
                    if (question.inline) label.addClass("inline col-xs-10, col-4");
                    questionAnswerElement.append(label);
                    i++;
                });

                questionCommentElement.html("Multiple answers possible");

            }
            else if (question.type === 'single-select-oneline') {
                questionElement.addClass('single-select-oneline');
                var html = '<table border="0" cellpadding="5" cellspacing="0"><tr><td></td>';
                question.options.forEach(function (label) {
                    html += '<td><label>' + label + '</label></td>';
                });
                html += '<td></td></tr><tr><td><div>' + question.labels[0] + '</div></td>';
                question.options.forEach(function (label) {
                    html += '<td><div><input type="radio" value="' + label + '" name="' + question.id + '"></div></td>';
                });
                html += '<td><div>' + question.labels[1] + '</div></td></tr></table>';
                questionAnswerElement.append(html);
            }
            else if (question.type === 'text-field-small') {
                questionElement.addClass('text-field-small');
                questionAnswerElement.append('<input type="text" value="" class="text form-control" name="' + question.id + '">');
            }
            else if (question.type === 'email') {
                questionElement.addClass('text-field-email');
                questionAnswerElement.append('<input type="email" value="" class="text form-control" name="' + question.id + '">');
            }
            else if (question.type === 'text-field-large') {
                questionElement.addClass('text-field-large');
                questionAnswerElement.append('<textarea rows="8" cols="0" class="text form-control" name="' + question.id + '">');
            }
            if (question.required === true) {
                var last = questionTextElement.find(':last');
                (last.length ? last : questionTextElement).append('<span class="required-asterisk" aria-hidden="true">*</span>');
            }
            questionAnswerElement.after('<div class="required-message">This is a required question</div>');
            questionElement.hide();

            if (question.group && question.group != self.curGroup) {
                self.curGroup = question.group;
                var headerElement = $('<h2>' + question.group + '</h2>');
                questionElement.prepend(headerElement);
            }
        },

        hideAllQuestions: function () {
            var self = this;
            $('.question:visible').each(function (index, element) {
                $(element).hide();
            });
            $('.required-message').each(function (index, element) {
                $(element).hide();
            });
        },

        setPercentage: function(){
            var self = this;
            var pct = Math.round(self.options.firstQuestionDisplayed / self.options.questions.length * 100.0, 0);
            self.$element.trigger("ssr.progress", [ pct ]);            
        },

        showNextQuestionSet: function () {
            var self = this;
            self.hideAllQuestions();
            self.options.firstQuestionDisplayed = self.options.lastQuestionDisplayed + 1;

            do {
                self.options.lastQuestionDisplayed++;
                $('.survey-container > div.question:nth-child(' + (self.options.lastQuestionDisplayed + 1) + ')').show();
                if (self.questions[self.options.lastQuestionDisplayed]['break_after'] === true)
                    break;
            } while (self.options.lastQuestionDisplayed < self.questions.length - 1);

            self.doButtonStates();
            self.setPercentage();
            $('.survey-container').get(0).scrollIntoView();
        },

        showPreviousQuestionSet: function () {
            var self = this;
            self.hideAllQuestions();
            self.options.lastQuestionDisplayed = self.options.firstQuestionDisplayed - 1;

            do {
                self.options.firstQuestionDisplayed--;
                $('.survey-container > div.question:nth-child(' + (self.options.firstQuestionDisplayed + 1) + ')').show();
                if (self.options.firstQuestionDisplayed > 0 && this.questions[self.options.firstQuestionDisplayed - 1]['break_after'] === true)
                    break;
            } while (self.options.firstQuestionDisplayed > 0);

            this.doButtonStates();
            self.setPercentage();
            $('.survey-container').get(0).scrollIntoView();
        },

        doButtonStates: function () {
            var self = this;
            if (self.options.firstQuestionDisplayed == 0) {
                $('#backBtn').addClass('disabled').attr("disabled", "disabled");
            }
            else if ($('#backBtn').hasClass('disabled')) {
                $('#backBtn').removeClass('disabled').removeAttr("disabled");
            }

            if (self.options.lastQuestionDisplayed == this.questions.length - 1) {
                $('#nextBtn').text('Finish');
                $('#nextBtn').addClass('blue');
            }
            else if ($('#nextBtn').text() === 'Finish') {
                $('#nextBtn').text('Continue »');
                $('#nextBtn').removeClass('blue');
            }
        }
    };

    $.fn[pluginName] = function (options) {
        return this.each(function () {
            if (typeof (options) === 'string') {
                var data = $.data(this, "ssr.plugin." + pluginName);
                if (data && $.isFunction(data[options])) {
                    data[options]();
                }
            }
            else {
                $.data(this, "ssr.plugin." + pluginName, new Plugin(this, options));
            }
        });
    };

})(jQuery, window, document);
