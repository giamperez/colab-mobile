import dayjs from 'dayjs';
import type { User, GanttItem, PriorityLevel } from '../types';

export interface ParsedTaskPrompt {
  title: string;
  description?: string;
  date?: string; // YYYY-MM-DD
  time?: string; // e.g. "17:00"
  timeFormatted?: string; // e.g. "5:00 PM"
  assigneeId?: number;
  assigneeName?: string;
  priority?: PriorityLevel;
  projectId?: number;
  projectName?: string;
}

const normalizeText = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

const MONTHS: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

// Matches absolute calendar dates like "el 3 de septiembre" or "3 de septiembre de 2027"
const ABSOLUTE_DATE_REGEX =
  /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de\s+(\d{4}))?\b/;

export function parseTaskPrompt(
  prompt: string,
  availableUsers: User[] = [],
  availableProjects: GanttItem[] = []
): ParsedTaskPrompt {
  const rawText = prompt.trim();
  if (!rawText) {
    return { title: '' };
  }

  const norm = normalizeText(rawText);
  let detectedDate: string | undefined;
  let detectedTime: string | undefined;
  let detectedTimeFormatted: string | undefined;
  let detectedAssignee: User | undefined;
  let detectedPriority: PriorityLevel = 'media';
  let detectedProject: GanttItem | undefined;

  // 1. TIME EXTRACTION
  // Patterns: "a las 5 de la tarde", "para las 5:30 pm", "a las 10 am", "17:00", "5pm", "5 pm"
  const timeRegex = /(?:a\s+las|para\s+las|a\s+la|para\s+la)\s+(\d{1,2})(?::(\d{2}))?\s*(?:de\s+la\s+(tarde|manana|noche)|am|pm)?/i;
  const directTimeRegex = /(\d{1,2}):(\d{2})\s*(am|pm)?/i;
  const pmAmRegex = /(\d{1,2})\s*(am|pm)/i;

  let timeMatch = norm.match(timeRegex);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const period = timeMatch[3]; // tarde, manana, noche, am, pm

    if (period === 'tarde' || period === 'noche' || period === 'pm') {
      if (hours < 12) hours += 12;
    } else if (period === 'manana' || period === 'am') {
      if (hours === 12) hours = 0;
    }

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    detectedTime = `${hh}:${mm}`;

    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    detectedTimeFormatted = `${displayHour}:${mm === '00' ? '00' : mm} ${ampm}`;
  } else {
    timeMatch = norm.match(directTimeRegex);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const period = timeMatch[3];
      if (period === 'pm' && hours < 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;

      const hh = String(hours).padStart(2, '0');
      const mm = String(minutes).padStart(2, '0');
      detectedTime = `${hh}:${mm}`;
      const displayHour = hours % 12 === 0 ? 12 : hours % 12;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      detectedTimeFormatted = `${displayHour}:${mm} ${ampm}`;
    } else {
      timeMatch = norm.match(pmAmRegex);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const period = timeMatch[2];
        if (period === 'pm' && hours < 12) hours += 12;
        if (period === 'am' && hours === 12) hours = 0;
        const hh = String(hours).padStart(2, '0');
        detectedTime = `${hh}:00`;
        const displayHour = hours % 12 === 0 ? 12 : hours % 12;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        detectedTimeFormatted = `${displayHour}:00 ${ampm}`;
      }
    }
  }

  // 2. DATE EXTRACTION
  const today = dayjs();
  const absoluteDateMatch = norm.match(ABSOLUTE_DATE_REGEX);
  if (absoluteDateMatch) {
    const day = parseInt(absoluteDateMatch[1], 10);
    const month = MONTHS[absoluteDateMatch[2]];
    const explicitYear = absoluteDateMatch[3] ? parseInt(absoluteDateMatch[3], 10) : undefined;
    let candidate = dayjs(new Date(explicitYear ?? today.year(), month, day));
    // No year given and the date already passed this year → assume next year
    if (candidate.isValid() && explicitYear === undefined && candidate.isBefore(today, 'day')) {
      candidate = candidate.add(1, 'year');
    }
    if (candidate.isValid()) {
      detectedDate = candidate.format('YYYY-MM-DD');
    }
  } else if (norm.includes('pasado manana') || norm.includes('pasado mañana')) {
    detectedDate = today.add(2, 'day').format('YYYY-MM-DD');
  } else if (
    norm.includes('el dia de manana') ||
    norm.includes('el dia de mañana') ||
    norm.includes('dia de manana') ||
    norm.includes('dia de mañana') ||
    /\bmanana\b|\bmañana\b/.test(norm)
  ) {
    detectedDate = today.add(1, 'day').format('YYYY-MM-DD');
  } else if (norm.includes('el dia de hoy') || norm.includes('dia de hoy') || /\bhoy\b/.test(norm)) {
    detectedDate = today.format('YYYY-MM-DD');
  } else if (norm.includes('fin de semana')) {
    // Saturday or Sunday of current/next cycle
    const dayOfWeek = today.day();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    detectedDate = today.add(daysUntilSaturday, 'day').format('YYYY-MM-DD');
  } else {
    // Check "en X dias"
    const inDaysMatch = norm.match(/en\s+(\d+)\s+dias?/);
    if (inDaysMatch) {
      const daysCount = parseInt(inDaysMatch[1], 10);
      detectedDate = today.add(daysCount, 'day').format('YYYY-MM-DD');
    } else {
      // Check weekdays: "el viernes", "este lunes", etc.
      for (const [wName, wDay] of Object.entries(WEEKDAYS)) {
        const pattern = new RegExp(`(?:el|este|proximo|para el)?\\s*\\b${wName}\\b`, 'i');
        if (pattern.test(norm)) {
          const currentDay = today.day();
          let diff = wDay - currentDay;
          if (diff <= 0) diff += 7; // next occurrence
          detectedDate = today.add(diff, 'day').format('YYYY-MM-DD');
          break;
        }
      }
    }
  }

  // 3. PRIORITY EXTRACTION
  if (
    norm.includes('muy urgente') ||
    norm.includes('urgente') ||
    norm.includes('asap') ||
    norm.includes('prioridad alta') ||
    norm.includes('alta prioridad')
  ) {
    detectedPriority = 'alta';
  } else if (
    norm.includes('baja prioridad') ||
    norm.includes('prioridad baja') ||
    norm.includes('cuando puedas') ||
    norm.includes('sin apuro')
  ) {
    detectedPriority = 'baja';
  }

  // 4. ASSIGNEE EXTRACTION
  // Look for users whose name or first name is mentioned in prompt
  if (availableUsers && availableUsers.length > 0) {
    // First try explicitly following "con", "para", "a", "asignar a", "responsable"
    const assigneePrepositionRegex = /(?:con|para|asignar a|responsable|a cargo de)\s+([a-záéíóúñ]+)/gi;
    const prepMatches = [...norm.matchAll(assigneePrepositionRegex)];

    for (const match of prepMatches) {
      const targetName = match[1];
      const found = availableUsers.find((u) => {
        const uNorm = normalizeText(u.nombre || u.name || '');
        const uParts = uNorm.split(/\s+/);
        return uParts.some((p) => p === targetName || (p.length >= 3 && targetName.startsWith(p)));
      });
      if (found) {
        detectedAssignee = found;
        break;
      }
    }

    // If still not found, search each user's first name as a discrete word in prompt
    if (!detectedAssignee) {
      for (const u of availableUsers) {
        const uNorm = normalizeText(u.nombre || u.name || '');
        const firstName = uNorm.split(/\s+/)[0];
        if (firstName && firstName.length >= 3) {
          const regex = new RegExp(`\\b${firstName}\\b`, 'i');
          if (regex.test(norm)) {
            detectedAssignee = u;
            break;
          }
        }
      }
    }
  }

  // 5. PROJECT EXTRACTION
  if (availableProjects && availableProjects.length > 0) {
    for (const p of availableProjects) {
      const pTitle = normalizeText(p.title || p.nombre || '');
      if (pTitle && pTitle.length >= 4 && norm.includes(pTitle)) {
        detectedProject = p;
        break;
      }
    }
  }

  // 6. CLEAN TITLE & DESCRIPTION GENERATION
  // Remove boilerplate like "crear reunion con juan para las 5 de la tarde del dia de manana"
  let clean = rawText;

  // Remove command prefixes
  clean = clean.replace(/^(?:crear|agendar|programar|planificar|añadir|agregar|hacer|nueva|nuevo)\s+/i, '');
  clean = clean.replace(/^(?:una?\s+)?(?:tarea|reunión|reunion|cita|llamada)\s*(?:de|con|para)?\s*/i, (match) => {
    // If the word was reunión, preserve it as capitalized prefix
    if (/reuni[oó]n/i.test(match)) {
      return 'Reunión con ';
    }
    if (/llamada/i.test(match)) {
      return 'Llamada con ';
    }
    return '';
  });

  // Remove date and time phrases from title
  clean = clean
    .replace(/(?:del?\s+)?(?:día\s+de\s+)?(?:mañana|manana|hoy|pasado\s+mañana|pasado\s+manana)/gi, '')
    .replace(/(?:para\s+el|el|este|próximo)?\s*(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)/gi, '')
    .replace(/(?:para\s+el|el)?\s*\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de\s+\d{4})?/gi, '')
    .replace(/(?:para\s+las|a\s+las|a\s+la|para\s+la)\s+\d{1,2}(?::\d{2})?\s*(?:de\s+la\s+(?:tarde|mañana|manana|noche)|am|pm)?/gi, '')
    .replace(/\b\d{1,2}:\d{2}\s*(?:am|pm)?\b/gi, '')
    .replace(/\b\d{1,2}\s*(?:am|pm)\b/gi, '')
    .replace(/\b(?:urgente|muy urgente|asap)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If clean title becomes too short, fall back to a polished title
  if (clean.length < 3) {
    if (detectedAssignee) {
      clean = `Reunión con ${detectedAssignee.nombre || detectedAssignee.name}`;
    } else {
      clean = rawText;
    }
  }

  // Ensure nice title capitalization
  clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  clean = clean.replace(/\s+con\s*$/i, ''); // clean trailing dangling "con"

  // Build a nice description if time or details exist
  const descParts: string[] = [];
  if (detectedTimeFormatted) {
    descParts.push(`⏰ Hora: ${detectedTimeFormatted} (${detectedTime})`);
  }
  if (detectedAssignee) {
    descParts.push(`👤 Con: ${detectedAssignee.nombre || detectedAssignee.name}`);
  }
  if (detectedDate) {
    descParts.push(`📅 Fecha: ${dayjs(detectedDate).format('DD/MM/YYYY')}`);
  }
  descParts.push(`📝 Solicitud original: "${rawText}"`);

  return {
    title: clean,
    description: descParts.join('\n'),
    date: detectedDate,
    time: detectedTime,
    timeFormatted: detectedTimeFormatted,
    assigneeId: detectedAssignee?.id,
    assigneeName: detectedAssignee?.nombre || detectedAssignee?.name,
    priority: detectedPriority,
    projectId: detectedProject?.id,
    projectName: detectedProject?.title || detectedProject?.nombre,
  };
}
