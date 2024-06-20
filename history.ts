import YahooFinance from './clients/yahoo-finance';
import CsvHelper from './csvHelper';
import { round, getFYBeginDate, getPreviousFYEndDate, delay } from './utils'


const run = async () => {
    const yahooFinanceClient = new YahooFinance();
    const csvHelper = new CsvHelper();

    const set = 'PG';

    const referenceDate = '2024-06-20';

    const csvRows = await csvHelper.readFromCsv({
        path: `./inputs/${set}.csv`,
    });


    for (let i = 0; i < csvRows.length; i++) {
        const { symbol } = csvRows[i];
        console.log(symbol);
        await delay(250);

        const stock = await yahooFinanceClient.getHistoricalQuoteSummary({ symbol, referenceDate });

        const append = i === 0 ? false : true;
        await csvHelper.writeToCsv({
            path: `./inputs/trending-value/yahoo/${referenceDate}_tv_input.csv`,
            data: [stock],
            ids: ['date', 'symbol', 'industry', 'sector', 'cmp', 'marketCap', 'priceToEarnings', 'priceToBook', 'priceToSales', 'priceToCashflow', 'enterpriseToEbitda', 'dividendYield', 'returnOnEquity', 'return12M', 'return6M', 'return3M', 'return1M'],
            titles: ['date', 'symbol', 'industry', 'sector', 'cmp', 'marketCap', 'priceToEarnings', 'priceToBook', 'priceToSales', 'priceToCashflow', 'enterpriseToEbitda', 'dividendYield', 'returnOnEquity', 'return12M', 'return6M', 'return3M', 'return1M'],
            append
        });
    }
}

(async () => {
    await run();
})();