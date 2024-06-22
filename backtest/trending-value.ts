import YahooFinance from '../clients/yahoo-finance';
import CsvHelper from '../csvHelper';
import TrendingValueStrategy from '../trending-value-strategy';
import { xirr, round, getDurationInDays, formatDate } from '../utils';
import path = require('path');

const build = async () => {
    const referenceDate = '2019-06-01';
    await TrendingValueStrategy.build(referenceDate);
}

const run = async () => {
    const yahooFinance = new YahooFinance();
    const cashFlowMap = new Map<string, number>();
    const dates = [
        '2021-06-01',
        '2022-06-01',
        '2023-06-01',
        '2024-06-05'
    ];
    const capital = 1000000;

    const portfolioStocksMap = new Map<string, { buyDate: string; quantity: number; buyPrice: number; cmp: number; }>();
    const trades = [];
    const report = [];

    for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const trendingValueStocks = await TrendingValueStrategy.run(date);
        const trendingValueStocksSet = new Set(trendingValueStocks.map(x => x.symbol));

        // Sell all the stocks from portfolio which are not found in trendingValueStocks
        for (const portfolioStock of portfolioStocksMap.keys()) {
            if (!trendingValueStocksSet.has(portfolioStock)) {
                const quote = await yahooFinance.getQuoteHistoryOnDay({
                    symbol: portfolioStock,
                    referenceDate: date
                });

                if (!quote)
                    continue;

                const { close: cmp } = quote;

                const { quantity, buyPrice, buyDate } = portfolioStocksMap.get(portfolioStock);
                // Sell
                const sellTrade = {
                    date,
                    signal: 'SELL',
                    symbol: portfolioStock,
                    price: cmp,
                    quantity
                };

                trades.push(sellTrade);

                const gain = round(cmp - buyPrice);
                const gainPercent = round((100 * (cmp - buyPrice)) / buyPrice);
                const days = getDurationInDays(buyDate, date);
                // const annualGainPercent = round((gainPercent / days) * 365);
                const cagr = xirr([-1 * buyPrice, cmp], [new Date(buyDate), new Date(date)]);

                report.push({
                    symbol: portfolioStock,
                    buyDate,
                    buyPrice,
                    sellDate: date,
                    sellPrice: cmp,
                    gain,
                    gainPercent,
                    days,
                    cagr,
                });

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
            portfolioStocksMap.set(symbol, { buyDate: date, quantity, buyPrice: cmp, cmp });

            if (!cashFlowMap.has(date))
                cashFlowMap.set(date, 0);

            cashFlowMap.set(date, cashFlowMap.get(date) - quantity * cmp);
        }
        // console.log();
        console.log(`Done for Date = ${date}`);
        // console.log(trendingValueStocks);
    }

    // Add Current Portfolio Worth to Cashflow
    const today = formatDate(new Date()) // dates[dates.length - 1];
    if (!cashFlowMap.has(today))
        cashFlowMap.set(today, 0);

    for (const portfolioStock of portfolioStocksMap.keys()) {
        const quote = await yahooFinance.getQuoteHistoryOnDay({
            symbol: portfolioStock,
            referenceDate: today
        });

        if (!quote)
            continue;

        const { close: cmp } = quote;

        const { quantity } = portfolioStocksMap.get(portfolioStock);
        portfolioStocksMap.get(portfolioStock).cmp = cmp;
        cashFlowMap.set(today, cashFlowMap.get(today) + quantity * cmp);
    }

    const cashFlows = [...cashFlowMap.values()];
    const cashflowDates = [...cashFlowMap.keys()];
    const estimatedXIRR = xirr(cashFlows, cashflowDates.map(x => new Date(x)));

    console.log(`XIRR = ${estimatedXIRR} %`);

    const csvHelper = new CsvHelper();

    await csvHelper.writeToCsv({
        path: path.join(__dirname, `/reports/TV/${formatDate(new Date())}_tv_trades.csv`),
        data: report,
        ids: ['symbol', 'buyDate', 'buyPrice', 'sellDate', 'sellPrice', 'gain', 'gainPercent', 'days', 'cagr'],
        titles: ['Symbol', 'Buy Date', 'Buy Price', 'Sell Date', 'Sell Price', 'Gain', 'Gain %', 'Days', 'CAGR %'],
        append: false
    });

    const portfolioHoldings = [];
    for (const [symbol, detail] of portfolioStocksMap) {
        const { buyDate, buyPrice, quantity, cmp } = detail;

        portfolioHoldings.push({
            symbol, buyDate, buyPrice, quantity, currentDate: today, cmp,
            days: getDurationInDays(buyDate, today),
            gainPercent: round((100 * (cmp - buyPrice)) / buyPrice),
            cagr: xirr([-1 * buyPrice, cmp], [new Date(buyDate), new Date(today)])
        });
    }

    await csvHelper.writeToCsv({
        path: path.join(__dirname, `/reports/TV/${formatDate(new Date())}_tv_portfolio.csv`),
        data: portfolioHoldings,
        ids: ['symbol', 'buyDate', 'buyPrice', 'quantity', 'currentDate', 'cmp', 'days', 'gainPercent', 'cagr'],
        titles: ['Symbol', 'Buy Date', 'Buy Price', 'Quantity', 'Current Date', 'CMP', 'Days', 'Gain %', 'CAGR %'],
        append: false
    });
};

(async () => {
    // await build();
    await run();
})();
