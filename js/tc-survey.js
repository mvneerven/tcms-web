/*
    jquery.survey enrichment
*/
(function ($, W, D, undefined) {
  "use strict";

  $("#survey").survey({
    finish: function (survey) {
      var stageId = -1;
      var stage = "Unknown";
      var groups = {};
      var curGroup = "unknown";
      var groupIndex = 0;
      var responses = { results: [] };

      survey.unanswered = 0;
      survey.ratedQuestions = 0;
      survey.selectedTags = {};
      survey.internalConflicts = {};
      survey.namedAnswers = {};

      var checkTag = function (q, ax) {
        if (q.tags) {
          //console.log("Tags for " + q.text + ": "  + q.tags );
          for (var t in q.tags) {
            if (q.tags[t].find((element) => element == ax) > -1) {
              survey.selectedTags[t] =
                survey.selectedTags[t] == undefined
                  ? 1
                  : survey.selectedTags[t] + 1;
            }
          }
        }
      };

      for (var i = 0; i < survey.questions.length; i++) {
        var q = survey.questions[i];
        var a = survey.getQuestionAnswer(q);
        if (a !== undefined) {
          switch (q.type) {
            case "single-select":
              responses.results.push({
                id: "q-" + q.id,
                type: q.type,
                response: [a],
              });
              break;
            case "multi-select":
              responses.results.push({
                id: "q-" + q.id,
                type: q.type,
                response: a,
              });
              break;

            default:
              responses.results.push({
                id: "q-" + q.id,
                type: q.type,
                responsetext: a,
              });

              break;
          }
        }
        if (q.name) {
          var na = a;
          if (!isNaN(na)) na = q.options[parseInt(na)];

          survey.namedAnswers[q.name] = na;
        }

        if (q.group && q.group != curGroup) {
          curGroup = q.group;
          groups[curGroup] = groups[curGroup] || {
            max: 0,
            score: 0,
            questions: {},
          };
          groupIndex = 0;
        } else {
          groupIndex++;
        }

        if (i == 0) {
          stageId = parseInt("0" + a);
          stage = q.options[stageId];
        } else {
          var score = q.score;
          if (q.scores && q.scores[stage] && q.scores[stage].length)
            score = q.scores[stage];

          if (score) {
            survey.ratedQuestions++;

            if (a == undefined) {
              survey.unanswered++;
            }
          }

          if (q.type == "single-select") {
            var ax = parseInt(a);

            if (score) {
              if (!isNaN(ax) && score.length >= ax) {
                groups[curGroup].score += score[ax];
              }
              groups[curGroup].max += Math.max(...score);
            }
            checkTag(q, ax);
          } else if (q.type == "multi-select") {
            if (score) {
              var n = 0;
              for (var v in a) {
                n = parseInt(v);
                if (!isNaN(n)) {
                  groups[curGroup].score += score[n];
                  checkTag(q, n);
                }
              }
              groups[curGroup].max += score.reduce((c, d) => c + d, 0);
            }
          }
        }
        groups[curGroup].questions[groupIndex] = {
          question: q,
          answer: a,
        };
        delete groups[curGroup].questions[groupIndex].question.group;
        delete groups[curGroup].questions[groupIndex].question.id;
        delete groups[curGroup].questions[groupIndex].question.break_after;
      }
      console.log(JSON.stringify(responses));
      var prom = new Promise((resolve, reject) => {
        $.ajax({
          type: "POST",
          url:
            "https://tmcs-func-dev.azurewebsites.net/api/eval-raccomandations",
          // The key needs to match your method's input parameter (case-sensitive).
          data: JSON.stringify(responses),
          contentType: "application/json; charset=utf-8",
          dataType: "json",
          timeout: 30000,
          success: (response) => {
            console.log(response);
            $(
              '<div class="row survey-results">' +
                JSON.stringify(response) +
                "</div>"
            ).appendTo("col-12");
            resolve(response);
          },
          error: (response) => {
            console.log(response);
            $(
              '<div class="row survey-results">' +
                JSON.stringify(response) +
                "</div>"
            ).appendTo("col-12");
            reject(response);
          },
        });
      });

      var vis = $('<div class="row survey-results"></div>');
      $(".survey-container").hide().after(vis);

      var c = 1;
      var total = 0;
      var i = 0;
      var s = [];
      var t = [];
      var r = [];

      for (var st in survey.selectedTags) {
        if (!st.startsWith("NO-")) {
          if (st.endsWith("Risk")) {
            r.push(st);
          } else if (survey.selectedTags["NO-" + st] > 0) {
            t.push(st);
            survey.internalConflicts[st] = true;
          } else {
            s.push(st);
          }
        }
      }

      $('<div class="col-12"><h3>Details</h3</div>').appendTo(vis);

      for (var g in groups) {
        //console.log(g + ": " + groups[g].score + "/" + groups[g].max );

        if (groups[g].max > 0) {
          groups[g].percent =
            groups[g].max == 0
              ? 0
              : Math.round((groups[g].score / groups[g].max) * 100);
          total += groups[g].percent;

          $("<div></div>").appendTo(vis).chart({
            type: "circular",
            outerClass: "col-xl-4 col-6",
            title: g,
            color: c,
            value: groups[g].percent,
          });

          i++;
        }
        c++;
        if (c > 6) c = 0;
      }

      var conclusion = $('<div class="row"></div>').insertBefore(vis);

      var info = $('<div class="col-lg-5 col-sm-12 scan-info"></div>').appendTo(
        conclusion
      );

      $(
        "<h4>Company</h4><div>" + survey.namedAnswers["company"] + "</div>"
      ).appendTo(info);
      $(
        "<h4>Stage</h4><div>" +
          survey.namedAnswers["stage"].split("[")[0] +
          "</div>"
      ).appendTo(info);
      $(
        "<h4>Your name</h4><div>" + survey.namedAnswers["fullName"] + "</div>"
      ).appendTo(info);
      $(
        "<h4>Your email</h4><div>" + survey.namedAnswers["email"] + "</div>"
      ).appendTo(info);

      $("<div></div>")
        .appendTo(conclusion)
        .chart({
          type: "circular",
          title: "Maturity",
          outerClass: "col-5",
          color: 0,
          value: Math.round(total / i),
        });

      var reliability = Math.round(
        100 - (survey.unanswered / survey.ratedQuestions) * 100
      );

      for (var ic in survey.internalConflicts) {
        reliability -= (reliability * 10) / 100;
      }
      reliability = Math.round(Math.max(0, reliability));

      $("<div></div>").appendTo(conclusion).chart({
        type: "circular",
        title: "Score Reliability",
        outerClass: "col-2 reliability-score",
        color: 1,
        value: reliability,
      });

      if (s.length) {
        $(
          '<div class="col-12"><h3>Labels</h3><span class="badge-pill badge-success">' +
            s.join('</span><span class="badge-pill badge-success">') +
            "</div>"
        ).appendTo(vis);
      }
      if (r.length) {
        $(
          '<div class="col-12"><h3>Possible Risks</h3><span class="badge-pill badge-warning">' +
            r.join('</span><span class="badge-pill badge-warning">') +
            "</div>"
        ).appendTo(vis);
      }
      if (t.length) {
        $(
          '<div class="col-12"><h3>Possible Conflicts</h3><span class="badge-pill badge-danger">' +
            t.join('</span><span class="badge-pill badge-danger">') +
            "</div>"
        ).appendTo(vis);
      }

      //vis.pdf();
    },
  });
})(jQuery, window, document);
