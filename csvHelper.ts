import { createObjectCsvWriter } from 'csv-writer';
import * as fs from 'fs';
import * as csv from 'csv-parser';

export default class CsvHelper {
	constructor() { }

	public async writeToCsv({
		path,
		data,
		ids,
		titles,
		append = false
	}: {
		path: string;
		data: any[];
		ids: string[];
		titles: string[];
		append?: boolean;
	}): Promise<void> {
		const csvWriter = createObjectCsvWriter({
			path,
			header: ids.map((id, idx) => {
				return {
					id,
					title: titles[idx],
				};
			}),
			append
		});

		for (let i = 0; i < data.length; i += 1) {
			const item = data[i];

			for (const [key, value] of Object.entries(item)) {
				const regex = /^-?\d*\.\d+$/;
				if (regex.test(value as string)) {
					item[key] = (+value).toFixed(2);
				}
			}

			await csvWriter.writeRecords([{ ...item }]);
		}
	}

	public async readFromCsv({ path }: { path: string; }): Promise<any[]> {
		return new Promise((resolve, reject) => {
			const csvRows = [];

			fs.createReadStream(path)
				.pipe(csv())
				.on('data', (data) => {
					for (const [key, value] of Object.entries(data)) {
						const regex = /^-?\d+(\.\d+)?$/;
						if (regex.test(value as string)) {
							data[key] = +value;
						}
					}
					csvRows.push(data)
				})
				.on('end', () => {
					resolve(csvRows);
				});
		});
	}
}
