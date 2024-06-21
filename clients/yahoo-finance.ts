import yahooFinance from 'yahoo-finance2';
import { ModuleOptionsWithValidateTrue } from 'yahoo-finance2/dist/esm/src/lib/moduleCommon';
import { FundamentalsTimeSeriesOptions } from 'yahoo-finance2/dist/esm/src/modules/fundamentalsTimeSeries';
import { QuoteResponseArray } from 'yahoo-finance2/dist/esm/src/modules/quote';
import { QuoteSummaryOptions } from 'yahoo-finance2/dist/esm/src/modules/quoteSummary';
import { round, getFYBeginDate, getPreviousFYEndDate, addDaysToDate } from '../utils';

const Infinity: number = 9999999999;

export default class YahooFinance {
	constructor() { }

	public async getQuoteHistoryOnDay({ symbol, referenceDate }: { symbol: string; referenceDate: string; }) {
		try {
			const endDate = new Date(referenceDate);
			let startDate = new Date(endDate);

			const bufferDays = 10;
			startDate.setDate(endDate.getDate() - bufferDays);

			// Function to format date as YYYY-MM-DD
			const formatDate = (date: Date) => date.toISOString().split('T')[0];

			// Fetch historical data
			const historicalData = await this.getHistoricalData({ symbol, startDate: formatDate(startDate), endDate: addDaysToDate(referenceDate, 1) })

			if (!historicalData || historicalData.length === 0) {
				throw new Error('No historical data found');
			}

			// Get the most recent closing price
			return historicalData[historicalData.length - 1];
		} catch (error) {
			// console.error(`Error fetching history quote for ${symbol} for date ${referenceDate}:`, error);
			return null;
		}
	}

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

	public async getQuoteSummary({ symbol, modules }: { symbol: string; modules: string[]; }) {
		// const querySummaryOptions = {
		// 	modules: ['summaryProfile','defaultKeyStatistics','price','summaryDetail',`financialData`, /*'incomeStatementHistory', // 'balanceSheetHistory'*/]
		// } as QuoteSummaryOptions;

		const querySummaryOptions = {
			modules: [...modules]
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

		const [tr1M, tr3M, tr6M, tr12M] = await this.getTrailingReturns({
			symbol,
			periods: [30, 90, 180, 365],
			referenceDate: new Date().toISOString().split('T')[0]
		});

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
			return12M: round(tr12M.returnPercent),
			return6M: round(tr6M.returnPercent),
			return3M: round(tr3M.returnPercent),
			return1M: round(tr1M.returnPercent)
			// returnOnCapitalEmployed: capitalEmployed !== 0 ? round(100 * operatingIncome / capitalEmployed) : -1 * Infinity, // Percentage
			// debtToEquity: totalStockholderEquity !== 0 ? round(totalLiabilities / totalStockholderEquity) : Infinity
		}

		// console.log({ summary });

		return summary;
	}

