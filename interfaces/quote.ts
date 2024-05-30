
export default interface Quote {
    symbol: string;
    exchange: string;
    name: string;
    dayChange: number;
    dayChangePercent: number;
    dayHigh: number;
    dayLow: number;
    dayOpen: number;
    cmp: number;
    fiftyTwoWeekLow: number;
    fiftyTwoWeekHigh: number;
    epsTrailingTwelveMonths: number;
    bookValue: number;
    priceToBook: number;
    sma50: number;
    sma200: number;
    marketCap: number;
    forwardPE: number;
    avgRating: string;
}