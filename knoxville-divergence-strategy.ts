import QuoteHistory from './interfaces/quote-history';
import { calculateSMA, calculateRSI, calculateMomentum, round } from './utils';

export default class KnoxvilleDivergenceStrategy {
	public static getDivergences(
		quoteHistoryArray: QuoteHistory[],
		prices: number[],
		rsiPeriod: number,
		momentumPeriod: number,
		candlesBack: number
	) {
		const n = quoteHistoryArray.length;
		const symbol = quoteHistoryArray[n - 1].symbol;

		const rsi = calculateRSI(prices, rsiPeriod);
		const momentum = calculateMomentum(prices, momentumPeriod);

		const divergences: {
			index: number;
			symbol: string;
			date: string;
			price: number;
			signal: string;
		}[] = [];

		for (let i = candlesBack; i < prices.length; i++) {
			const priceSlice = prices.slice(i - candlesBack, i);
			const rsiSlice = rsi.slice(i - candlesBack, i);

			const highestPrice = Math.max(...priceSlice);
			const lowestPrice = Math.min(...priceSlice);
			const highestRsi = Math.max(...rsiSlice);
			const lowestRsi = Math.min(...rsiSlice);

			if (momentum[i - momentumPeriod] > 0) {
				// Momentum is positive
				if (prices[i] > highestPrice && rsi[i - rsiPeriod] < highestRsi) {
					// Bearish Divergence
					divergences.push({
						index: i,
						signal: 'BEAR-D',
						symbol,
						date: quoteHistoryArray[i].date,
						price: prices[i],
					});
				}
			} else if (momentum[i - momentumPeriod] < 0) {
				// Momentum is negative
				if (prices[i] < lowestPrice && rsi[i - rsiPeriod] > lowestRsi) {
					// Bullish Divergence
					divergences.push({
						index: i,
						signal: 'BULL-D',
						symbol,
						date: quoteHistoryArray[i].date,
						price: prices[i],
					});
				}
			}
		}

		return divergences;
	}

	// public static getDivergences(
	// 	quoteHistoryArray: QuoteHistory[],
	// 	prices: number[],
	// 	rsiPeriod: number,
	// 	rsiSmaPeriod: number,
	// 	smaPeriod: number
	// ) {
	// 	const n = quoteHistoryArray.length;
	// 	const symbol = quoteHistoryArray[n - 1].symbol;

	// 	const rsi = calculateRSI(prices, rsiPeriod);
	// 	const smaRsi = calculateSMA(rsi, rsiSmaPeriod);
	// 	const sma = calculateSMA(prices, smaPeriod);

	// 	const divergences: {
	// 		index: number;
	// 		symbol: string;
	// 		date: string;
	// 		price: number;
	// 		signal: string;
	// 	}[] = [];

	// 	for (let i = rsiSmaPeriod; i < prices.length; i++) {
	// 		if (prices[i] > sma[i]) {
	// 			// Price above SMA
	// 			if (
	// 				prices[i] > prices[i - 1] &&
	// 				smaRsi[i - rsiPeriod] < smaRsi[i - rsiPeriod - 1]
	// 			) {
	// 				// Bearish Divergence
	// 				divergences.push({
	// 					index: i,
	// 					signal: 'BEAR-D',
	// 					symbol,
	// 					date: quoteHistoryArray[i].date,
	// 					price: prices[i],
	// 				});
	// 			}
	// 		} else if (prices[i] < sma[i]) {
	// 			// Price below SMA
	// 			if (
	// 				prices[i] < prices[i - 1] &&
	// 				smaRsi[i - rsiPeriod] > smaRsi[i - rsiPeriod - 1]
	// 			) {
	// 				// Bullish Divergence
	// 				divergences.push({
	// 					index: i,
	// 					signal: 'BULL-D',
	// 					symbol,
	// 					date: quoteHistoryArray[i].date,
	// 					price: prices[i],
	// 				});
	// 			}
	// 		}
	// 	}

