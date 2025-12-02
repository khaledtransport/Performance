/**
 * Generate time slots from 7:00 AM to 6:00 PM with 30-minute intervals
 * Returns array of time strings in format "7:00 AM", "7:30 AM", etc.
 */
export function generateTimeSlots(): string[] {
    const slots: string[] = [];

    // Start at 7:00 AM (7), end at 6:00 PM (18)
    for (let hour = 7; hour <= 18; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            // Skip 6:30 PM (we want to stop at 6:00 PM)
            if (hour === 18 && minute > 0) break;

            const hour12 = hour > 12 ? hour - 12 : hour;
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const minuteStr = minute.toString().padStart(2, '0');

            slots.push(`${hour12}:${minuteStr} ${ampm}`);
        }
    }

    return slots;
}

/**
 * Convert time string like "7:00 AM" to 24-hour format "07:00"
 */
export function convertTo24Hour(timeStr: string): string {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return timeStr;

    let [, hourStr, minute, period] = match;
    let hour = parseInt(hourStr);

    if (period.toUpperCase() === 'PM' && hour !== 12) {
        hour += 12;
    } else if (period.toUpperCase() === 'AM' && hour === 12) {
        hour = 0;
    }

    return `${hour.toString().padStart(2, '0')}:${minute}`;
}

/**
 * Convert 24-hour time like "07:00" to 12-hour format with AM/PM
 */
export function convertTo12Hour(time24: string): string {
    const [hourStr, minute] = time24.split(':');
    let hour = parseInt(hourStr);

    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);

    return `${hour12}:${minute} ${ampm}`;
}
