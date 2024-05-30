import yahooFinance from 'yahoo-finance2';
import { QuoteResponseArray } from 'yahoo-finance2/dist/esm/src/modules/quote';

const round = (num: number) => Math.round(num * 100) / 100;

export default class YahooFinance {
	constructor() { }

	public async getHistoricalData({
		symbol,
		startDate,
		endDate,
	}: {
		symbol: string;
		startDate: string;
		endDate?: string;
	}) {
		const chartResultArray = await yahooFinance.chart(`${symbol}.NS`, {
			period1: startDate,
			period2: endDate,
		});

		const { quotes } = chartResultArray;
		
		const history = quotes.map(x => ({
			symbol,
			high: round(x.high),
			low: round(x.low),
			open: round(x.open),
			close: round(x.close),
			date: x.date.toISOString().split('T')[0],
			volume: x.volume
		}))

		// console.log(history);
		return history;
	}

	public async getQuotes({ symbols }: { symbols: string[] }) {
		const quoteResponseArray: QuoteResponseArray = await yahooFinance.quote(symbols.map(x => `${x}.NS`));
		const quotes = quoteResponseArray.map(x => {
			return {
				symbol: x.symbol.split('.')[0],
				exchange: x.exchange,
				name: x.shortName || x.longName || x.displayName,
				dayChange: round(x.regularMarketChange),
				dayChangePercent: round(x.regularMarketChangePercent),
				dayHigh: round(x.regularMarketDayHigh),
				dayLow: round(x.regularMarketDayLow),
				dayOpen: round(x.regularMarketOpen),
				cmp: round(x.regularMarketPrice),
				fiftyTwoWeekLow: round(x.fiftyTwoWeekLow),
				fiftyTwoWeekHigh: round(x.fiftyTwoWeekHigh),
				epsTrailingTwelveMonths: round(x.epsTrailingTwelveMonths),
				bookValue: round(x.bookValue),
				priceToBook: round(x.priceToBook),
				sma50: round(x.fiftyDayAverage),
				sma200: round(x.twoHundredDayAverage),
				marketCap: round(x.marketCap),
				forwardPE: round(x.forwardPE),
				avgRating: x.averageAnalystRating,
			}
		});

		// console.log(quotes);
		return quotes;
	}
}
