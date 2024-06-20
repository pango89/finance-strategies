import YahooFinance from '../clients/yahoo-finance';
import CsvHelper from '../csvHelper';
import TrendingValueStrategy from '../trending-value-strategy';
import { delay, xirr } from '../utils';
import Report from '../report';
import path = require('path');

const test = async () => {
    const yahooFinance = new YahooFinance();
    const csvHelper = new CsvHelper();

    const cashFlowMap = new Map<string, number>();

    const dates = ['2022-06-01', '2023-06-01', '2024-06-20'];

    // Add Funds on first Date
    const capital = 1000000;
    // cashFlowMap.set(dates[0], -1 * capital);

    const portfolioStocksMap = new Map<string, { quantity: number; }>();
    const trades = [];

    for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const trendingValueStocks = await TrendingValueStrategy.run(date);
        const trendingValueStocksSet = new Set(trendingValueStocks.map(x => x.symbol));

        // Sell all the stocks from portfolio which are not found in trendingValueStocks
        for (const portfolioStock of portfolioStocksMap.keys()) {
            if (!trendingValueStocksSet.has(portfolioStock)) {
                const [{ latestPrice: cmp }] = await yahooFinance.getTrailingReturns({
                    symbol: portfolioStock,
                    periods: [30],
                    referenceDate: date
                });

                const { quantity } = portfolioStocksMap.get(portfolioStock);
                // Sell
                const sellTrade = {
                    date,
                    signal: 'SELL',
                    symbol: portfolioStock,
                    price: cmp,
                    quantity
                };

                trades.push(sellTrade);

                if (!cashFlowMap.has(date))
                    cashFlowMap.set(date, 0);

                cashFlowMap.set(date, cashFlowMap.get(date) + quantity * cmp);
                portfolioStocksMap.delete(portfolioStock);
            }
        }

        for (let j = 0; j < trendingValueStocks.length; j++) {
            const { symbol, cmp } = trendingValueStocks[j];

            if (portfolioStocksMap.has(symbol))
                continue;

            const quantity = Math.floor((capital / trendingValueStocks.length) / cmp)

            const buyTrade = {
                date,
                signal: 'BUY',
                symbol,
                price: cmp,
                quantity
            };

            trades.push(buyTrade);
            portfolioStocksMap.set(symbol, { quantity });

            if (!cashFlowMap.has(date))
                cashFlowMap.set(date, 0);

            cashFlowMap.set(date, cashFlowMap.get(date) - quantity * cmp);
        }
        // console.log(`Trending Value Stocks for Date = ${date}`);
        // console.log(trendingValueStocks);
    }

    // Add Current Portfolio Worth to Cashflow
    const lastDate = dates[dates.length - 1];
    if (!cashFlowMap.has(lastDate))
        cashFlowMap.set(lastDate, 0);

    for (const portfolioStock of portfolioStocksMap.keys()) {
        const [{ latestPrice: cmp }] = await yahooFinance.getTrailingReturns({
            symbol: portfolioStock,
            periods: [30],
            referenceDate: lastDate
        });

        const { quantity } = portfolioStocksMap.get(portfolioStock);
        cashFlowMap.set(lastDate, cashFlowMap.get(lastDate) + quantity * cmp);
    }

    const cashFlows = [...cashFlowMap.values()];
    // const dates = [...cashFlowMap.keys()];
    const estimatedXIRR = xirr(cashFlows, dates.map(x => new Date(x)));

    console.log(estimatedXIRR);
};

(async () => {
    await test();
})();
