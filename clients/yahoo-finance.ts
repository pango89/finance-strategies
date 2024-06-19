import yahooFinance from 'yahoo-finance2';
import { QuoteResponseArray } from 'yahoo-finance2/dist/esm/src/modules/quote';
import { QuoteSummaryOptions } from 'yahoo-finance2/dist/esm/src/modules/quoteSummary';

const round = (num: number) => Math.round(num * 100) / 100;
const Infinity: number = 9999999999;

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

		// console.log(quoteResponseArray);
		return quotes;
	}

	public async getQuoteSummary({ symbol }: { symbol: string; }) {
		const querySummaryOptions = {
			modules: [
				'summaryProfile',
				'defaultKeyStatistics',
				'price',
				'summaryDetail',
				`financialData`,
				// 'incomeStatementHistory',
				// 'balanceSheetHistory'
			]
		} as QuoteSummaryOptions;
		const result = await yahooFinance.quoteSummary(`${symbol}.NS`, querySummaryOptions);
		console.log(result);

		const { summaryDetail, defaultKeyStatistics, summaryProfile, price, financialData, incomeStatementHistory, balanceSheetHistory } = result;

		const { trailingPE, dividendYield, marketCap } = summaryDetail;
		const { industry, sector } = summaryProfile;
		const { priceToBook, pegRatio, enterpriseToEbitda, /* "52WeekChange": return1Y */ } = defaultKeyStatistics;
		const { returnOnEquity, totalRevenue, operatingCashflow, earningsGrowth } = financialData;
		const { regularMarketPrice } = price;
		// const { operatingIncome } = incomeStatementHistory.incomeStatementHistory[0];
		// const { totalAssets, totalCurrentLiabilities, totalLiab: totalLiabilities, totalStockholderEquity } = balanceSheetHistory.balanceSheetStatements[0];

		// const capitalEmployed = totalAssets - totalCurrentLiabilities;

		const [return1M, return3M, return6M, return12M] = await this.getTrailingReturns({ symbol, periods: [30, 90, 180, 365] });

		const summary = {
			symbol,
			industry,
			sector,
			cmp: round(regularMarketPrice),
			marketCap: round(marketCap),
			priceToEarnings: round(trailingPE),
			priceToBook: round(priceToBook),
			priceToSales: totalRevenue !== 0 ? round(marketCap / totalRevenue) : Infinity,
			priceToCashflow: operatingCashflow !== 0 ? round(marketCap / operatingCashflow) : Infinity,
			enterpriseToEbitda: round(enterpriseToEbitda),
			dividendYield: round(100 * dividendYield), // Percentage
			returnOnEquity: round(100 * returnOnEquity), // Percentage
			priceToEarningsGrowth: round(pegRatio),
			return12M: round(return12M),
			return6M: round(return6M),
			return3M: round(return3M),
			return1M: round(return1M)
			// returnOnCapitalEmployed: capitalEmployed !== 0 ? round(100 * operatingIncome / capitalEmployed) : -1 * Infinity, // Percentage
			// debtToEquity: totalStockholderEquity !== 0 ? round(totalLiabilities / totalStockholderEquity) : Infinity
		}

		console.log({ summary });

		return summary;
	}

	public async getTrailingReturns({ symbol, periods }: { symbol: string; periods: number[]; }): Promise<number[]> {
		try {
			// Get the current date
			const endDate = new Date();

			// Function to format date as YYYY-MM-DD
			const formatDate = (date: Date) => date.toISOString().split('T')[0];

			// Fetch historical data
			const historicalData = await this.getHistoricalData({ symbol, startDate: '2023-06-01' })

			if (!historicalData || historicalData.length === 0) {
				throw new Error('No historical data found');
			}

			// Get the most recent closing price
			const latestClose = historicalData[historicalData.length - 1].close;

			const trailingReturns: number[] = [];

			periods.forEach(period => {
				const startDate = new Date(endDate);
				startDate.setDate(endDate.getDate() - period);

				// Find the closest date's closing price to the start date
				let startData = historicalData.find(data => data.date.split('T')[0] === formatDate(startDate));

				// If exact startDate data is not found, find the nearest previous date with data
				if (!startData) {
					for (let i = 1; i <= period; i++) {
						const previousDate = new Date(startDate);
						previousDate.setDate(startDate.getDate() - i);
						startData = historicalData.find(data => data.date.split('T')[0] === formatDate(previousDate));
						if (startData) break;
					}
				}

				if (startData) {
					const startClose = startData.close;
					const returnPercent = ((latestClose - startClose) / startClose) * 100;
					trailingReturns.push(returnPercent);
				} else {
					trailingReturns.push(-1 * Infinity);
				}
			});

			return trailingReturns;
		} catch (error) {
			console.error(`Error fetching trailing returns for ${symbol}:`, error);
			return null;
		}
	}
}

/*
Quote Summary Supports the following modules

"assetProfile" | 
"balanceSheetHistory" | 
"balanceSheetHistoryQuarterly" | 
"calendarEvents" | 
"cashflowStatementHistory" | 
"cashflowStatementHistoryQuarterly" | 
"defaultKeyStatistics" | 
"earnings" | 
"earningsHistory" | 
"earningsTrend" | 
"financialData" | 
"fundOwnership" | 
"fundPerformance" | 
"fundProfile" | 
"incomeStatementHistory" | 
"incomeStatementHistoryQuarterly" | 
"indexTrend" | 
"industryTrend" | 
"insiderHolders" | 
"insiderTransactions" | 
"institutionOwnership" | 
"majorDirectHolders" | 
"majorHoldersBreakdown" | 
"netSharePurchaseActivity" | 
"price" | 
"quoteType" | 
"recommendationTrend" | 
"secFilings" | 
"sectorTrend" | 
"summaryDetail" | 
"summaryProfile" | 
"topHoldings" | 
"upgradeDowngradeHistory"

*/
