export function parseCountdownDuration(value: string): number | null {
    const match = /^(\d{2}):([0-5]\d)$/.exec(value);
    if (!match) return null;

    const seconds = Number(match[1]) * 60 + Number(match[2]);
    return seconds > 0 ? seconds : null;
}

export function getCountdownSecondsLeft(deadline: number, now: number): number {
    return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function formatCountdown(secondsLeft: number): string {
    const wholeSeconds = Math.max(0, Math.ceil(secondsLeft));
    const minutes = Math.floor(wholeSeconds / 60);
    const seconds = wholeSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