	public async getTrailingReturns({ symbol, periods, referenceDate }: { symbol: string; periods: number[]; referenceDate: string; }): Promise<any[]> {
		try {
			// Get the reference date
			const endDate = new Date(referenceDate);
			let startDate = new Date(endDate);

			const bufferDays = 30;
			startDate.setDate(endDate.getDate() - periods[periods.length - 1] - bufferDays);

			// Function to format date as YYYY-MM-DD
			const formatDate = (date: Date) => date.toISOString().split('T')[0];

			// Fetch historical data
			const historicalData = await this.getHistoricalData({ symbol, startDate: formatDate(startDate), endDate: addDaysToDate(referenceDate, 1) })

			if (!historicalData || historicalData.length === 0) {
				throw new Error('No historical data found');
			}

			// Get the most recent closing price
			const latestPrice = historicalData[historicalData.length - 1].close;

			const trailingReturns = [];

			periods.forEach(period => {
				startDate = new Date(endDate);
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
					const startPrice = startData.close;
					const returnPercent = ((latestPrice - startPrice) / startPrice) * 100;
					trailingReturns.push({ returnPercent, startPrice, latestPrice });
				} else {
					trailingReturns.push({ returnPercent: -1 * Infinity, startPrice: Infinity, latestPrice });
				}
			});

			return trailingReturns;
		} catch (error) {
			// console.error(`Error fetching trailing returns for ${symbol}:`, error);
			return [];
		}
	}

	public async getFinancialStatements({ symbol, startDate, endDate, frequency = 'annual' }: { symbol: string; startDate: string; endDate: string; frequency?: string; }) {
		const queryOptions = {
			period1: startDate,
			period2: endDate,
			type: frequency,
			module: 'all'
		} as FundamentalsTimeSeriesOptions;

		const result = await yahooFinance.fundamentalsTimeSeries(`${symbol}.NS`, queryOptions);
		// console.log(result)
		return result;
	}

	public async getHistoricalQuoteSummary({ symbol, referenceDate }: { symbol: string; referenceDate?: string; }) {
		if (!referenceDate)
			referenceDate = new Date().toISOString().split('T')[0];

		try {
			const querySummaryOptions = { modules: ['summaryProfile'] } as QuoteSummaryOptions;
			const { summaryProfile } = await yahooFinance.quoteSummary(`${symbol}.NS`, querySummaryOptions);
			const { industry, sector } = summaryProfile;

			const [tr1M, tr3M, tr6M, tr12M] = await this.getTrailingReturns({
				symbol,
				periods: [30, 90, 180, 365],
				referenceDate
			});

			if (!tr1M) {
				return {
					date: referenceDate,
					symbol,
					industry,
					sector
				}
			}

			const { returnPercent: return1M, latestPrice: cmp } = tr1M;
			const { returnPercent: return3M } = tr3M;
			const { returnPercent: return6M, } = tr6M;
			const { returnPercent: return12M } = tr12M;

			const financialStatements = await this.getFinancialStatements({
				symbol,
				startDate: getPreviousFYEndDate(referenceDate),
				endDate: referenceDate
			});

			if (!financialStatements || financialStatements.length === 0) {
				return {
					date: referenceDate,
					symbol,
					industry,
					sector,
					cmp: round(cmp),
					return12M: round(return12M),
					return6M: round(return6M),
					return3M: round(return3M),
					return1M: round(return1M)
				}
			}

			const latestStatement: any = financialStatements[0];
			const {
				netIncome, dilutedEPS, ordinarySharesNumber, stockholdersEquity,
				totalRevenue, operatingCashFlow, totalDebt, cashAndCashEquivalents,
				interestExpense, taxProvision, depreciation, depreciationIncomeStatement,
				cashDividendsPaid, freeCashFlow
			} = latestStatement;

			const eps = netIncome / ordinarySharesNumber;

			const priceToEarnings = cmp / (dilutedEPS || eps);
			const marketCap = cmp * ordinarySharesNumber;
			const priceToBook = cmp / (stockholdersEquity / ordinarySharesNumber);
			const priceToSales = cmp / (totalRevenue / ordinarySharesNumber);
			const priceToCashflow = cmp / ((operatingCashFlow || freeCashFlow) / ordinarySharesNumber);
			const enterpriseValue = marketCap + (totalDebt || 0) - (cashAndCashEquivalents || 0);

			const ebitda = netIncome + (interestExpense || 0) + (taxProvision || 0) + (depreciation || depreciationIncomeStatement || 0);
			const enterpriseToEbitda = enterpriseValue / ebitda;

			const dividendYield = 100 * (-1 * (cashDividendsPaid || -0) / ordinarySharesNumber) / cmp;
			const returnOnEquity = 100 * netIncome / stockholdersEquity;

			const summary = {
				date: referenceDate,
				symbol,
				cmp: round(cmp),
				industry,
				sector,
				marketCap: Math.ceil(marketCap / 10000000), // converted to crores
				priceToEarnings: round(priceToEarnings),
				priceToBook: round(priceToBook),
				priceToSales: round(priceToSales),
				priceToCashflow: round(priceToCashflow),
				enterpriseToEbitda: round(enterpriseToEbitda),
				dividendYield: round(dividendYield), // Percentage
				returnOnEquity: round(returnOnEquity),
				return12M: round(return12M),
				return6M: round(return6M),
				return3M: round(return3M),
				return1M: round(return1M)
			}

			// console.log({ summary });

			return summary;
		} catch (error) {
			console.error(`Error occurred in getHistoricalQuoteSummary`, error);
			return {
				date: referenceDate,
				symbol,
			}
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
