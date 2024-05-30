import { createObjectCsvWriter } from 'csv-writer';

export default class CsvHelper {
	constructor() {}

	public async writeToCsv({
		path,
		data,
		ids,
		titles,
	}: {
		path: string;
		data: any[];
		ids: string[];
		titles: string[];
	}): Promise<void> {
		const csvWriter = createObjectCsvWriter({
			path,
			header: ids.map((id, idx) => {
				return {
					id,
					title: titles[idx],
				};
			}),
		});

		for (let i = 0; i < data.length; i += 1) {
			const item = data[i];
			await csvWriter.writeRecords([{ ...item }]);
		}
	}
}
