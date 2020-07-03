class Feedback{
    constructor(C, elm){


        const tpl = `<div class="feedback-container c-unselectable">
        <div class="feedback-panel">
            <form method="POST" action="/feedback" class="form panel-body" role="form">
                <div class="form-group">
                <input class="form-control" name="email" autofocus placeholder="Your e-mail" type="email" />
                </div>
                <div class="form-group">
                <textarea class="form-control" name="body" required placeholder="Please write your feedback here..." rows="5"></textarea>
                </div>
                <button class="btn btn-primary pull-right" type="submit">Send</button>
            </form>
        </div>
        <div class="feedback-tab">Feedback</div>
        </div>`;

        //var self = this;
        C.require("/js/c-plugins/feedback.css", function(){
            const tab = C(tpl).put("before","footer");

            tab.find(".feedback-tab").on("click", function(e) {
                C(e.target).up(".feedback-container").find(".feedback-panel").toggleClass("show").find("form").on('submit', function(event) {
                    let f = C(this);
                    C.req({
                        type: "POST",
                        url: f.attr('action'),
                        data: f.serialize(),
                        success: function() {
                            C(".feedback-panel").toggle("slide").find("textarea").val('');
                        }
                    });
                    event.preventDefault();
                });
                e.preventDefault();
            });
        });
        
    }
}
