import QuoteHistory from './interfaces/quote-history';
import { calculateSMA, round } from './utils';

export default class V20Strategy {
    constructor() { }

    // public run(quoteHistoryArray: QuoteHistory[], upsidePercent: number) {
    //     const cmp = quoteHistoryArray[quoteHistoryArray.length - 1].close;

    //     let lowest = 1000000;
    //     let highest = 0;

    //     let candles = 0;
    //     let diffPercent = 0;

    //     const poi = [];
    //     const buySignals = [];

    //     for (let i = quoteHistoryArray.length - 1; i >= 0; i--) {
    //         const history = quoteHistoryArray[i];
    //         const { low, high, open, close, date } = history;
    //         const isGreenCandle = close >= open;

    //         if (!isGreenCandle) {
    //             lowest = 1000000;
    //             highest = 0;
    //             candles = 0;

    //             continue;
    //         }

    //         candles += 1;

    //         lowest = Math.min(lowest, low);
    //         highest = Math.max(highest, high);

    //         diffPercent = 100 * (highest - lowest) / lowest;

    //         if (diffPercent >= upsidePercent) {
    //             poi.push({
    //                 date,
    //                 candles,
    //                 upsidePercent: round(diffPercent)
    //             });

    //             if (cmp <= low) {
    //                 buySignals.push({
    //                     buyAtPrice: cmp,
    //                     prevDate: date,
    //                     prevDateLow: lowest,
    //                     sellAtPrice: highest
    //                 })
    //             }

    //             // Find Only one previous signal
    //             // Remove break statement to find more signals from further past
    //             // break;
    //         }
    //     }

    //     console.log(poi);
    //     console.log(buySignals);
    // }

    public static run(quoteHistoryArray: QuoteHistory[], upsidePercent: number) {
        const n = quoteHistoryArray.length;

        const cmp = quoteHistoryArray[n - 1].close;
        const prices = quoteHistoryArray.map((x) => x.close);

        const sma200 = calculateSMA(prices, 200);
        const sma50 = calculateSMA(prices, 50);
        const sma20 = calculateSMA(prices, 20);

        const poi = [];

        let resultSignal = null;

        for (let i = n - 1; i >= 0; i--) {
            let lowest = 10000000;
            let highest = 0;

            let candles = 0;
            let diffPercent = 0;

            const history = quoteHistoryArray[i];
            const { open, close, symbol } = history;
            const isRedCandle = close < open;

            if (isRedCandle) {
                continue;
            }

            while (i >= 1) {
                const curr = quoteHistoryArray[i];
                const prev = quoteHistoryArray[i - 1];

                const { low: currLow, high: currHigh, date: currDate } = curr;
                const { open: prevOpen, close: prevClose } = prev;

                candles += 1;

                const isPrevRedCandle = prevClose < prevOpen;

                lowest = Math.min(lowest, currLow);
                highest = Math.max(highest, currHigh);
                diffPercent = lowest > 0 ? (100 * (highest - lowest)) / lowest : 0;

                if (isPrevRedCandle) {
                    if (diffPercent >= upsidePercent) {
                        poi.push({
                            symbol,
                            currDate,
                            candles,
                            diffPercent: round(diffPercent),
                        });

                        if (currLow <= sma200[i] && cmp <= currLow) {
                            // if (cmp <= currLow) {
                            resultSignal = {
                                signal: 'BUY',
                                symbol,
                                cmp,
                                sma200: sma200[n - 1],
                                sma50: sma50[n - 1],
                                sma20: sma20[n - 1],
                                target: highest,
                                upside: round((100 * (highest - cmp)) / cmp),
                            };
                        }
                    }

                    break;
                }

                i -= 1;
            }

            // If we have already found the latest spot then break
            if (poi.length > 0) break;
        }

        // console.log(JSON.stringify(poi));
        return resultSignal;
    }
}
