import QuoteHistory from './interfaces/quote-history';
import { calculateSMA, calculateEMA } from './utils';

export default class MACDStrategy {
	public static calculateMACD(
		prices: number[],
		shortPeriod: number,
		longPeriod: number,
		signalPeriod: number
	) {
		const n = prices.length;
		if (n < longPeriod) return; // Ensure we have enough data points

		const shortEMA = calculateEMA(prices, shortPeriod);
		const longEMA = calculateEMA(prices, longPeriod);

		const macd = shortEMA.map((ema, index) => ema - longEMA[index]);
		const signal = calculateEMA(macd, signalPeriod);
		const histogram = macd.map((macd, index) => macd - signal[index]);


		return {
			macd, signal, histogram
		};
	}

	public static getDivergences(
		quoteHistoryArray: QuoteHistory[],
		prices: number[],
		shortPeriod: number,
		longPeriod: number,
		signalPeriod: number
	) {
		const n = quoteHistoryArray.length;
		const symbol = quoteHistoryArray[n - 1].symbol;

		const { macd, signal, histogram } = MACDStrategy.calculateMACD(prices, shortPeriod, longPeriod, signalPeriod);;
		const divergences: {
			index: number;
			symbol: string;
			date: string;
			price: number;
			signal: string;
		}[] = [];

		for (let i = 1; i < macd.length; i++) {
			const prevMACD = macd[i - 1];
			const prevSignal = signal[i - 1];

			const currMACD = macd[i];
			const currSignal = signal[i];

			const isBelowZeroLine: boolean = (prevMACD < 0) && (prevSignal < 0) && (currMACD < 0) && (currSignal < 0);
			const isAboveZeroLine: boolean = (prevMACD > 0) && (prevSignal > 0) && (currMACD > 0) && (currSignal > 0);

			if (prevMACD < prevSignal && currMACD > currSignal && isBelowZeroLine) {
				// Bullish crossover
				divergences.push({
					index: i,
					signal: 'BULL-D',
					symbol,
					date: quoteHistoryArray[i].date,
					price: prices[i],
				});
			} else if (prevMACD > prevSignal && currMACD < currSignal && isAboveZeroLine) {
				// Bearish crossover
				divergences.push({
					index: i,
					signal: 'BEAR-D',
					symbol,
					date: quoteHistoryArray[i].date,
					price: prices[i],
				});
			}
		}

		return divergences;
	}

	// MACD function
	public static run(
		quoteHistoryArray: QuoteHistory[],
		shortPeriod: number,
		longPeriod: number,
		signalPeriod: number
	) {
		const n = quoteHistoryArray.length;
		const cmp = quoteHistoryArray[n - 1].close;
		const symbol = quoteHistoryArray[n - 1].symbol;
		const prices = quoteHistoryArray.map((x) => x.close);

		const sma200 = calculateSMA(prices, 200);
		const sma50 = calculateSMA(prices, 50);
		const sma20 = calculateSMA(prices, 20);


		const divergences = MACDStrategy.getDivergences(
			quoteHistoryArray,
			prices,
			shortPeriod,
			longPeriod,
			signalPeriod
		);

		let resultSignal = null;

		if (divergences.length) {
			const { signal, index } = divergences[divergences.length - 1];
			if (signal === 'BULL-D') {
				const hasSMABuySignal =
					cmp < sma20[n - 1] &&
					sma20[n - 1] < sma50[n - 1] &&
					sma50[n - 1] < sma200[n - 1];

				// const hasSMABuySignal = true;

				if (cmp <= prices[index] && hasSMABuySignal) {
					resultSignal = {
						signal: 'BUY',
						symbol,
						cmp,
						sma200: sma200[n - 1],
						sma50: sma50[n - 1],
						sma20: sma20[n - 1],
					};
				}
			} else if (signal === 'BEAR-D') {
				const hasSMASellSignal =
					cmp > sma20[n - 1] &&
					sma20[n - 1] > sma50[n - 1] &&
					sma50[n - 1] > sma200[n - 1];

				// const hasSMASellSignal = true;

				if (cmp >= prices[index] && hasSMASellSignal) {
					resultSignal = {
						signal: 'SELL',
						symbol,
						cmp,
						sma200: sma200[n - 1],
						sma50: sma50[n - 1],
						sma20: sma20[n - 1],
					};
				}
			}
		}

		return resultSignal;
	}
}
