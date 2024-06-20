import YahooFinance from './clients/yahoo-finance';
import Tickertape from './clients/tickertape';
import CsvHelper from './csvHelper';
import { delay, Infinity } from './utils';

export default class TrendingValueStrategy {
    private static clean(summaries: any[]) {
        for (let i = 0; i < summaries.length; i++) {
            const summary = summaries[i];
            const { priceToEarnings, priceToBook, priceToSales, priceToCashflow, dividendYield, enterpriseToEbitda, returnOnEquity, returnOnCapitalEmployed } = summary;

            if (!priceToEarnings || priceToEarnings === '' || isNaN(priceToEarnings) || priceToEarnings < 0)
                summary.priceToEarnings = Infinity;

            if (!priceToBook || priceToBook === '' || isNaN(priceToBook) || priceToBook < 0)
                summary.priceToBook = Infinity;

            if (!priceToSales || priceToSales === '' || isNaN(priceToSales) || priceToSales < 0)
                summary.priceToSales = Infinity;

            if (!priceToCashflow || priceToCashflow === '' || isNaN(priceToCashflow) || priceToCashflow < 0)
                summary.priceToCashflow = Infinity;

            if (!dividendYield || dividendYield === '' || isNaN(dividendYield) || dividendYield < 0)
                summary.dividendYield = 0;

            if (!enterpriseToEbitda || enterpriseToEbitda === '' || isNaN(enterpriseToEbitda) || enterpriseToEbitda < 0)
                summary.enterpriseToEbitda = Infinity;
        }
    }

    private static score(records: any[], map: Object, attribute: string, orderBy: string = 'ASC') {
        records = records.sort((x, y) => orderBy === 'ASC' ? x[attribute] - y[attribute] : y[attribute] - x[attribute]);
        const n = Math.ceil(records.length / 10);

        let decile = 1;

        for (let i = 1; i < records.length; i++) {
            const { symbol, return6M, sector, industry, cmp, return12M, marketCap, return1M } = records[i];

            if (!map[symbol])
                map[symbol] = { sum: 0, symbol, return6M, sector, industry, cmp, return12M, return1M, marketCap };

            map[symbol][attribute] = records[i][attribute];
            map[symbol]['sum'] += decile;

            map[symbol] = { ...map[symbol], [`${attribute}Decile`]: decile }
            if (i % n === 0) decile++;
        }
    }

    public static async buildTT() {
        const ttClient = new Tickertape();
        const csvHelper = new CsvHelper();

        const summaries = await ttClient.screener({
            minMarketCap: 5000
        });
        await csvHelper.writeToCsv({
            path: `./inputs/trending-value/${new Date().toISOString().split('T')[0]}_tv_input.csv`,
            data: summaries,
            ids: ['symbol', 'industry', 'sector', 'cmp', 'marketCap', 'priceToEarnings', 'priceToBook', 'priceToSales', 'priceToCashflow', 'enterpriseToEbitda', 'dividendYield', 'returnOnEquity', 'return12M', 'return6M', 'return1M'],
            titles: ['symbol', 'industry', 'sector', 'cmp', 'marketCap', 'priceToEarnings', 'priceToBook', 'priceToSales', 'priceToCashflow', 'enterpriseToEbitda', 'dividendYield', 'returnOnEquity', 'return12M', 'return6M', 'return1M'],
        });
    }

    public static async build(referenceDate: string) {
        const yahooFinanceClient = new YahooFinance();
        const csvHelper = new CsvHelper();

        const year = referenceDate.split('-')[0];
        const set = `NSE_${year}`;

        const csvRows = await csvHelper.readFromCsv({ path: `./inputs/${set}.csv` });

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

    public static async run(referenceDate: string):Promise<any[]> {
        const csvHelper = new CsvHelper();

        const path = `./inputs/trending-value/yahoo/${referenceDate}_tv_input.csv`;

        const summaries = await csvHelper.readFromCsv({
            path,
        });

        TrendingValueStrategy.clean(summaries);

        const map = {};
        TrendingValueStrategy.score(summaries, map, 'priceToEarnings');
        TrendingValueStrategy.score(summaries, map, 'priceToBook');
        TrendingValueStrategy.score(summaries, map, 'priceToCashflow');
        TrendingValueStrategy.score(summaries, map, 'priceToSales');
        TrendingValueStrategy.score(summaries, map, 'enterpriseToEbitda');
        TrendingValueStrategy.score(summaries, map, 'dividendYield', 'DESC');

        let stocksWithDecileScores = Object.values(map);
        stocksWithDecileScores = stocksWithDecileScores.sort((x: any, y: any) => x.sum - y.sum);

        let topDecileStocks = stocksWithDecileScores.slice(0, Math.ceil(summaries.length / 10));
        topDecileStocks = topDecileStocks.sort((x: any, y: any) => y.return6M - x.return6M);

        const top25Stocks = topDecileStocks.slice(0, 25);

        return top25Stocks;

        // await csvHelper.writeToCsv({
        //     path: `./outputs/trending-value/yahoo/${referenceDate}_tv_output.csv`,
        //     data: top25Stocks,
        //     ids: ['symbol', 'industry', 'sector', 'cmp', 'marketCap', 'sum', 'priceToEarnings', 'priceToEarningsDecile', 'priceToBook', 'priceToBookDecile',
        //         'priceToSales', 'priceToSalesDecile', 'priceToCashflow', 'priceToCashflowDecile', 'enterpriseToEbitda', 'enterpriseToEbitdaDecile', 'dividendYield',
        //         'dividendYieldDecile', 'return1M', 'return6M', 'return12M'],
        //     titles: ['symbol', 'industry', 'sector', 'cmp', 'marketCap', 'sum', 'priceToEarnings', 'priceToEarningsDecile', 'priceToBook', 'priceToBookDecile',
        //         'priceToSales', 'priceToSalesDecile', 'priceToCashflow', 'priceToCashflowDecile', 'enterpriseToEbitda', 'enterpriseToEbitdaDecile', 'dividendYield',
        //         'dividendYieldDecile', 'return1M', 'return6M', 'return12M'],
        // });
    }
}