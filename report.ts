import { round, getDurationInDays } from './utils';

export default class Report {
	public static generateTradeReportSummary(
		trades: { symbol: string; date: string; price: number; signal: string }[]
	) {
		let len = trades.length;
		if (len < 2) return [];

		let lastIndex = len % 2 === 0 ? len - 1 : len - 2; // remove extra buy signal at end

		const report = [];

		for (let i = 1; i <= lastIndex; i += 2) {
			const { symbol, date: buyDate, price: buyPrice } = trades[i - 1];
			const { date: sellDate, price: sellPrice } = trades[i];

			const gain = round(sellPrice - buyPrice);
			const gainPercent = round((100 * (sellPrice - buyPrice)) / buyPrice);
			const days = getDurationInDays(buyDate, sellDate);
			const annualGainPercent = round((gainPercent / days) * 365);

			const reportEntry = {
				symbol,
				buyDate,
				buyPrice,
				sellDate,
				sellPrice,
				gain,
				gainPercent,
				days,
				annualGainPercent,
			};

			report.push(reportEntry);
		}

		return report;
	}
}
