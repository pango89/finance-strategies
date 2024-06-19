import axios from 'axios';
import { round } from '../utils'

const Infinity: number = 99999;

export default class Tickertape {
	constructor() { }

	public async screener({
		minMarketCap = 1000,
		maxMarketCap = 3000000
	}) {
		const payload = JSON.stringify({
			"match": {
				"mrktCapf": {
					"g": minMarketCap,
					"l": maxMarketCap
				}
			},
			"sortBy": "mrktCapf",
			"sortOrder": -1,
			"project": [
				"subindustry",
				"mrktCapf",
				"lastPrice",
				"apef",
				"pbr",
				"ps",
				"evebitd",
				"priceCfoR",
				"divDps",
				"4wpct",
				"26wpct",
				"52wpct",
				"roe",
				"roce",
				"cafCfoa"
			],
			"offset": 0,
			"count": 2000,
			"sids": []
		});

		const config = {
			method: 'post',
			maxBodyLength: Infinity,
			url: 'https://api.tickertape.in/screener/query',
			headers: {
				'Content-Type': 'application/json',
			},
			data: payload
		};

		try {
			const response = await axios.request(config);
			const { success, data } = response.data;

			if (!success) throw new Error();

			const { results, stats } = data;
			const summaries = [];

			for (let i = 0; i < results.length; i++) {
				const { stock } = results[i];
				const { advancedRatios, info } = stock;
				const { ticker: symbol, sector } = info;
				let {
					subindustry: industry, lastPrice: cmp, mrktCapf: marketCap,
					apef: priceToEarnings, pbr: priceToBook, ps: priceToSales,
					priceCfoR: priceToCashflow, evebitd: enterpriseToEbitda,
					divDps: dividendYield, roe: returnOnEquity, roce: returnOnCapitalEmployed,
					cafCfoa: operatingCashflow,
					"4wpct": return1M, "26wpct": return6M, "52wpct": return12M
				} = advancedRatios;

				if (!priceToEarnings || priceToEarnings < 0)
					priceToEarnings = Infinity;

				if (!priceToBook || priceToBook < 0)
					priceToBook = Infinity;

				if (!priceToSales || priceToSales < 0)
					priceToSales = Infinity;

				if (!priceToCashflow || priceToCashflow < 0)
					priceToCashflow = Infinity;

				if (!dividendYield)
					dividendYield = 0;

				if (!enterpriseToEbitda || enterpriseToEbitda < 0)
					enterpriseToEbitda = Infinity;

				if (!returnOnEquity)
					returnOnEquity = -1 * Infinity;

				if (!returnOnCapitalEmployed)
					returnOnCapitalEmployed = -1 * Infinity;

				if (!return12M)
					return12M = -1 * Infinity;

				if (!return6M)
					return6M = -1 * Infinity;

				if (!return1M)
					return1M = -1 * Infinity;

				const summary = {
					symbol,
					sector,
					industry,
					cmp: round(cmp),
					marketCap: round(marketCap),
					priceToEarnings: round(priceToEarnings),
					priceToBook: round(priceToBook),
					priceToSales: round(priceToSales),
					priceToCashflow: round(priceToCashflow),
					enterpriseToEbitda: round(enterpriseToEbitda),
					dividendYield: round(dividendYield),
					returnOnEquity: round(returnOnEquity),
					returnOnCapitalEmployed: round(returnOnCapitalEmployed),
					return1M: round(return1M),
					return6M: round(return6M),
					return12M: round(return12M)
				};

				summaries.push(summary);
				// console.log(summary);
			}

			return summaries;
		} catch (error) {
			console.log(error);
		}
	}
}