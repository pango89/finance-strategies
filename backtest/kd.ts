import YahooFinance from '../clients/yahoo-finance';
import CsvHelper from '../csvHelper';
import KnoxvilleDivergenceStrategy from '../knoxville-divergence-strategy';
import { delay, xirr } from '../utils';
import Report from '../report';
import path = require('path');

const runKD = async (histories: any[], set: string) => {
    const kdConfig = {
        rsiPeriod: 14,
        // rsiSMAPeriod: 20,
        // smaPeriod: 200,
        momentumPeriod: 20,
        candlesBack: 200
    };

    let consolidatedReport = [];
    const cashFlowMap = new Map<string, number>();
    const csvHelper = new CsvHelper();

    for (let i = 0; i < histories.length; i++) {
        const history = histories[i];
        const divergences = KnoxvilleDivergenceStrategy.getDivergences(
            history,
            history.map(x => x.close),
            kdConfig.rsiPeriod,
            kdConfig.momentumPeriod,
            kdConfig.candlesBack
        );

        const signals = [];

        // console.log(divergences);

        for (let j = 0; j < divergences.length; j += 1) {
            while (j < divergences.length && divergences[j].signal !== 'BULL-D') {
                j += 1;
            }

            if (j >= divergences.length)
                break;

            const buySignal = {
                signal: 'BUY',
                symbol: divergences[j].symbol,
                date: divergences[j].date,
                price: divergences[j].price,
            };

            signals.push(buySignal);

            while (j < divergences.length && divergences[j].signal !== 'BEAR-D') {
                j += 1;
            }

            if (j >= divergences.length)
                break;

            const sellSignal = {
                signal: 'SELL',
                symbol: divergences[j].symbol,
                date: divergences[j].date,
                price: divergences[j].price,
            };

            signals.push(sellSignal);
        }

        const report = Report.generateTradeReportSummary(signals);

        for (const row of report) {
            consolidatedReport.push(row);
            const { buyDate, buyPrice, sellDate, sellPrice } = row;

            if (!cashFlowMap.has(buyDate))
                cashFlowMap.set(buyDate, 0);

            cashFlowMap.set(buyDate, cashFlowMap.get(buyDate) + (-1 * buyPrice));

            if (!cashFlowMap.has(sellDate))
                cashFlowMap.set(sellDate, 0);

            cashFlowMap.set(sellDate, cashFlowMap.get(sellDate) + sellPrice);
        }
    }

    const cashFlowMapSorted = new Map([...cashFlowMap.entries()].sort())

    const cashFlows = [...cashFlowMapSorted.values()];
    const dates = [...cashFlowMapSorted.keys()];
    const estimatedXIRR = xirr(cashFlows, dates.map(x => new Date(x)));

    consolidatedReport = consolidatedReport.sort((a, b) => a.buyDate > b.buyDate ? 1 : -1);

    await csvHelper.writeToCsv({
        path: path.join(__dirname, `/reports/${new Date().toISOString().split('T')[0]}_kd_${set}.csv`),
        data: consolidatedReport,
        ids: ['symbol', 'buyDate', 'buyPrice', 'sellDate', 'sellPrice', 'gain', 'gainPercent', 'days', 'annualGainPercent'],
        titles: ['Symbol', 'Buy Date', 'Buy Price', 'Sell Date', 'Sell Price', 'Gain', 'Gain %', 'Days', 'Annual Gain %'],
        append: false
    });

    console.log(`XIRR = ${estimatedXIRR}%`);
};

const test = async () => {
    const sets = ['NIFTYSMALLCAP50'];
    const startDate = '2022-06-01';

    const csvHelper = new CsvHelper();
    const yahooFinanceClient = new YahooFinance();

    for (const set of sets) {
        const csvRows = await csvHelper.readFromCsv({
            path: path.join(__dirname, `/../inputs/${set}.csv`),
        });

        const histories = [];

        for (let i = 0; i < csvRows.length; i++) {
            const { symbol } = csvRows[i];
            console.log(symbol);
            await delay(250);
            const history = await yahooFinanceClient.getHistoricalData({
                symbol,
                startDate,
            });
            histories.push(history);
        }

        // Run Knoxville Divergence Strategy
        await runKD(histories, set);
    }
};

(async () => {
    await test();
})();
