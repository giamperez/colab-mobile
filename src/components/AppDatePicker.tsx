import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import dayjs from 'dayjs';

interface AppDatePickerProps {
  label?: string;
  value: string | null | undefined;
  onChange: (dateStr: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
}

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

// Parses a "YYYY-MM-DD" date-only string as a LOCAL calendar date. Whether a
// bare date string like this gets treated as UTC or local time is ambiguous
// and engine-dependent (native Date treats it as UTC per ISO-8601, which
// rolls the day back by one in negative-offset timezones like Peru) —
// building the Date from explicit year/month/day components sidesteps that
// entirely since the multi-arg Date constructor is always local time.
const parseLocalDateStr = (value: string): dayjs.Dayjs => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return dayjs(value);
  const [, y, m, d] = match;
  return dayjs(new Date(Number(y), Number(m) - 1, Number(d)));
};

export const AppDatePicker: React.FC<AppDatePickerProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
}) => {
  const { colors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const initialDayjs = useMemo(() => {
    return value && parseLocalDateStr(value).isValid() ? parseLocalDateStr(value) : dayjs();
  }, [value]);

  const [viewDate, setViewDate] = useState<dayjs.Dayjs>(initialDayjs);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(initialDayjs);

  useEffect(() => {
    if (value && parseLocalDateStr(value).isValid()) {
      setSelectedDate(parseLocalDateStr(value));
      setViewDate(parseLocalDateStr(value));
    }
  }, [value, modalVisible]);

  const daysInMonth = viewDate.daysInMonth();
  const firstDayIndex = (viewDate.startOf('month').day() + 6) % 7; // Monday = 0

  const handlePrevMonth = () => {
    setViewDate(viewDate.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setViewDate(viewDate.add(1, 'month'));
  };

  const handleSelectDay = (dayNum: number) => {
    const newDate = viewDate.date(dayNum);
    setSelectedDate(newDate);
  };

  const handleConfirm = () => {
    onChange(selectedDate.format('YYYY-MM-DD'));
    setModalVisible(false);
  };

  const handleShortcut = (type: 'today' | 'tomorrow' | 'week' | 'end_month') => {
    let target = dayjs();
    if (type === 'tomorrow') target = target.add(1, 'day');
    else if (type === 'week') target = target.add(7, 'day');
    else if (type === 'end_month') target = target.endOf('month');

    setSelectedDate(target);
    setViewDate(target);
    onChange(target.format('YYYY-MM-DD'));
    setModalVisible(false);
  };

  const formattedDisplay = useMemo(() => {
    if (!value || !parseLocalDateStr(value).isValid()) return placeholder;
    return parseLocalDateStr(value).format('DD MMM YYYY');
  }, [value, placeholder]);

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.labelText, { color: colors.textSecondary }]}>{label}</Text>
      ) : null}

      <TouchableOpacity
        style={[
          styles.inputTrigger,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.border,
          },
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
        <Text
          style={[
            styles.inputText,
            { color: value ? colors.textPrimary : colors.textMuted },
            value && { fontWeight: '600' },
          ]}
        >
          {formattedDisplay}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.pickerCard,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Header / Month Year */}
            <View style={[styles.cardHeader, { borderBottomColor: colors.borderSubtle }]}>
              <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.bgSurface }]} onPress={handlePrevMonth}>
                <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
              </TouchableOpacity>

              <View style={styles.monthTitleBox}>
                <Text style={[styles.monthText, { color: colors.textPrimary }]}>
                  {MONTHS[viewDate.month()]} {viewDate.year()}
                </Text>
              </View>

              <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.bgSurface }]} onPress={handleNextMonth}>
                <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Quick Shortcuts */}
            <View style={styles.shortcutsRow}>
              <TouchableOpacity
                style={[styles.shortcutPill, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
                onPress={() => handleShortcut('today')}
              >
                <Text style={[styles.shortcutText, { color: colors.primary }]}>✨ Hoy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shortcutPill, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
                onPress={() => handleShortcut('tomorrow')}
              >
                <Text style={[styles.shortcutText, { color: colors.textSecondary }]}>⚡ Mañana</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shortcutPill, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
                onPress={() => handleShortcut('week')}
              >
                <Text style={[styles.shortcutText, { color: colors.textSecondary }]}>📅 +1 Sem</Text>
              </TouchableOpacity>
            </View>

            {/* Weekdays row */}
            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map((wd, idx) => (
                <Text key={idx} style={[styles.weekdayText, { color: colors.textMuted }]}>
                  {wd}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <View key={`empty-${idx}`} style={styles.dayCell} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const cellDate = viewDate.date(dayNum);
                const isSelected = selectedDate.isSame(cellDate, 'day');
                const isToday = dayjs().isSame(cellDate, 'day');

                return (
                  <TouchableOpacity
                    key={`day-${dayNum}`}
                    style={[
                      styles.dayCell,
                      isToday && [styles.todayCell, { borderColor: colors.primary }],
                      isSelected && [styles.selectedCell, { backgroundColor: colors.primary, borderColor: colors.primary }],
                    ]}
                    onPress={() => handleSelectDay(dayNum)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: colors.textPrimary },
                        isToday && { color: colors.primary, fontWeight: '800' },
                        isSelected && { color: '#FFFFFF', fontWeight: '900' },
                      ]}
                    >
                      {dayNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer buttons */}
            <View style={[styles.footerRow, { borderTopColor: colors.borderSubtle }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.bgSurface }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmBtnText}>Seleccionar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  inputTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
  },
  inputText: {
    flex: 1,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  monthTitleBox: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 15,
    fontWeight: '800',
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  shortcutPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutText: {
    fontSize: 11,
    fontWeight: '700',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '700',
    width: 36,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    marginVertical: 2,
  },
  todayCell: {
    borderWidth: 1.5,
  },
  selectedCell: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

export default AppDatePicker;
