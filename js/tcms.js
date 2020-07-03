/*
    tcms enrichment
*/
;
(function (C, W, D, undefined) {
    'use strict';

    W.bodyClasses = C("body").attr("class");


    W.surveyOptions = {
        appStage: C("meta[name=app-stage]").attr("value") || "beta",
        serverless: true,
        appVersion: C("meta[name=app-version]").attr("value").replace("**APPVER**", "") || "0.0.1",
        surveyVersion: C("meta[name=survey-version]").attr("value"),
        mode: "single",
        debug: D.location.hostname == "localhost",
        api: undefined
    };


    W.account = {
        email: "anonymous"
    };

    var mdSvc = new showdown.Converter();

    if (W.surveyOptions.serverless)
        W.surveyOptions.api = W.surveyOptions.debug ? "http://localhost:7071/" : "https://tcmsazfunctions.azurewebsites.net/";
    else
        W.surveyOptions.api = W.surveyOptions.debug ? "https://localhost:44367/" : "https://tcmsapi.azurewebsites.net/";

    C('<span class="version">Version: '
        + W.surveyOptions.appStage
        + ' ' + W.surveyOptions.appVersion
        + ' - survey: ' + W.surveyOptions.surveyVersion
        + '</span>').put("after", "#main-title");


    if (window.JSON && !window.JSON.dateParser) {
        var reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?C/;
        var reMsAjax = /^\/Date\((d|-|.*)\)[\/|\\]C/;

        JSON.dateParser = function (key, value) {
            if (typeof value === 'string') {
                var a = reISO.exec(value);
                if (a)
                    return new Date(value);
                a = reMsAjax.exec(value);
                if (a) {
                    var b = a[1].split(/[-+,.]/);
                    return new Date(b[0] ? +b[0] : 0 - +b[1]);
                }
            }
            return value;
        };
    }

    function closeFact() {
        C('body').attr("class", W.bodyClasses || "");
        C(".question.highlight, label.highlight").removeClass("highlight");
        if (W.selectedHash && C('a[href="' + W.selectedHash + '"]').length) {
            C('a[href="' + W.selectedHash + '"]').up('table.swot', true).scrollTo();
        }
    }

    C(".survey-facts-container .close-fact").on("click", closeFact);

    var dict = [];

    C(W).on('hashchange load', function (e) {
        W.selectedHash = W.location.hash;
        var h = W.location.hash.substr(1);

        if (h.startsWith("sign-out")) {

            let msal = C("body").getPlugin("MsalAuth");
            msal.signOut();


        }

        else if (h.startsWith("info:")) {

            if (e.type !== "hashchange" || W.assessment == null || W.assessment.surveyScore == null || W.assessment.surveyScore.issuer == null) {
                W.location.hash = "";
                C("body").removeClass("fact-shown");
                return;
            }

            var p = decodeURI(h.substr(5)).replace('//', '/').split('/');

            var showFact = function (md) {
                var msg, link;
                if (md) {
                    msg = mdSvc.makeHtml(md);
                    C(".edit-fact").attr("href", "https://github.com/mvneerven/isvcanvas-help/wiki/" + p[3] + "/_edit").attr("title", "Edit wiki page");
                }
                else {
                    var msg = p[1] == "true" ? "Not having" : "Having";
                    msg += " " + p[4].toLowerCase();
                    msg += " is considered " + (p[0].startsWith('O') ? "an " : "a ") + p[0].toLowerCase();
                    msg += " in the " + W.assessment.surveyScore.issuer.stage + " stage";
                    C(".edit-fact").attr("href", "https://github.com/mvneerven/isvcanvas-help/wiki/" + p[3]).attr("title", "Create wiki page");;
                }

                var answer = C("[data-key='" + p[3] + "']");
                if (answer.length) {
                    answer.up('.question', true).addClass("highlight").scrollTo();
                    answer.up('label', true).addClass("highlight");
                }
                C("body").addClass("fact-shown fact-" + p[0].toLowerCase() + " fact-having-" + (p[1] == "false").toString().toLowerCase());
                var content = C("body.fact-shown .survey-facts").html("");
                C('<h1 class="h2"></h1>').text(p[2]).put("append", content);
                C('<div/>').html(msg).put("append", content).find("a[href]").attr("target", "_blank");


                setTimeout(() => {
                    C("#survey-canvas").one("scroll", function () {
                        closeFact();
                    })
                }, 1000);

            };

            C.get("https://raw.githubusercontent.com/wiki/mvneerven/isvcanvas-help/" + p[3] + ".md", showFact).catch(() => { showFact() });

        }
        else if (h.startsWith("/")) {
            var id = h.substr(1);
            rest({
                url: "surveystorage?id=" + id,
                success: function (obj) {

                    if (W.location.search.length)
                        setView(W.location.search);

                    showResults(obj.data);


                }

            });
        }
    });

    D.body.addEventListener('keyup', function (e) {

        if (e.keyCode == 27)
            closeFact();
    });

    C("#tech-knowledge").on("change", function () {
        var c = !C(this).prop("checked");
        C("#log-in").block(c);
    });

    C("#log-in").on("click", function (e) {
        let msal = C("body").getPlugin("MsalAuth");

        C("body").one("loggedin", (e) => {

            W.account = e.detail;

            C("#log-in").removeClass("btn-primary").block()
            C("#take-survey").addClass("btn-primary").tooltip("Logged in as " + window.account.email);;


            msal.getApiToken().then(function (token) {
                W.account.token = token;
                C("[data-action='signout'], #take-survey").block(false);
            });
        })

        msal.login();

        e.returnValue = false;
        return false;
    });

    C("#take-survey").on("click", (e) => {
        C("#survey").html('Loading...');
        takeSurvey();
    })

    function convertQType(id, type) {
        switch (type) {
            case "single": return "single-select";
            case "multiple": return "multi-select";
            case "url": return "text-field-url";
            case "email": return "text-field-email";
            default: return "text-field-small"; case "url": return "text-field-url";
        }
    };

    function getColor(percentage) {
        var rating = percentage / 10;
        var a = 181, b = 225, c = 163;
        var r, g, b;

        if (rating > 7.5) {
            r = a;
            g = b;
            b = c;
        }
        else if (rating > 5) {
            r = b;
            g = b;
            b = c;
        }
        else if (rating > 2.5) {
            r = b;
            g = a;
            b = c;
        }
        else {
            r = b;
            g = c;
            b = c;
        }
        return [r, g, b];
    }


    function toRGB(color) {
        return 'rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ')';
    }

    function shade(f, percent) {
        if (!percent) percent = -.3;
        var t = percent < 0 ? 0 : 255, p = percent < 0 ? percent * -1 : percent, R = f[0], G = f[1], B = f[2];

        return [Math.round((t - R) * p) + R, Math.round((t - G) * p) + G, Math.round((t - B) * p) + B];
    }

    var convertToSurvey = function (obj) {
        var dictA = []; // keep disctionary of keys for response.
        var j = 0;
        var questions = [];
        var gIx = 0;
        for (var g in obj.groups) {
            var gName = obj.groups[g].name;
            var qList = obj.groups[g].questions;
            gIx = 0;
            var gCount = 0;
            for (var qId in qList) {
                gCount++;
            }

            for (var qId in qList) {
                dictA = {
                    id: qId,
                    answers: []
                }

                gIx++;
                var qObj = qList[qId];
                var options = {};

                for (var aId in qObj.answers) {
                    options[aId] = qObj.answers[aId].text;
                    dictA.answers.push(aId);
                }

                var q = {
                    name: qId,
                    text: qObj.text,
                    break_after: gIx == gCount,
                    group: gName,
                    gId: g,
                    type: convertQType(qId, qObj.type),
                    options: options,
                    inline: qId == "pm",
                    required: qObj.text.endsWith("*")
                };
                questions.push(q);
                if (q.required)
                    q.text = q.text.substr(0, q.text.length - 1);

                dict[j] = dictA;
                j++;
            }
        }

        return questions;
    };

    function rest(o) {
        startProgress();

        var options = C.extend({
            type: "GET",
            contentType: "application/json",
            dataType: "json",
            success: function () { }
        }, o);

        options.url = W.surveyOptions.api + options.url,

            console.log("Fetching " + options.url);

        if (W.account && W.account.token) {
            options.headers = {
                "Authorization": W.account.token
            }
        }
        if (options.data) {
            options.method = "POST";
            options.data = JSON.stringify(options.data);
        }
        return C.req(options);
    }

    function gotoPermaLink(id) {
        W.location.replace("/survey.html#/" + id);
    }

    // summary/view/details/questions
    function setView(type) {
        C("body").addClass("view-" + type.substr(1));
        C("div.container.content").removeClass("container").css({ padding: "15px" });
    }

    function showResults(assessment) {
        setProgress(100);
        setTimeout(stopProgress, 500);

        W.assessment = assessment;

        var res = assessment.surveyScore;

        var tpl = '<div class="col-xl-6 col-12 tcms-result"><table class="swot"><thead><th class="swot-h h2" colspan="2"></th></thead><tbody><tr><td class="swot-g" colspan="2"> </td></tr></tbody>' +
            '<thead><th class="swot-a h4" colspan="2">SWOT Analysis</th></thead>' +
            '<tbody class="swot-qc"><tr><td class="swot-q swot-s"><div><h4>Strengths</h4></div></td><td class="swot-q swot-w"><div><h4>Weaknesses</h4></div></td></tr>' +
            '<tr><td class="swot-q swot-o"><div><h4>Opportunities</h4></div></td><td class="swot-q swot-t"><div><h4>Threats</h4></div></td></tr></tbody></table></div>';

        C(".survey-conclusion").remove();
        C(".survey-toolbar").hide();

        var results = C('<div class="survey-conclusion"></div>');

        results.put("after", "#survey");
        var vis = C('<div class="row survey-results"></div>').put("append", results);
        var conclusion = C('<div class="row"></div>').put("before", vis);
        var info = C('<div class="col-12 scan-info"></div>').put("append", conclusion);
        var color = getColor(res.overallScore);


        C('<p class="tcms-issuer"><em> ' + res.issuer.company + ' (' + res.issuer.stage + ')<em><br/>').put("append", info);
        C('<em>Survey completed by ' + res.issuer.fullName + ' (' + res.issuer.role + ' - ' + res.issuer.emailAddress + ')<em> at ' + JSON.dateParser("date", assessment.surveyDateTimeTaken) + '</p>').put("append", info);

        if (showScores()) {
            var overallResultsTable = C(tpl.replace('col-xl-6 col-12', 'col-sm-12 offset-sm-0 col-lg-6 offset-lg-3')).put("append", vis);
            overallResultsTable.addClass("overall").find('.swot-h').text("ISV Canvas Maturity Score");
            overallResultsTable.find(".swot-qc, .swot-a.h4").hide();

            C('<div></div>').put("append", overallResultsTable.find(".swot-g")).chart({
                type: "circular",
                title: "",
                outerClass: "tcms-score",
                color: toRGB(shade(color)),
                fillColor: toRGB(color),
                value: Math.round(res.overallScore)
            });

            color = getColor(res.reliability);

            C('<div></div>').put("append", overallResultsTable.find(".swot-g")).chart({
                type: "circular",
                title: "Score Reliability",
                outerClass: "reliability-score",
                color: toRGB(shade(color)),
                fillColor: toRGB(color),
                value: Math.round(res.reliability)
            }).attr("title", "Based on the percentage of questions answered.");

            var ar = [];
            for (var key in res.scores) {
                var group = res.scores[key];

                ar.push({ key: key, weight: group.weightPercent, name: group.name });
                var table = C(tpl).put("append", vis);
                table.attr("id", 'grp-' + key);
                table.addClass(key);
                table.find('.swot-h:first-child').text(group.name);
                color = getColor(group.score);

                C("<div></div>").put("append", table.find(".swot-g")).chart({
                    type: "circular",
                    outerClass: "col-8",
                    innerClass: "offset-5",
                    title: "",
                    color: toRGB(shade(color)),
                    fillColor: toRGB(color),
                    value: Math.round(group.score)
                });


                for (var i in group.swot) {
                    var letter = i.substr(0, 1).toLowerCase();
                    var block = table.find(".swot-" + letter + " > div");
                    var swot = group.swot[i];
                    if (swot) {
                        var ul = C('<ul class="swot-topic"></ul>').put("append", block);

                        for (var topic in swot) {
                            var se = swot[topic];
                            var txt = "";
                            var li = C('<li></li>').put("append", ul).text(topic)
                            var ulSub = C('<ul class="swot-expl"></ul>').put("append", li);

                            for (var elem in se) {
                                var m = se[elem].isMissingAnswer;
                                var c = m ? 'swot-cp' : 'swot-np';
                                var ic = m ? 'close' : 'check';

                                var path = i + "/" + se[elem].isMissingAnswer + "/" + topic + "/" + se[elem].answer + "/" + se[elem].description;

                                var liSub = C('<li class="swot-xp ' + c + '"><span class="ti ti-' + ic + '"></span><a href="#info:' + encodeURI(path) + '">' + se[elem].description + '</a></li>').put("append", ulSub)
                            }
                        }
                    }
                }
            }
        }

        //TODO: load survey in read-only mode with answers
        var sv = C("#survey");

        if (showQuestions()) {
            rest({
                url: "survey/" + assessment.surveyVersion,
                success: function (obj) {
                    setProgress(100);

                    console.log("survey/" + assessment.surveyVersion, obj);

                    sv.html('<hr/><h2 class="h1">Answers given:</h2>');

                    sv.survey({
                        questions: convertToSurvey(obj.data),
                        answers: assessment.surveyAnswers,
                        mode: "viewresults"
                    });
                    stopProgress();
                },
            }).catch(handleError);
        }
    }

    // summary/view/details/questions
    function showQuestions() {
        return !C("body").hasClass("view-summary");
    }

    function showScores() {
        return !C("body").hasClass("view-questions");
    }

    function handleError(j, status, error) {
        console.log(j, status, error);

        C('#nextBtn').block(false)

        if (C("#survey").text() == "Loading...") {
            C("#survey").html('Sorry, there is a problem with the survey. Please <a href="">try again</a>.');
        }

        C.dlg();

        stopProgress();
    }

    function getCompanyFromAccount() {
        if (W.account.type == "org") {
            var s = W.account.email.split("@")[1];
            return s.substr(0, 1).toUpperCase() + s.substr(1);
        }

    }

    function getWebsiteFromAccount() {
        if (W.account.type == "org")
            return "https://" + W.account.email.split('@')[1];
    }

    function setProgress(percent) {

        var elm = C("#progress");
        if (!percent || percent === 0) {
            elm.style({ width: 0 });
        }
        else {
            elm.style({ width: percent + "%" });
        }
    }

    function showProgress() {
        W.progressValue++;
        setProgress(W.progressValue);
        if (W.progressValue === 100) {
            stopProgress()
        }

    }

    function stopProgress() {
        clearInterval(W.progressTimer);
        delete W.progressTimer;
        setProgress(0);
    }

    function startProgress() {
        setProgress(0);

        W.progressTimer = setInterval(showProgress, 100);
    }

    function takeSurvey() {

        var sv = C("#survey");

        C.dlg({
            modal: true,
            title: "Survey",
            confirmText: "Start survey!",
            body: '<p>Please take your time to fill out the survey to the best of your knowledge.</p>' +
                '<p>Most questions can be skipped. If you don\'t know the answer to a question, don\'t worry and skip it.</p>'
        });

        rest({
            url: "survey/" + W.surveyOptions.surveyVersion,
            success: function (obj) {
                stopProgress();
                var survey = obj.data;
                var q = convertToSurvey(survey);


                sv.html("").survey({
                    rawSurvey: survey,
                    mode: W.surveyOptions.mode,
                    questions: q,
                    answers: {
                        fullname: W.account.name,
                        email: W.account.email,
                        company: getCompanyFromAccount(),
                        website: getWebsiteFromAccount()
                    },
                    finish: function (survey) {
                        setProgress(100);

                        C('#nextBtn').block();

                        C(".survey-intro").hide();

                        var results = {};

                        for (var i = 0; i < survey.questions.length; i++) {
                            var result = [];
                            var q = survey.questions[i];
                            var a = survey.getQuestionAnswer(q).value;
                            if (Array.isArray(a)) {
                                for (var k in a) {
                                    result.push(dict[i].answers[a[k]]);
                                }
                            }
                            else if (q.type.startsWith("text-field-")) {
                                result.push(a);
                            }
                            else {

                                result.push(dict[i].answers[a]);
                            }
                            results[dict[i].id] = result;
                        }

                        var obj = {
                            version: W.surveyOptions.surveyVersion,
                            results: results
                        };

                        rest({
                            url: "surveyresults",
                            data: obj,
                            success: function (obj) {

                                gotoPermaLink(obj.data.id);
                                stopProgress();
                            }
                        }).catch(handleError);
                    }
                }).on("ssr.progress", function (e) {

                    var percent = e.detail.percentage;

                    setProgress(percent);
                }).on("ssr.group", function (e, grp) {
                    if (grp && grp.name) {
                        if (W.surveyOptions.mode == "single") {
                            //var q = C(".question:visible"); // :not([style='display:none'])
                            var q = C(".question:not([style='display:none']");
                            if (q.find("h2").length == 0) {
                                q.prepend('<h2>' + grp.name + '</h2>');
                            }
                        }
                    }
                });
            }
        }
        ).catch(handleError);
    }

})(window.core, window, document);
