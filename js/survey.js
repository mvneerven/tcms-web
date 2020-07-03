/*
    survey - Adapted from https://github.com/egbertbouman/survey.js
*/
;
(function (C, W, D, undefined) {
    'use strict'; 

    var pluginName = "survey",
        defaults = {
            selector: ".survey-container",
            getData: C.noop,
            questions: undefined,
            answers: {},
            mode: "normal", // normal, single, viewresults 
            firstQuestionDisplayed: -1,
            lastQuestionDisplayed: -1,
            src: null,
            finish: C.noop
        };

    function Plugin(element, options) {
        var self = this;
        self.element = element;
        self.Celement = C(element);
        self.options = C.extend({}, defaults, options);
        self._defaults = defaults;
        self._name = pluginName;
        self.tmr = null;
        self.interval = 100;
        self.curGroup = null;
        self.debug = D.location.hostname == "localhost";

        var src = self.Celement.attr(self.debug ? "data-src-dbg" : "data-src") || self.options.src;
        
        if (src) {
            C.getJSON(src, function (json) {
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

            C("body").addClass("survey-shown");

            if(self.options.mode != "viewresults"){ 
                W.addEventListener('beforeunload', (event) => {
                    if (!self.completed)
                        event.returnValue = "Are you sure you want to leave?";
                });

                self.addButtons();
            }

            self.cycle = 0;

            self.Celement.addClass("survey-container").on("mouseup", function(e){
                let ans = C(e.toElement).up("label"),
                elm = ans.up(".question");
                
                //console.log("target: ", e.target, "ans:", ans, "question", elm.toString());

                if(!elm.is(".question.single-select")) 
                    return;

                if(elm.is("#q" + self.questions.length)) 
                    return;

                ans.addClass("active");
                
                setTimeout(function(){
                    C('#nextBtn').trigger("click");

                }, 300);
            });


            self.questions = self.options.questions;
            var qIx = 0;

            self.questions.forEach(function (question) {
                qIx++;
                question.id = qIx.toString();
                self.generateQuestionElement(question, self.options.answers[question.name]);
            });

            C('.survey-container input').on("click", function (e) {
                var g = C(e.target);
                g.up(".missing").removeClass("missing1").up(".question").find('.required-message').hide();
                g.up(".invalid").removeClass("invalid1").up(".question").find('.validation-message').hide();
            });

            C('#backBtn').on("click", function () {
                if (!C('#backBtn').hasClass('disabled')) {
                    self.showPreviousQuestionSet();
                    C('.survey-container').show();
                }
            });

            

            C('#nextBtn').on("click", function () {
                var ok = true;
                var numUnanswered = 0;
                for (var i = self.options.firstQuestionDisplayed; i <= self.options.lastQuestionDisplayed; i++) {
                    var res = self.getQuestionAnswer(self.questions[i]);
                    if (!res.value) {
                        numUnanswered++;
                        if (self.questions[i]['required'] === true) {
                            var ans = C('.survey-container > div.question:nth-child(' + (i + 1) + ')');
                            ans.find(".answer").addClass("missing");
                            ans.find('.required-message').show().scrollTo();
                            ok = false;
                        }
                    }
                    else if(!res.valid){
                    
                        var ans = C('.survey-container > div.question:nth-child(' + (i + 1) + ')');
                        ans.find(".answer").addClass("invalid");
                        ans.find('.validation-message').show().scrollTo();
                        ok = false;
                    }
                }
                if (!ok)
                    return;

                var next = function () {

                    if (C('#nextBtn').text().indexOf('Continue') === 0) {
                        self.showNextQuestionSet();
                    }
                    else {
                        self.completed = true;
                        self.options.finish(self);
                    }
                }

                if (numUnanswered) {
                    var text = self.options.mode == "single" 
                        ? "Are you sure you want to skip this question?"
                        : "Are you sure you want to skip " + numUnanswered + " question" + (numUnanswered == 1 ? "" : "s") + " in " + C("#survey").find(".question:h2:first").text() + "?"  //TODO  visible

                    /* TODO */

                    C.dlg({
                        title: "Survey",
                        body: text,
                        confirmText: "Yes, skip",
                        cancelVisible: true,
                        confirm: next

                    });
                }
                else
                    next();
            });
            this.showNextQuestionSet();

            if(self.options.mode == "viewresults"){
                var els = self.Celement.put("after",".survey-conclusion").addClass("taken disabled").find(".question").show()
            }
            else{
                self.Celement.trigger("ssr.start", [ true ]);
            }

        },

        addButtons: function () {
            var self = this;
            self.toolbar = C('<div class="survey-toolbar"><div class="btn-group"><a id="backBtn" href="#" class="button btn btn-default">« Back</a><a id="nextBtn" href="#" class="button btn btn-primary">Continue »</a></div></div>');
            var tb = self.Celement.attr("data-toolbar");
            if (self.toolbar) {
                self.toolbar.put("append", tb);
            }
            else {
                self.toolbar.put("after", self.Celement);
            }
        },

        destroy: function () {
            C.removeData(this.element, "ssr.plugin." + pluginName);
        },

        getQuestionAnswer: function (question) {
            var result = {
                value: null,
                valid: true
            };
            var self = this;

            if (question.type === 'single-select') {
                result.value = C('input[type="radio"][name="' + question.id + '"]:checked').val();
            }
            else if (question.type === 'multi-select') {
                var values = new Array();
                C('input[type="checkbox"][name="' + question.id + '"]:checked').each(function () {
                    values.push(C(this).val());
                });
                result.value = values;
            }
            else if (question.type === 'single-select-oneline') {
                result.value = C('input[type="radio"][name="' + question.id + '"]:checked').val();
            }
            else if (question.type === 'text-field-large') {
                result.value = C('textarea[name="' + question.id + '"]').val();
            }
            else if (question.type.startsWith('text-field-')) {
                var elm = C('input[name="' + question.id + '"]');
                var value = elm.val();
                if(value && value.length && elm.length) {
                    var el = elm.get(0);
                    if(el.checkValidity && !el.checkValidity()){                        
                        result.valid = false;
                    }
                }
                result.value = value;
            }
            return result;
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

        generateQuestionElement: function (question, answer) {

            var self = this;
            var qEl = C('<div data-g="' + question.gId + '" data-q="' + question.name +'" id="q' + question.id + '" class="question' + (question.required ? ' required': '') +'"></div>')
                .put("append", '.survey-container');
                
            var questionTextElement = C('<div class="question-text"></div>').put("append",  qEl);
            var questionAnswerElement = C('<div class="answer"></div>');
            var questionCommentElement = C('<div class="comment"></div>');
            
            
            questionCommentElement.put("append",qEl);
            questionAnswerElement.put("append", qEl);


            questionTextElement.html(question.text.replace(/\s/g, " "));
            questionCommentElement.html(question.comment || "");

            if (question.type === 'single-select') {
                qEl.addClass('single-select');
                var i = 0;

                for(var name in question.options){
                    var option = question.options[name];
                    var opt = self.getOption(option);
                    var checked = answer && answer.length && name == answer[0] ? " checked": "";
                    
                    var label = C('<label class="radio"><input data-key="' + name + '" type="radio" ' + checked + ' value="' + i + '" name="' + question.id + '"/><span>' + opt.title + '</span></label>');
                    if (question.inline) label.addClass("inline col-xs-10, col-sm-4");
                    label.attr("title", opt.tooltip);
                    label.put("append", questionAnswerElement);
                    i++;
                }
            }
            else if (question.type === 'multi-select') {
                qEl.addClass('multi-select');
                var i = 0;
                
                for(var name in question.options){
                    var option = question.options[name];
                    var opt = self.getOption(option);
                    var checked = answer && answer.length && answer.find(e => e == name) ? "checked": "";
                    var label = C('<label class="radio"><input data-key="' + name + '" type="checkbox" ' + checked +' value="' + i + '" name="' + question.id + '"/><span>' + opt.title + '</span></label>');
                    label.attr("title", opt.tooltip);
                    if (question.inline) label.addClass("inline col-xs-10, col-4");
                    label.put("append",questionAnswerElement);
                    i++;
                }
                questionCommentElement.html("Multiple answers possible");

            }
            else if (question.type === 'single-select-oneline') {
                qEl.addClass('single-select-oneline');
                var html = '<table border="0" cellpadding="5" cellspacing="0"><tr><td></td>';
                question.options.forEach(function (label) {
                    html += '<td><label>' + label + '</label></td>';
                });
                html += '<td></td></tr><tr><td><div>' + question.labels[0] + '</div></td>';
                question.options.forEach(function (label) {
                    html += '<td><div><input type="radio" value="' + label + '" name="' + question.id + '"></div></td>';
                });
                html += '<td><div>' + question.labels[1] + '</div></td></tr></table>';
                C(html).put("append", questionAnswerElement);
            }
            else if (question.type === 'text-field-small') {
                qEl.addClass('text-field-small');
                C('<input type="text" value="' + (answer || "") +'" class="text form-control" name="' + question.id + '">').put("append", questionAnswerElement);
            }
            else if (question.type === 'text-field-email') {
                qEl.addClass('text-field-email');
                C('<input type="email" value="' + (answer || "") +'" class="text form-control" name="' + question.id + '">').put("append", questionAnswerElement);
                
            }
            else if (question.type === 'text-field-url') {
                qEl.addClass('text-field-small');
                C('<input type="url" value="' + (answer || "") + '" class="text form-control" name="' + question.id + '">').put("append",questionAnswerElement);
                
            }
            else if (question.type === 'text-field-large') {
                qEl.addClass('text-field-large');
                C('<textarea rows="8" cols="0" class="text form-control" name="' + question.id + '">' + (answer || "") + '</textarea>').put("append",questionAnswerElement);
            }
            
            C('<div class="required-message">This is a required question</div>').put("after",questionAnswerElement);
            C('<div class="validation-message">This is an invalid entry</div>').put("after", questionAnswerElement);
            qEl.hide();

            if (question.group && question.group != self.curGroup) {
                self.curGroup = question.group;
                var headerElement = C('<h2>' + question.group + '</h2>');
                headerElement.put("prepend", qEl);

            }

            if(question.type.split('-')[0] == "text"){
                
                if(question.options.length)
                    questionAnswerElement.find("input").val(question.options[0]);
            }
        },

        hideAllQuestions: function () {
            var self = this;
            C(".question").hide();
            
            C('.required-message, .validation-message').each(function (index, element) {
                C(element).hide();
            });
        },

        setPercentage: function(){
            var self = this;
            var pct = Math.round(self.options.firstQuestionDisplayed / self.options.questions.length * 100.0, 0);
            self.Celement.trigger("ssr.progress", {percentage: pct });            
        },

        showNextQuestionSet: function () {
            var self = this;
            self.hideAllQuestions();
            self.options.firstQuestionDisplayed = self.options.lastQuestionDisplayed + 1;
            var g;
            do {
                self.options.lastQuestionDisplayed++;
                g = C('.survey-container > div.question:nth-child(' + (self.options.lastQuestionDisplayed + 1) + ')').show().attr("data-g");
                var showSingle = self.options.mode == "single" && g != "comp";

                if (showSingle || self.questions[self.options.lastQuestionDisplayed]['break_after'] === true) 
                    break;
            } while (self.options.lastQuestionDisplayed < self.questions.length - 1);

            if(self.options.rawSurvey){
                self.Celement.trigger("ssr.group", [ self.options.rawSurvey.groups[g] ]);            
            }
            
            self.doButtonStates();
            self.setPercentage();

            C('.survey-container').scrollTo();
        },

        showPreviousQuestionSet: function () {
            var self = this;
            self.hideAllQuestions();
            self.options.lastQuestionDisplayed = self.options.firstQuestionDisplayed - 1;
            do {
                self.options.firstQuestionDisplayed--;
                C('.survey-container > div.question:nth-child(' + (self.options.firstQuestionDisplayed + 1) + ')').show();
                if (self.options.firstQuestionDisplayed > 0 && (self.options.mode == "single" || this.questions[self.options.firstQuestionDisplayed - 1]['break_after'] === true))
                    break;
            } while (self.options.firstQuestionDisplayed > 0);

            this.doButtonStates();
            self.setPercentage();
            C('.survey-container').scrollTo();
        },

        doButtonStates: function () {
            var self = this;
            if (self.options.firstQuestionDisplayed == 0) {
                C('#backBtn').block();
            }
            else if (C('#backBtn').hasClass('disabled')) {
                C('#backBtn').block(false);
            }

            if (self.options.lastQuestionDisplayed == this.questions.length - 1) {
                C('#nextBtn').text('Finish');
                C('#nextBtn').addClass('blue');
            }
            else if (C('#nextBtn').text() === 'Finish') {
                C('#nextBtn').text('Continue »');
                C('#nextBtn').removeClass('blue');
            }
        }
    };

    
    C.fn[pluginName] = function (options) {
        return this.each(function () {
            if (typeof (options) === 'string') {
                var data = C.data(this, "ssr.plugin." + pluginName);
                if (data && C.isFunction(data[options])) {
                    data[options]();
                }
            }
            else {
                C.data(this, "ssr.plugin." + pluginName, new Plugin(this, options));
            }
        });
    };

})(window.core, window, document);
