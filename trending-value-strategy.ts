// import YahooFinance from './clients/yahoo-finance';
import Tickertape from './clients/tickertape';
import CsvHelper from './csvHelper';

const build = async () => {
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

const score = (records: any[], map: Object, attribute: string, orderBy: string = 'ASC') => {
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
};

const run = async () => {
    const csvHelper = new CsvHelper();

    const summaries = await csvHelper.readFromCsv({
        path: `./inputs/trending-value/${new Date().toISOString().split('T')[0]}_tv_input.csv`,
    });

    const map = {};
    score(summaries, map, 'priceToEarnings');
    score(summaries, map, 'priceToBook');
    score(summaries, map, 'priceToCashflow');
    score(summaries, map, 'priceToSales');
    score(summaries, map, 'enterpriseToEbitda');
    score(summaries, map, 'dividendYield', 'DESC');

    let stocksWithDecileScores = Object.values(map);
    stocksWithDecileScores = stocksWithDecileScores.sort((x: any, y: any) => x.sum - y.sum);

    let topDecileStocks = stocksWithDecileScores.slice(0, Math.ceil(summaries.length / 10));
    topDecileStocks = topDecileStocks.sort((x: any, y: any) => y.return6M - x.return6M);

    const top25Stocks = topDecileStocks.slice(0, 25);

    await csvHelper.writeToCsv({
        path: `./outputs/trending-value/${new Date().toISOString().split('T')[0]}_tv_output.csv`,
        data: top25Stocks,
        ids: ['symbol', 'industry', 'sector', 'cmp', 'marketCap', 'sum', 'priceToEarnings', 'priceToEarningsDecile', 'priceToBook', 'priceToBookDecile',
            'priceToSales', 'priceToSalesDecile', 'priceToCashflow', 'priceToCashflowDecile', 'enterpriseToEbitda', 'enterpriseToEbitdaDecile', 'dividendYield',
            'dividendYieldDecile', 'return1M', 'return6M', 'return12M'],
        titles: ['symbol', 'industry', 'sector', 'cmp', 'marketCap', 'sum', 'priceToEarnings', 'priceToEarningsDecile', 'priceToBook', 'priceToBookDecile',
            'priceToSales', 'priceToSalesDecile', 'priceToCashflow', 'priceToCashflowDecile', 'enterpriseToEbitda', 'enterpriseToEbitdaDecile', 'dividendYield',
            'dividendYieldDecile', 'return1M', 'return6M', 'return12M'],
    });
}

(async () => {
    // await build();
    await run();
})();