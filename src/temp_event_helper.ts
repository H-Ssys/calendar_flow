// Helper script to generate Date objects for mock events
// This will be used to update CalendarContext.tsx

const now = new Date();
const getThisWeek = (dayOffset: number, hour: number, minute: number = 0) => {
    const date = new Date(now);
    const currentDay = (date.getDay() + 6) % 7; // Monday = 0
    date.setDate(date.getDate() - currentDay + dayOffset);
    date.setHours(hour, minute, 0, 0);
    return date;
};

// Event 1: Monday 8:00-9:00
console.log('Event 1:', {
    startTime: getThisWeek(0, 8, 0),
    endTime: getThisWeek(0, 9, 0),
    isAllDay: false
});

// Event 2: Wednesday 7:00-8:00 (changed from 7:00-20:00 which seems wrong)
console.log('Event 2:', {
    startTime: getThisWeek(2, 7, 0),
    endTime: getThisWeek(2, 8, 0),
    isAllDay: false
});

// Event 3: Friday 8:00-9:00
console.log('Event 3:', {
    startTime: getThisWeek(4, 8, 0),
    endTime: getThisWeek(4, 9, 0),
    isAllDay: false
});

// Event 4: Tuesday 9:00-12:00
console.log('Event 4:', {
    startTime: getThisWeek(1, 9, 0),
    endTime: getThisWeek(1, 12, 0),
    isAllDay: false
});

// Event 5: Monday 10:00-13:00
console.log('Event 5:', {
    startTime: getThisWeek(0, 10, 0),
    endTime: getThisWeek(0, 13, 0),
    isAllDay: false
});

// Event 6: Wednesday 10:00-13:00
console.log('Event 6:', {
    startTime: getThisWeek(2, 10, 0),
    endTime: getThisWeek(2, 13, 0),
    isAllDay: false
});

// Event 7: Saturday 10:00-11:00
console.log('Event 7:', {
    startTime: getThisWeek(5, 10, 0),
    endTime: getThisWeek(5, 11, 0),
    isAllDay: false
});

// Event 8: Saturday 11:00-14:00
console.log('Event 8:', {
    startTime: getThisWeek(5, 11, 0),
    endTime: getThisWeek(5, 14, 0),
    isAllDay: false
});

// Event 9: Friday 12:00-15:00
console.log('Event 9:', {
    startTime: getThisWeek(4, 12, 0),
    endTime: getThisWeek(4, 15, 0),
    isAllDay: false
});

// Event 10: Tuesday 14:00-15:00
console.log('Event 10:', {
    startTime: getThisWeek(1, 14, 0),
    endTime: getThisWeek(1, 15, 0),
    isAllDay: false
});

// Event 11: Sunday 8:00-11:00
console.log('Event 11:', {
    startTime: getThisWeek(6, 8, 0),
    endTime: getThisWeek(6, 11, 0),
    isAllDay: false
});
