export const round = (num: number) => Math.round(num * 100) / 100;

export const calculateSMA = (data: number[], period: number): number[] => {
    const sma: number[] = [];
    let sum = 0;

    for (let i = 0; i < period; i++) {
        sum += data[i];
        sma.push(round(sum / (i + 1)));
    }

    for (let i = period; i < data.length; i++) {
        sum += data[i] - data[i - period];
        sma.push(round(sum / period));
    }

    return sma;
};

export const calculateRSI = (prices: number[], period: number): number[] => {
    const rsi: number[] = [];
    let gainSum = 0;
    let lossSum = 0;

    for (let i = 1; i < period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) {
            gainSum += change;
        } else {
            lossSum -= change;
        }
    }

    for (let i = period; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        let gain = 0;
        let loss = 0;

        if (change > 0) {
            gain = change;
        } else {
            loss = -change;
        }

        gainSum = (gainSum * (period - 1) + gain) / period;
        lossSum = (lossSum * (period - 1) + loss) / period;

        const rs = gainSum / lossSum;
        rsi.push(round(100 - 100 / (1 + rs)));
    }

    return rsi;
};

export const delay = async (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
