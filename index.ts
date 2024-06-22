import YahooFinance from './clients/yahoo-finance';
import CsvHelper from './csvHelper';
import V20Strategy from './v20-strategy';
import KnoxvilleDivergenceStrategy from './knoxville-divergence-strategy';
import TrendingValueStrategy from './trending-value-strategy';

import { delay, formatDate } from './utils';

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
		path: `./outputs/kd/${formatDate(new Date())}_${set}.csv`,
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
		path: `./outputs/v20/${formatDate(new Date())}_${set}.csv`,
		data: signals,
		ids: ['signal', 'symbol', 'cmp', 'sma200', 'sma50', 'sma20', 'target', 'upside'],
		titles: ['Signal', 'Symbol', 'CMP', 'SMA200', 'SMA50', 'SMA20', 'Target', 'Upside'],
	});
};

const runTV = async () => {
	const referenceDate = '2024-06-21';
	// await TrendingValueStrategy.build(referenceDate);
	const trendingValueStocks = await TrendingValueStrategy.run(referenceDate);
}

const test = async () => {
	const sets = [
		'V40', 'V40N', 'V40S', 'PG75', 'TP', 'NIFTYMIDCAP150', 'NIFTYSMALLCAP250',
		'NIFTYAUTO', 'NIFTYCONDUR', 'NIFTYFINSERV', 'NIFTYFMCG', 'NIFTYHEALTHCARE',
		'NIFTYMEDIA', 'NIFTYOILGAS', 'NIFTYIT', 'NIFTYMETAL', 'NIFTYPHARMA',
		'NIFTYPRIVATEBANK', 'NIFTYPSUBANK', 'NIFTYREALTY', 'NIFTY500', 'NIFTYMICROCAP250'
	];
	const startDate = '2022-01-01';

	const csvHelper = new CsvHelper();
	const yahooFinanceClient = new YahooFinance();

	for (const set of sets) {
		console.log(`Started Running Set - ${set}`);
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
	// await test();
	await runTV();
})();
