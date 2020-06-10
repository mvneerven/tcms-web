/*
    tcms enrichment
*/
;
(function ($, W, D, undefined) {
    'use strict';
    
    var dict = [];
    var src;
    var debug = D.location.hostname == "localhost";
    if(debug)
        src = "https://localhost:44367/";    
    else
        src = "https://tcmsapi.azurewebsites.net/"    

    $(W).on('hashchange load', function (e) {
        var h = W.location.hash.substr(1);
        if(h.startsWith("info:")){

            // i + "/" + se[elem].isMissingAnswer + "/" + topic + "/" + se[elem].answer + "/" + se[elem].description;
            //W.surveyResults = {issuer: {stage: "established ISV"}};
            var p = decodeURI(h.substr(5)).replace('//','/').split('/');

            var msg = p[1]=="true" ? "Not having" : "Having";
            msg += " " + p[4] ;
            msg += " is considered " + ( p[0].startsWith('O') ? "an ": "a " ) + p[0];
            msg += " in the " + W.surveyResults.issuer.stage + " stage";

            var link = "https://github.com/mvneerven/isvcanvas-help/wiki/" + p[3];

            msg += '<p class="swot-more-info"><a target="_blank" href="' + link + '"><span class="ti-info ti-fill"></span> More information</a></p>'

            $("#survey").dialog({
                title: p[2],
                message: msg
            }).on("hide", function(){
                console.log("hide");
                W.location.hash = "";
            });
        }
    });       

    $("#signout").click(function(){
        $(this).auth({action: "signout"});
        e.returnValue = false;
        return false;
    });

    $("#tech-knowledge").on("change", function(){

        $("#login").toggleClass("disabled");
    });
    
    $("#login").click(function(e){

        $(this).auth({action: "login"}).on("ssr.loggedin", function(e, account){
            $("body").addClass("signed-in");
            W.account = account;
            $("#survey").html('Loading...');
            takeSurvey();
        });
        e.returnValue = false;
        return false;
    });


    function convertQType(id, type){
        switch(type){
            case "single" : return "single-select";
            case "multiple" : return "multi-select";
            case "url" : return "text-field-url";
            case "email" : return "text-field-email";
            default: return "text-field-small";case "url" : return "text-field-url";
        }
    };

    function getColor(percentage) {
        var rating = percentage /  10;
        var a = 181, b = 225, c = 163;
        var r, g, b;

        if(rating > 7.5){
            r = a;
            g  = b;
            b = c;
        }
        else if(rating > 5){
            r = b;
            g  = b;
            b = c;
        }
        else if(rating > 2.5){
            r = b;
            g  = a;
            b = c;
        }
        else{
            r = b;
            g  = c;
            b = c;
        }
        return [r , g , b];
    }

    
    function toRGB(color){
        return 'rgb(' + color[0] + ',' + color[1] + ',' + color[2] +')' ;
    }

    function shade(f, percent) {
        if(!percent) percent = -.3;
        var t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f[0],G=f[1],B=f[2];
        
        return [ Math.round((t-R)*p)+R , Math.round((t-G)*p)+G  , Math.round((t-B)*p)+B ];
    }

    // convert to jquery.survey.js format....
    var convertToSurvey = function ( obj ){
        var dictA = []; // keep disctionary of keys for response.
        var j=0;
        var questions = [];   
        var gIx = 0;
        for(var g in obj.groups){
            var gName = obj.groups[g].name;
            var qList = obj.groups[g].questions;
            gIx = 0;
            var gCount = 0;
            for(var qId in qList){
                gCount++;
            }

            for(var qId in qList){
                console.log(qId);

                dictA = {
                    id: qId,
                    answers: []
                }
                
                gIx++;
                var qObj = qList[qId];
                var options = [];
                
                for(var aId in qObj.answers){
                    options.push(qObj.answers[aId].text);
                    dictA.answers.push(aId);
                }

                 switch (qId) {
                    case "fullname":
                        options.push(W.account.name);
                        dictA.answers.push(W.account.name);
                        break;
                    case "email":
                        //idToken.email or W.account.idToken.emails
                        options.push(W.account.idToken.emails[0]);
                        dictA.answers.push(W.account.idToken.emails[0]);
                        break;
                    case "company":
                        var comp = W.account.idToken.emails[0].split('@')[1];
                        options.push(comp);
                        dictA.answers.push(comp);
                        break;
                    case "website":
                        var site = "https://" + W.account.idToken.emails[0].split('@')[1];
                        options.push(site);
                        dictA.answers.push(site);
                        break;

                }
                
                var q = {
                    name: qId,
                    text: qObj.text,
                    break_after: gIx==gCount,
                    group: gName,
                    type: convertQType(qId, qObj.type),
                    options: options,
                    inline: qId == "pm",
                    required: qObj.text.endsWith("*")
                };
                questions.push(q);
                if(q.required)
                    q.text = q.text.substr(0, q.text.length-1);

                dict[j]=dictA;
                j++;
            }
        }

        return questions;
    };

    function takeSurvey(){
        var sv = $("#survey");
        var version  = sv.attr("data-version") || "";
        $.getJSON(src + "survey/" + version , function (obj) {        
            
            sv.html("").survey({
                questions: convertToSurvey(obj),
                finish: function (survey) {
                    $(".survey-intro").hide();

                    var results = {};

                    for (var i = 0; i < survey.questions.length; i++) {
                        var result = [];
                        var q = survey.questions[i];
                        var a = survey.getQuestionAnswer(q).value;
                        if(Array.isArray(a)){
                            for(var k in a){
                                result.push(dict[i].answers[a[k]]);
                            }
                        }
                        else if(q.type.startsWith("text-field-")){
                            result.push(a);
                        }
                        else{
                            
                            result.push(dict[i].answers[a]);
                        }
                        
                        results[dict[i].id] = result;

                    }

                    W.getApiToken().then(function(token){
                        var obj = {
                            version: version,
                            results: results
                        };
                        $.ajax({
                            type: "POST",
                            url: src + "surveyresults",
                            data: JSON.stringify(obj),
                            contentType: "application/json",
                            headers: {
                                "Authorization": token
                            },
                            dataType: "json",
                            success: function(res){
                                console.log(res);
                                res.issuer.emailAddress = W.account.userName;
                                W.surveyResults = res;


                                var c = 1;

                                var tpl = '<div class="col-xl-6 col-12 tcms-result"><table class="swot"><thead><th class="swot-h h2" colspan="2"></th></thead><tbody><tr><td class="swot-g" colspan="2"> </td></tr></tbody>' +
                                    '<thead><th class="swot-a h4" colspan="2">SWOT Analysis</th></thead>'+
                                    '<tbody class="swot-qc"><tr><td class="swot-q swot-s"><div><h4>Strengths</h4></div></td><td class="swot-q swot-w"><div><h4>Weaknesses</h4></div></td></tr>' +
                                    '<tr><td class="swot-q swot-o"><div><h4>Opportunities</h4></div></td><td class="swot-q swot-t"><div><h4>Threats</h4></div></td></tr></tbody></table></div>';

                                $(".survey-conclusion").remove();
                                
                                //TODO disable, not hide
                                //$(".survey-toolbar, #survey").hide();
                                $(".survey-toolbar").hide();

                                

                                var results = $('<div class="survey-conclusion"></div>');

                                results.insertAfter("#survey");

                                var vis = $('<div class="row survey-results"></div>').appendTo(results);
                                

                                var conclusion = $('<div class="row"></div>').insertBefore(vis);

                                var info = $('<div class="col-12 scan-info"></div>').appendTo(conclusion);
                                            
                                var color = getColor(res.overallScore);

                                var overallResultsTable = $(tpl.replace('col-xl-6 col-12', 'col-sm-12 offset-sm-0 col-lg-6 offset-lg-3')).appendTo(vis);
                                overallResultsTable.addClass("overall").find('.swot-h').text("ISV Canvas Maturity Score");
                                
                                $('<p class="tcms-issuer"><em> ' + res.issuer.company + ' (' + res.issuer.stage +  ')<em><br/>').appendTo(info);
                                $('<em>Survey completed by ' + res.issuer.fullName + ' (' + res.issuer.role + ' - ' + res.issuer.emailAddress +')<em></p>').appendTo(info);

                                $('<div></div>').appendTo(overallResultsTable.find(".swot-g")).chart({
                                    type: "circular",
                                    title: "",
                                    outerClass: "tcms-score",
                                    color: toRGB(shade(color)),
                                    fillColor: toRGB(color),
                                    value: Math.round(res.overallScore)
                                });

                                color = getColor(res.reliability);

                                $('<div></div>').appendTo(overallResultsTable.find(".swot-g")).chart({
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

                                    ar.push({key: key, weight: group.weightPercent, name: group.name});

                                    //$('<a name="grp-' + key +'"></a>').appendTo(vis);
                                    var table = $(tpl).appendTo(vis);
                                    table.attr("id", 'grp-' + key);
                                    
                                    table.addClass(key);

                                    table.find('.swot-h:first').text(group.name);
                                    
                                    color = getColor(group.score);

                                    $("<div></div>").appendTo(table.find(".swot-g")).chart({
                                        type: "circular",
                                        outerClass: "col-8",
                                        innerClass: "offset-5",
                                        title: "",
                                        color: toRGB(shade(color)),
                                        fillColor: toRGB(color),
                                        value: Math.round(group.score)
                                    });

                                    
                                    for(var i in group.swot){
                                        var letter = i.substr(0,1).toLowerCase();
                                        var block = table.find(".swot-" + letter + " > div");
                                        var swot = group.swot[i];
                                        if(swot){
                                            var ul = $('<ul class="swot-topic"></ul>').appendTo(block);

                                            for(var topic in swot){
                                                var se = swot[topic];
                                                var txt = "";
                                                var li = $('<li></li>').appendTo(ul).text(topic)
                                                var ulSub  = $('<ul class="swot-expl"></ul>').appendTo(li);
                                                
                                                for(var elem in se){
                                                    var m = se[elem].isMissingAnswer;
                                                    var c = m ? 'swot-cp': 'swot-np';
                                                    var ic = m ? 'close' : 'check';

                                                    var path = i + "/" + se[elem].isMissingAnswer + "/" + topic + "/" + se[elem].answer + "/" + se[elem].description;

                                                    var liSub = $('<li class="swot-xp ' + c + '"><span class="ti ti-' + ic +'"></span><a href="#info:' + encodeURI(path) + '">' + se[elem].description +'</a></li>').appendTo(ulSub)
                                                }
                                            }
                                        }                                
                                    }

                                    table.find(".swot-q > div").each(function(){
                                        var div = $(this);
                                        if(div.find("ul").length == 0){
                                            $('<ul><li class="swot-none">None</li></ul>').appendTo(div);
                                        }
                                    });

                                    c++;
                                    if (c > 7) c = 0;
                                }

                                ar.sort(function(a, b){
                                    return b.weight - a.weight;
                                });

                                var quads = ['s', 'w', 'o', 't'];
                                for(var a in ar){
                                    var ul = null;
                                    for(var quad in quads){
                                        var q = ".swot-q.swot-" + quads[quad] + ">div:first";
                                        var el = overallResultsTable.find(q);
                                        var gEl = $('div.tcms-result.' + ar[a].key + ' ' + q );
                                        var n = 0;
                                        gEl.find('ul.swot-topic > li:not(.swot-none)').each(function(){
                                            var subEl = $(this);
                                            n++;
                                            if(n <= 2){
                                                ul = el.find('.swot-gr-name.swot-gr-' + ar[a].key + " > ul");
                                                if(ul.length==0){
                                                    var div = $('<div class="swot-gr-name swot-gr-' + ar[a].key +'"><a title="Go to group details" href="#grp-' + ar[a].key + '">' + ar[a].name + '</a></div>').appendTo(el);
                                                    ul = $('<ul class="swot-col"></ul>').appendTo(div);
                                                    
                                                }
                                                var txt = subEl.get(0).childNodes[0].nodeValue.trim();
                                                
                                                $('<li>' + txt + '</li>').appendTo(ul); 
                                            }
                                        });
                                    }
                                }
                                
                                var el = overallResultsTable.find('.swot-q').each(function(){
                                    var td = $(this).find(">div:first");
                                    if(td.find(".swot-gr-name").length == 0){
                                        $('<div class="swot-gr-name">None</div>').appendTo(td);
                                    }
                                });

                                // console.log(ar);


                                $("#survey").insertAfter(results)
                                    .addClass("taken")
                                    .find(".question").show()
                                    .find("input").addClass("disabled").attr("disabled", "disabled");

                            },
                            failure: function(errMsg) {
                                console.log(errMsg);
                            }
                    
                    
                        });
                });
                    

                
                }
            }).on("ssr.progress", function(e, percent){
                $(".survey-progress").text(percent + "%");
            });
        }).fail(function(j, status, error) { $("#survey").html("Sorry..." + status + " " + error) });
    }

})(jQuery, window, document);
