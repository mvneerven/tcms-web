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

    $("#survey").html('Loading...');

    function convertQType(type){
        switch(type){
            case "single" : return "single-select";
            case "multiple" : return "multi-select";
            default: return "text-field-small";
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
                var q = {
                    name: qId,
                    text: qObj.text,
                    break_after: gIx==gCount,
                    group: gName,
                    type: convertQType(qObj.type),
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

    $.getJSON(src + "survey", function (obj) {        

        $(W).on('hashchange load', function (e) {
            

            var h = W.location.hash.substr(1);

            console.log(h);

            if(h.startsWith("info:")){
                $("#survey").dialog({
                    title: "Survey",
                    message: h
                }).on("hide", function(){
                    console.log("hide");
                    W.location.hash = "";
                });
            }
        });       

        $("#survey").html("").survey({
            questions: convertToSurvey(obj),
            finish: function (survey) {
                $(".survey-intro").hide();
                
                var results = {};

                for (var i = 0; i < survey.questions.length; i++) {
                    var result = [];
                    var q = survey.questions[i];
                    var a = survey.getQuestionAnswer(q);
                    if(Array.isArray(a)){
                        for(var k in a){
                            result.push(dict[i].answers[a[k]]);
                        }
                    }
                    else if(q.type == "text-field-small"){
                        result.push(a);
                    }
                    else{
                        
                        result.push(dict[i].answers[a]);
                    }
                    
                    results[dict[i].id] = result;

                }
                console.log(results);

                $.ajax({
                    type: "POST",
                    url: src + "surveyresults",
                    data: JSON.stringify(results),
                    contentType: "application/json",
                    dataType: "json",
                    success: function(res){
                        console.log(res);
                        var c = 1;

                        var tpl = '<div class="col-xl-6 col-12 tcms-result"><table class="swot"><thead><th class="swot-h h2" colspan="2"></th></thead><tbody><tr><td class="swot-g" colspan="2"> </td></tr></tbody>' +
                            '<thead><th class="swot-a h4" colspan="2">SWOT Analysis</th></thead>'+
                            '<tbody class="swot-qc"><tr><td class="swot-q swot-s"><div><h4>Strengths</h4></div></td><td class="swot-q swot-w"><div><h4>Weaknesses</h4></div></td></tr>' +
                            '<tr><td class="swot-q swot-o"><div><h4>Opportunities</h4></div></td><td class="swot-q swot-t"><div><h4>Threats</h4></div></td></tr></tbody></table></div>';

                        $(".survey-conclusion").remove();
                        $(".survey-toolbar, #survey").hide();

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

                                            var liSub = $('<li class="swot-xp ' + c + '"><span class="ti ti-' + ic +'"></span><a href="#info:' + se[elem].answer + '">' + se[elem].description +'</a></li>').appendTo(ulSub)
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

                        console.log(ar);

                    },
                    failure: function(errMsg) {
                        console.log(errMsg);
                    }
              });
            }
        }).on("ssr.progress", function(e, percent){
            $(".survey-progress").text(percent + "%");
        });
    }).fail(function(j, status, error) { $("#survey").html("Sorry..." + status + " " + error) });

})(jQuery, window, document);
