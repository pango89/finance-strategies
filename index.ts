import YahooFinance from './clients/yahoo-finance';
import CsvHelper from './csvHelper';
import Quote from './interfaces/quote';
import V20Strategy from './v20-strategy';
import KnoxvilleDivergenceStrategy from './knoxville-divergence-strategy';
import { calculateSMA, delay } from './utils';

const runKD = async (histories: any[], set: string) => {
	const kdConfig = {
		rsiPeriod: 14,
		// rsiSMAPeriod: 20,
		// smaPeriod: 200,
		momentumPeriod: 20,
		candlesBack: 200
	};

	const signals = [];

	for (let i = 0; i < histories.length; i++) {
		const history = histories[i];
		const signal = KnoxvilleDivergenceStrategy.run(
			history,
			kdConfig.rsiPeriod,
			kdConfig.momentumPeriod,
			kdConfig.candlesBack
		);

		if (signal) {
			signals.push(signal);
		}
	}

	const csvHelper = new CsvHelper();
	await csvHelper.writeToCsv({
		path: `./outputs/kd/${new Date().toISOString().split('T')[0]}_${set}.csv`,
		data: signals,
		ids: ['signal', 'symbol', 'cmp', 'sma200', 'sma50', 'sma20'],
		titles: ['Signal', 'Symbol', 'CMP', 'SMA200', 'SMA50', 'SMA20'],
	});
};

const runV20 = async (histories: any[], set: string) => {
	const v20Config = {
		searchForUpsidePercent: 20
	};

	const signals = [];

	for (let i = 0; i < histories.length; i++) {
		const history = histories[i];
		const signal = V20Strategy.run(history, v20Config.searchForUpsidePercent);

		if (signal) {
			signals.push(signal);
		}
	}

	const csvHelper = new CsvHelper();
	await csvHelper.writeToCsv({
		path: `./outputs/v20/${new Date().toISOString().split('T')[0]}_${set}.csv`,
		data: signals,
		ids: ['signal', 'symbol', 'cmp', 'sma200', 'sma50', 'sma20', 'target', 'upside'],
		titles: ['Signal', 'Symbol', 'CMP', 'SMA200', 'SMA50', 'SMA20', 'target', 'upside'],
	});
};

const test = async () => {
	const sets = ['V40S'];
	// const sets = ['NIFTYMIDCAP150'];
	// const sets = ['NIFTYSMALLCAP250'];
	// const sets = ['NIFTYAUTO', 'NIFTYCONDUR', 'NIFTYFINSERV', 'NIFTYFMCG', 'NIFTYHEALTHCARE', 'NIFTYMEDIA', 'NIFTYOILGAS'];
	// const sets = ['NIFTYIT', 'NIFTYMETAL', 'NIFTYPHARMA', 'NIFTYPRIVATEBANK', 'NIFTYPSUBANK', 'NIFTYREALTY'];
	const startDate = '2022-01-01';

	const csvHelper = new CsvHelper();
	const yahooFinanceClient = new YahooFinance();

	for (const set of sets) {
		const csvRows = await csvHelper.readFromCsv({
			path: `./inputs/${set}.csv`,
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

		// Run V20 Strategy
		// await runV20(histories, set);
	}
};

(async () => {
	await test();
})();

// const quotes: Quote[] = await yahooFinanceClient.getQuotes({ symbols: ['DIXON', 'POLYCAB'] });

// console.log(quotes);

// const sma200 = calculateSMA(history.map(x => x.close), 200);
// const strategyV20 = new StrategyV20();
// strategyV20.run(history, 20, sma200);
