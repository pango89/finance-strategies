import YahooFinance from './clients/yahoo-finance';
import CsvHelper from './csvHelper';
import Quote from './interfaces/quote';
import StrategyV20 from './strategy-v20';
import KnoxvilleDivergenceStrategy from './knoxville-divergence-strategy';
import { calculateSMA, delay } from './utils';

const test = async () => {
	const stockSetName = 'V40-Next';
	const stocks: string[] = [
		'LTTS',
		'PETRONET',
		'GLAXO',
		'PAGEIND',
		'KPITTECH',
		'COROMANDEL',
		'NAM-INDIA',
		'3MINDIA',
		'SONACOMS',
		'KEI',
		'GUJGASLTD',
		'AIAENG',
		'IGL',
		'APARINDS',
		'COFORGE',
		'BLUESTARCO',
		'CARBORUNIV',
		'CRISIL',
		'TIMKEN',
		'ZFCVINDIA',
		'DEEPAKNTR',
		'MSUMI',
		'SKFINDIA',
		'GRINDWELL',
		'JBCHEPHARM',
		'SUNTV',
		'SUMICHEM',
		'RATNAMANI',
		'BAYERCROP',
		'ARE&M',
		'PFIZER',
		'KAJARIACER',
		'GODFRYPHLP',
		'SANOFI',
		'CYIENT',
		'CASTROLIND',
		'BASF',
		'NATCOPHARM',
		'BSOFT',
		'RITES',
		'GSPL',
		'SUVENPHAR'
	];

	const yahooFinanceClient = new YahooFinance();
	const signals = [];

	for (let i = 0; i < stocks.length; i++) {
		// await delay(500);

		const symbol = stocks[i];
		const startDate = '2023-01-01';
		const history = await yahooFinanceClient.getHistoricalData({ symbol, startDate });
		const signal = KnoxvilleDivergenceStrategy.run(history, 14, 20, 200);

		if (signal) {
			signals.push(signal);
		}
	}

	const csvHelper = new CsvHelper();
	csvHelper.writeToCsv({
		path: `./outputs/kd/${new Date().toISOString().split('T')[0]}_${stockSetName}.csv`,
		data: signals,
		ids: ['signal', 'symbol', 'cmp', 'sma200', 'sma50', 'sma20'],
		titles: ['signal', 'symbol', 'cmp', 'sma200', 'sma50', 'sma20'],
	})
};

(async () => {
	console.log('Start');
	await test();
	console.log('End');
})();


// const quotes: Quote[] = await yahooFinanceClient.getQuotes({ symbols: ['DIXON', 'POLYCAB'] });

// console.log(quotes);

// const csvHelper = new CsvHelper();
// csvHelper.writeToCsv({
// 	path: `./outputs/quotes/${new Date().toISOString().split('T')[0]}.csv`,
// 	data: quotes,
// 	ids: ['symbol','exchange','name','dayChange','dayChangePercent','dayHigh','dayLow','dayOpen','cmp','fiftyTwoWeekLow','fiftyTwoWeekHigh','epsTrailingTwelveMonths','bookValue','priceToBook','sma50','sma200','marketCap','forwardPE','avgRating'],
// 	titles: ['symbol','exchange','name','dayChange','dayChangePercent','dayHigh','dayLow','dayOpen','cmp','fiftyTwoWeekLow','fiftyTwoWeekHigh','epsTrailingTwelveMonths','bookValue','priceToBook','sma50','sma200','marketCap','forwardPE','avgRating']
// })

// const sma200 = calculateSMA(history.map(x => x.close), 200);
// const strategyV20 = new StrategyV20();
// strategyV20.run(history, 20, sma200);