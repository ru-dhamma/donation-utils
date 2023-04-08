export function toMoney(amount: string | number): number {
    if (typeof amount === 'string') {
        return parseFloat(`${amount}`.replaceAll(' ', '').replaceAll(',', '.'));
    }
    return amount;
}

export function toMoneyValue(money: string | number, precision: number = 0): string {
    if (typeof money === 'string') {
        money = toMoney(money);
    }
    let real: string;
    let fraction: string;
    [real, fraction] = money.toFixed(precision).split('.', 2);
    return precision ? `${real},${fraction}` : real;
}

export function formatMoney(money: string | number, precision: number = 0): string {
    if (typeof money === 'string') {
        money = toMoney(money);
    }
    let real: string;
    let fraction: string;
    [real, fraction] = money.toFixed(precision).split('.', 2);
    const parts: string[] = [];
    while (real.length > 3) {
        const l = real.length;
        parts.unshift(real.substring(l - 3, l));
        real = real.substring(0, l - 3);
    }
    if (real !== '') {
        parts.unshift(real);
    }
    real = parts.join(' ');
    money = precision ? `${real},${fraction}` : real;
    return `${money} ₽`;
}
