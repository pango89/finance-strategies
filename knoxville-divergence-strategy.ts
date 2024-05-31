import QuoteHistory from './interfaces/quote-history';
import { calculateSMA, calculateRSI, round } from './utils';

export default class KnoxvilleDivergenceStrategy {
	public static run(
		quoteHistoryArray: QuoteHistory[],
		rsiPeriod: number,
		rsiSmaPeriod: number,
		smaPeriod: number
	) {
		const n = quoteHistoryArray.length;

		const cmp = quoteHistoryArray[n - 1].close;
		const symbol = quoteHistoryArray[n - 1].symbol;

		const prices = quoteHistoryArray.map((x) => x.close);

		const rsi = calculateRSI(prices, rsiPeriod);
		const smaRsi = calculateSMA(rsi, rsiSmaPeriod);
		const sma = calculateSMA(prices, smaPeriod);

		const sma200 = calculateSMA(prices, 200);
		const sma50 = calculateSMA(prices, 50);
		const sma20 = calculateSMA(prices, 20);

		const divergences: {
			index: number;
			signal: string;
		}[] = [];

		for (let i = rsiSmaPeriod; i < prices.length; i++) {
			if (prices[i] > sma[i]) {
				// Price above SMA
				if (
					prices[i] > prices[i - 1] &&
					smaRsi[i - rsiPeriod] < smaRsi[i - rsiPeriod - 1]
				) {
					// Bearish Divergence
					divergences.push({ index: i, signal: 'BEAR-D' });
				}
			} else if (prices[i] < sma[i]) {
				// Price below SMA
				if (
					prices[i] < prices[i - 1] &&
					smaRsi[i - rsiPeriod] > smaRsi[i - rsiPeriod - 1]
				) {
					// Bullish Divergence
					divergences.push({ index: i, signal: 'BULL-D' });
				}
			}
		}

		let resultSignal = null;

		if (divergences.length) {
			const { signal, index } = divergences[divergences.length - 1];
			if (signal === 'BULL-D') {
				const hasSMABuySignal =
					cmp < sma20[n - 1] &&
					sma20[n - 1] < sma50[n - 1] &&
					sma50[n - 1] < sma200[n - 1];

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