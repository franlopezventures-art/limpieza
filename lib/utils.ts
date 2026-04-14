const dayFormatter = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "2-digit",
  month: "short"
});

const weekFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "long",
  year: "numeric"
});

export function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function isoDate(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function getWeekStart(input?: string) {
  const base = input ? new Date(`${input}T12:00:00`) : new Date();
  const jsDay = base.getDay();
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(base);
  monday.setDate(base.getDate() + diff);
  return isoDate(monday);
}

export function addDays(dateString: string, amount: number) {
  const value = new Date(`${dateString}T12:00:00`);
  value.setDate(value.getDate() + amount);
  return isoDate(value);
}

export function weekDates(weekStart: string) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function formatDayLabel(dateString: string) {
  return dayFormatter.format(new Date(`${dateString}T12:00:00`));
}

export function formatWeekRange(weekStart: string) {
  const end = addDays(weekStart, 6);
  return `${weekFormatter.format(new Date(`${weekStart}T12:00:00`))} - ${weekFormatter.format(new Date(`${end}T12:00:00`))}`;
}

export function formatHours(value: number) {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(value);
}

export function safeNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateHours(startTime: string, endTime: string) {
  if (!startTime || !endTime) {
    return 0;
  }

  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);
  const start = startHours * 60 + startMinutes;
  const end = endHours * 60 + endMinutes;
  const rawMinutes = end >= start ? end - start : 24 * 60 - start + end;
  return Math.round((rawMinutes / 60) * 10) / 10;
}

export function addHoursToTime(startTime: string, hours: number) {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const totalMinutes = startHours * 60 + startMinutes + Math.round(hours * 60);
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

export function addressLabel(location: { street?: string | null; city?: string | null; postal_code?: string | null }) {
  return [location.street, location.postal_code, location.city].filter(Boolean).join(", ");
}

export function buildGoogleMapsLink(latitude?: number | null, longitude?: number | null) {
  if (latitude == null || longitude == null) {
    return "";
  }

  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function buildStreetViewLink(latitude?: number | null, longitude?: number | null) {
  if (latitude == null || longitude == null) {
    return "";
  }

  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}`;
}
