/**
 * Islamic Events Engine
 *
 * Configured list of major Islamic annual events (Hijri calendar).
 * Calculates current event (if today is an event) and nearby upcoming events.
 */

export interface IslamicEventDef {
  day: number
  month: number
  name: string
  nameAr?: string
  category: 'Holiday' | 'Fasting' | 'Commemoration' | 'Hajj' | 'Special Night'
  description: string
}

export interface NearbyEvent {
  name: string
  nameAr?: string
  hijriDay: number
  hijriMonthNumber: number
  hijriMonthName: string
  hijriYear: number
  hijriFormatted: string
  daysRemaining: number
  category: string
  description: string
}

export const HIJRI_MONTH_NAMES_EN = [
  'Muharram',
  'Safar',
  'Rabi\' al-Awwal',
  'Rabi\' al-Thani',
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  'Sha\'ban',
  'Ramadan',
  'Shawwal',
  'Dhu al-Qi\'dah',
  'Dhu al-Hijjah',
]

export const HIJRI_MONTH_NAMES_AR = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الثاني',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
]

export const ISLAMIC_EVENTS: IslamicEventDef[] = [
  {
    day: 1,
    month: 1,
    name: 'Islamic New Year (1st Muharram)',
    nameAr: 'رأس السنة الهجرية',
    category: 'Holiday',
    description: 'Marks the beginning of the new Islamic Hijri year.',
  },
  {
    day: 10,
    month: 1,
    name: 'Day of Ashura',
    nameAr: 'يوم عاشوراء',
    category: 'Fasting',
    description: 'Day of historical significance; recommended voluntary fasting day.',
  },
  {
    day: 12,
    month: 3,
    name: 'Wafat al-Nabi',
    nameAr: 'وفاة النبي',
    category: 'Commemoration',
    description: 'Observance of the death of Prophet Muhammad (ﷺ).',
  },
  {
    day: 27,
    month: 7,
    name: 'Isra and Mi\'raj',
    nameAr: 'الإسراء والمعراج',
    category: 'Special Night',
    description: 'Commemorates the night journey and ascension of Prophet Muhammad (ﷺ).',
  },
  {
    day: 15,
    month: 8,
    name: 'Shab-e-Barat (Mid-Sha\'ban)',
    nameAr: 'ليلة النصف من شعبان',
    category: 'Special Night',
    description: 'Night of forgiveness and preparation for Ramadan.',
  },
  {
    day: 1,
    month: 9,
    name: '1st Day of Ramadan',
    nameAr: 'أول أيام رمضان',
    category: 'Fasting',
    description: 'Beginning of the holy month of fasting from dawn to sunset.',
  },
  {
    day: 1,
    month: 10,
    name: 'Eid al-Fitr (1st Day)',
    nameAr: 'عيد الفطر',
    category: 'Holiday',
    description: 'Islamic festival marking the end of the Ramadan fast.',
  },
  {
    day: 2,
    month: 10,
    name: 'Eid al-Fitr (2nd Day)',
    nameAr: 'ثاني أيام عيد الفطر',
    category: 'Holiday',
    description: 'Second day of Eid al-Fitr celebrations.',
  },
  {
    day: 8,
    month: 12,
    name: 'Day of Tarwiyah (Hajj Begins)',
    nameAr: 'يوم التروية',
    category: 'Hajj',
    description: 'First day of the annual Hajj pilgrimage in Makkah.',
  },
  {
    day: 9,
    month: 12,
    name: 'Day of Arafah',
    nameAr: 'يوم عرفة',
    category: 'Hajj',
    description: 'The peak of Hajj pilgrimage on Mount Arafat; highly recommended fasting day for non-pilgrims.',
  },
  {
    day: 10,
    month: 12,
    name: 'Eid al-Adha',
    nameAr: 'عيد الأضحى',
    category: 'Holiday',
    description: 'Feast of the Sacrifice, honoring Prophet Ibrahim\'s devotion.',
  },
]

export const islamicEventsEngine = {
  /**
   * Get event definition if today matches a configured event.
   */
  getCurrentEvent(hijriDay: number, hijriMonth: number): IslamicEventDef | null {
    return ISLAMIC_EVENTS.find((e) => e.day === hijriDay && e.month === hijriMonth) ?? null
  },

  /**
   * Get all Islamic events occurring in a specific Hijri month and year.
   */
  getMonthEvents(hijriMonth: number, hijriYear: number): NearbyEvent[] {
    const monthName = HIJRI_MONTH_NAMES_EN[hijriMonth - 1] ?? 'Hijri Month'
    return ISLAMIC_EVENTS.filter((e) => e.month === hijriMonth).map((evt) => ({
      name: evt.name,
      nameAr: evt.nameAr,
      hijriDay: evt.day,
      hijriMonthNumber: evt.month,
      hijriMonthName: monthName,
      hijriYear,
      hijriFormatted: `${evt.day} ${monthName} ${hijriYear} AH`,
      daysRemaining: 0,
      category: evt.category,
      description: evt.description,
    }))
  },

  /**
   * Calculate upcoming nearby Islamic events for a given Hijri date.
   */
  getNearbyEvents(currentDay: number, currentMonth: number, currentYear: number, count = 10): NearbyEvent[] {
    const totalDaysCurrent = (currentMonth - 1) * 29.5 + currentDay

    const upcoming = ISLAMIC_EVENTS.map((evt) => {
      let evtYear = currentYear
      let totalDaysEvt = (evt.month - 1) * 29.5 + evt.day

      // If event has passed in the current year, it happens next year
      if (totalDaysEvt < totalDaysCurrent) {
        evtYear += 1
        totalDaysEvt += 354
      }

      const diffDays = Math.round(totalDaysEvt - totalDaysCurrent)
      const monthName = HIJRI_MONTH_NAMES_EN[evt.month - 1] ?? 'Hijri Month'

      return {
        name: evt.name,
        nameAr: evt.nameAr,
        hijriDay: evt.day,
        hijriMonthNumber: evt.month,
        hijriMonthName: monthName,
        hijriYear: evtYear,
        hijriFormatted: `${evt.day} ${monthName} ${evtYear} AH`,
        daysRemaining: diffDays,
        category: evt.category,
        description: evt.description,
      }
    })

    // Sort by days remaining (closest first)
    upcoming.sort((a, b) => a.daysRemaining - b.daysRemaining)
    return upcoming.slice(0, count)
  },
}