	// 	return divergences;
	// }

	// public static run(
	// 	quoteHistoryArray: QuoteHistory[],
	// 	rsiPeriod: number,
	// 	rsiSmaPeriod: number,
	// 	smaPeriod: number
	// ) {
	// 	const n = quoteHistoryArray.length;
	// 	const cmp = quoteHistoryArray[n - 1].close;
	// 	const symbol = quoteHistoryArray[n - 1].symbol;
	// 	const prices = quoteHistoryArray.map((x) => x.close);

	// 	const sma200 = calculateSMA(prices, 200);
	// 	const sma50 = calculateSMA(prices, 50);
	// 	const sma20 = calculateSMA(prices, 20);

	// 	const divergences = KnoxvilleDivergenceStrategy.getDivergences(
	// 		quoteHistoryArray,
	// 		prices,
	// 		rsiPeriod,
	// 		rsiSmaPeriod,
	// 		smaPeriod
	// 	);

	// 	let resultSignal = null;

	// 	if (divergences.length) {
	// 		const { signal, index } = divergences[divergences.length - 1];
	// 		if (signal === 'BULL-D') {
	// 			const hasSMABuySignal =
	// 				cmp < sma20[n - 1] &&
	// 				sma20[n - 1] < sma50[n - 1] &&
	// 				sma50[n - 1] < sma200[n - 1];

	// 			if (cmp <= prices[index] && hasSMABuySignal) {
	// 				resultSignal = {
	// 					signal: 'BUY',
	// 					symbol,
	// 					cmp,
	// 					sma200: sma200[n - 1],
	// 					sma50: sma50[n - 1],
	// 					sma20: sma20[n - 1],
	// 				};
	// 			}
	// 		} else if (signal === 'BEAR-D') {
	// 			const hasSMASellSignal =
	// 				cmp > sma20[n - 1] &&
	// 				sma20[n - 1] > sma50[n - 1] &&
	// 				sma50[n - 1] > sma200[n - 1];

	// 			if (cmp >= prices[index] && hasSMASellSignal) {
	// 				resultSignal = {
	// 					signal: 'SELL',
	// 					symbol,
	// 					cmp,
	// 					sma200: sma200[n - 1],
	// 					sma50: sma50[n - 1],
	// 					sma20: sma20[n - 1],
	// 				};
	// 			}
	// 		}
	// 	}

	// 	return resultSignal;
	// }

	// Knoxville Divergence function with candles back, RSI period, and momentum period
	public static run(
		quoteHistoryArray: QuoteHistory[],
		rsiPeriod: number,
		momentumPeriod: number,
		candlesBack: number
	) {
		const n = quoteHistoryArray.length;
		const cmp = quoteHistoryArray[n - 1].close;
		const symbol = quoteHistoryArray[n - 1].symbol;
		const prices = quoteHistoryArray.map((x) => x.close);

		const sma200 = calculateSMA(prices, 200);
		const sma50 = calculateSMA(prices, 50);
		const sma20 = calculateSMA(prices, 20);

		const divergences = KnoxvilleDivergenceStrategy.getDivergences(
			quoteHistoryArray,
			prices,
			rsiPeriod,
			momentumPeriod,
			candlesBack
		);

		let resultSignal = null;

		if (divergences.length) {
			const { signal, index } = divergences[divergences.length - 1];
			if (signal === 'BULL-D') {
				// const hasSMABuySignal =
				// 	cmp < sma20[n - 1] &&
				// 	sma20[n - 1] < sma50[n - 1] &&
				// 	sma50[n - 1] < sma200[n - 1];

				const hasSMABuySignal = true;

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
				// const hasSMASellSignal =
				// 	cmp > sma20[n - 1] &&
				// 	sma20[n - 1] > sma50[n - 1] &&
				// 	sma50[n - 1] > sma200[n - 1];

				const hasSMASellSignal = true;

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
