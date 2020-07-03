class RandomQuote{
    constructor(C, elm){
        C.get("https://quote-garden.herokuapp.com/api/v2/quotes/random", function (v) {
             elm.text(v.data.quote.quoteText);
        });
    }
}