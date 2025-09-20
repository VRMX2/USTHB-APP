const moment = require('moment');

// Set default timezone for Algeria
moment.locale('en');

/**
 * Get current date in Algeria timezone
 */
const getCurrentDate = () => {
  return moment().utcOffset(1); // Algeria is UTC+1
};

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} format - Format string (default: 'DD/MM/YYYY HH:mm')
 */
const formatDate = (date, format = 'DD/MM/YYYY HH:mm') => {
  return moment(date).utcOffset(1).format(format);
};

/**
 * Format date for API response
 * @param {Date|string} date - Date to format
 */
const formatDateForAPI = (date) => {
  return moment(date).utcOffset(1).format('YYYY-MM-DD HH:mm:ss');
};

/**
 * Get start of academic year (September 1st)
 * @param {number} year - Academic year
 */
const getAcademicYearStart = (year = null) => {
  const currentYear = year || getCurrentDate().year();
  return moment(`${currentYear}-09-01`).startOf('day');
};

/**
 * Get end of academic year (August 31st)
 * @param {number} year - Academic year
 */
const getAcademicYearEnd = (year = null) => {
  const currentYear = year || getCurrentDate().year();
  return moment(`${currentYear + 1}-08-31`).endOf('day');
};

/**
 * Get current semester based on date
 */
const getCurrentSemester = () => {
  const now = getCurrentDate();
  const month = now.month() + 1; // moment months are 0-based
  
  if (month >= 9 || month <= 1) {
    return 'S1'; // September - January
  } else if (month >= 2 && month <= 6) {
    return 'S2'; // February - June
  } else {
    return 'Summer'; // July - August
  }
};

/**
 * Get semester dates
 * @param {string} semester - Semester code (S1, S2)
 * @param {number} year - Academic year
 */
const getSemesterDates = (semester, year = null) => {
  const currentYear = year || getCurrentDate().year();
  
  switch (semester) {
    case 'S1':
      return {
        start: moment(`${currentYear}-09-01`).startOf('day'),
        end: moment(`${currentYear + 1}-01-31`).endOf('day')
      };
    case 'S2':
      return {
        start: moment(`${currentYear + 1}-02-01`).startOf('day'),
        end: moment(`${currentYear + 1}-06-30`).endOf('day')
      };
    default:
      return null;
  }
};

/**
 * Calculate days until date
 * @param {Date|string} targetDate - Target date
 */
const daysUntil = (targetDate) => {
  const target = moment(targetDate);
  const now = getCurrentDate();
  return target.diff(now, 'days');
};

/**
 * Calculate time ago
 * @param {Date|string} date - Date to compare
 */
const timeAgo = (date) => {
  return moment(date).utcOffset(1).fromNow();
};

/**
 * Check if date is in the past
 * @param {Date|string} date - Date to check
 */
const isPast = (date) => {
  return moment(date).isBefore(getCurrentDate());
};

/**
 * Check if date is in the future
 * @param {Date|string} date - Date to check
 */
const isFuture = (date) => {
  return moment(date).isAfter(getCurrentDate());
};

/**
 * Check if date is today
 * @param {Date|string} date - Date to check
 */
const isToday = (date) => {
  return moment(date).isSame(getCurrentDate(), 'day');
};

/**
 * Get week number in semester
 * @param {Date|string} date - Date to check
 * @param {string} semester - Semester code
 * @param {number} year - Academic year
 */
const getWeekInSemester = (date, semester, year = null) => {
  const semesterDates = getSemesterDates(semester, year);
  if (!semesterDates) return null;
  
  const targetDate = moment(date);
  const startDate = semesterDates.start;
  
  if (targetDate.isBefore(startDate)) return 0;
  
  return targetDate.diff(startDate, 'weeks') + 1;
};

/**
 * Get exam period dates (usually last 3 weeks of semester)
 * @param {string} semester - Semester code
 * @param {number} year - Academic year
 */
const getExamPeriodDates = (semester, year = null) => {
  const semesterDates = getSemesterDates(semester, year);
  if (!semesterDates) return null;
  
  const examStart = semesterDates.end.clone().subtract(3, 'weeks').startOf('week');
  const examEnd = semesterDates.end.clone();
  
  return {
    start: examStart,
    end: examEnd
  };
};

/**
 * Generate class schedule times
 * @param {string} timeSlot - Time slot (e.g., '08:00-09:30')
 */
const parseTimeSlot = (timeSlot) => {
  const [startTime, endTime] = timeSlot.split('-');
  return {
    start: startTime,
    end: endTime,
    duration: moment(endTime, 'HH:mm').diff(moment(startTime, 'HH:mm'), 'minutes')
  };
};

/**
 * Get typical USTHB class schedule time slots
 */
const getClassTimeSlots = () => {
  return [
    '08:00-09:30',
    '09:45-11:15',
    '11:30-13:00',
    '13:15-14:45',
    '15:00-16:30',
    '16:45-18:15'
  ];
};

/**
 * Check if current time is within class hours
 */
const isClassHours = () => {
  const now = getCurrentDate();
  const hour = now.hour();
  return hour >= 8 && hour <= 18;
};

/**
 * Get Algerian holidays (academic calendar relevant ones)
 * @param {number} year - Year to get holidays for
 */
const getAlgerianHolidays = (year = null) => {
  const currentYear = year || getCurrentDate().year();
  
  return [
    { name: 'New Year\'s Day', date: `${currentYear}-01-01` },
    { name: 'Amazigh New Year', date: `${currentYear}-01-12` },
    { name: 'Labour Day', date: `${currentYear}-05-01` },
    { name: 'Independence Day', date: `${currentYear}-07-05` },
    { name: 'Revolution Day', date: `${currentYear}-11-01` }
    // Note: Islamic holidays vary by year and would need calculation
  ];
};

/**
 * Calculate business days between two dates (excluding weekends and holidays)
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 */
const calculateBusinessDays = (startDate, endDate) => {
  const start = moment(startDate);
  const end = moment(endDate);
  let businessDays = 0;
  
  const current = start.clone();
  while (current.isSameOrBefore(end, 'day')) {
    // Skip weekends (Friday and Saturday in Algeria)
    if (current.day() !== 5 && current.day() !== 6) {
      businessDays++;
    }
    current.add(1, 'day');
  }
  
  return businessDays;
};

/**
 * Get next business day
 * @param {Date|string} date - Starting date
 */
const getNextBusinessDay = (date = null) => {
  const startDate = date ? moment(date) : getCurrentDate();
  let nextDay = startDate.clone().add(1, 'day');
  
  // Skip weekends
  while (nextDay.day() === 5 || nextDay.day() === 6) {
    nextDay.add(1, 'day');
  }
  
  return nextDay;
};

module.exports = {
  getCurrentDate,
  formatDate,
  formatDateForAPI,
  getAcademicYearStart,
  getAcademicYearEnd,
  getCurrentSemester,
  getSemesterDates,
  daysUntil,
  timeAgo,
  isPast,
  isFuture,
  isToday,
  getWeekInSemester,
  getExamPeriodDates,
  parseTimeSlot,
  getClassTimeSlots,
  isClassHours,
  getAlgerianHolidays,
  calculateBusinessDays,
  getNextBusinessDay
};