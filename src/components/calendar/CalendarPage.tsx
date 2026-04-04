import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Video,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  X,
  RefreshCw,
  CalendarPlus,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Bell,
  Settings2,
  Eye,
  MessageSquare
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import * as calendarDb from '../../services/calendarDb';
import { Calendar, Appointment, CalendarStats } from '../../services/calendarDb';

type ViewMode = 'day' | 'week' | 'month';

export function CalendarPage() {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const calendarsData = await calendarDb.getCalendars();
      const appointmentsData = await calendarDb.getAppointments({
        calendarId: selectedCalendar || undefined,
        startDate: getStartDate().toISOString(),
        endDate: getEndDate().toISOString(),
      });
      const statsData = await calendarDb.getCalendarStats(selectedCalendar || undefined);
      
      // Enrich appointments with calendar data
      const enrichedAppointments = (appointmentsData || []).map((apt: any) => {
        const cal = calendarsData.find((c: Calendar) => c.id === apt.calendar_id);
        return {
          ...apt,
          calendar_name: cal?.name || 'Agenda',
          calendar_color: cal?.color || '#3B82F6',
        };
      });
      
      setCalendars(calendarsData || []);
      setAppointments(enrichedAppointments);
      setStats(statsData);
      
      if (calendarsData && calendarsData.length > 0 && !selectedCalendar) {
        setSelectedCalendar(calendarsData[0].id);
      }
    } catch (err) {
      console.error('Calendar: Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCalendar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStartDate = () => {
    const date = new Date(currentDate);
    if (viewMode === 'week') {
      date.setDate(date.getDate() - date.getDay());
    } else if (viewMode === 'month') {
      date.setDate(1);
    }
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const getEndDate = () => {
    const date = new Date(currentDate);
    if (viewMode === 'week') {
      date.setDate(date.getDate() + (6 - date.getDay()));
    } else if (viewMode === 'month') {
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
    }
    date.setHours(23, 59, 59, 999);
    return date;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const filteredAppointments = useMemo(() => {
    if (!searchTerm) return appointments;
    const term = searchTerm.toLowerCase();
    return appointments.filter(apt =>
      apt.client_name?.toLowerCase().includes(term) ||
      apt.title?.toLowerCase().includes(term) ||
      apt.description?.toLowerCase().includes(term) ||
      apt.client_phone?.includes(term)
    );
  }, [appointments, searchTerm]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
      pending: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: <Clock size={14} /> },
      confirmed: { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle2 size={14} /> },
      completed: { color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: <Check size={14} /> },
      cancelled: { color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', icon: <XCircle size={14} /> },
      no_show: { color: 'text-slate-600', bg: 'bg-slate-100 border-slate-200', icon: <AlertCircle size={14} /> },
    };
    return configs[status] || configs.pending;
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-start shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <CalendarPlus size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              Agenda <span className="text-[10px] font-bold bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full uppercase ml-1">Beta</span>
            </h2>
            <p className="text-sm text-slate-500 font-medium">Gerencie seus agendamentos e disponibilidade</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
            title="Configurações de Agenda"
          >
            <Settings2 size={18} className="text-slate-500" />
          </button>
          <button
            onClick={() => { setSelectedAppointment(null); setShowCreateModal(true); }}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300"
          >
            <Plus size={18} />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <StatCard
            icon={<CalendarIcon size={18} />}
            label="Hoje"
            value={stats.todayAppointments}
            subValue="agendamentos"
            color="indigo"
          />
          <StatCard
            icon={<Clock size={18} />}
            label="Pendentes"
            value={stats.pendingAppointments}
            subValue="aguardando"
            color="amber"
          />
          <StatCard
            icon={<CheckCircle2 size={18} />}
            label="Confirmados"
            value={stats.confirmedAppointments}
            subValue="esta semana"
            color="emerald"
          />
          <StatCard
            icon={<DollarSign size={18} />}
            label="Faturamento"
            value={`R$ ${stats.totalRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
            subValue="concluídos"
            color="purple"
          />
        </div>
      )}

      {/* Calendar Selector & Navigation */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        {/* Calendar Tabs */}
        <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setSelectedCalendar(null)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
              !selectedCalendar
                ? "bg-slate-800 text-white"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Users size={14} />
            Todas
          </button>
          {calendars.map((cal) => (
            <button
              key={cal.id}
              onClick={() => setSelectedCalendar(cal.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                selectedCalendar === cal.id
                  ? "text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
              style={{ backgroundColor: selectedCalendar === cal.id ? cal.color : undefined }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: cal.color }}
              />
              {cal.name}
            </button>
          ))}
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={goToToday}
            className="px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            Hoje
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all"
            >
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            <span className="text-sm font-bold text-slate-800 min-w-[160px] text-center">
              {formatDateHeader(currentDate, viewMode)}
            </span>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all"
            >
              <ChevronRight size={18} className="text-slate-600" />
            </button>
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-md transition-all capitalize",
                  viewMode === mode
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3 shrink-0">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar agendamentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>
        <button
          onClick={loadData}
          className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
          title="Atualizar"
        >
          <RefreshCw size={18} className={cn("text-slate-500", loading && "animate-spin")} />
        </button>
      </div>

      {/* Calendar View */}
      <div className="flex-1 overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Week/Day Header */}
            <div className="grid border-b border-slate-200 shrink-0"
              style={{ gridTemplateColumns: viewMode === 'day' ? '1fr' : `60px repeat(${viewMode === 'week' ? 7 : 5}, 1fr)` }}>
              {viewMode !== 'day' && (
                <div className="p-3 text-xs font-bold text-slate-500 border-r border-slate-100" />
              )}
              {(viewMode === 'week' ? getWeekDays(currentDate) : getMonthDays(currentDate)).map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-3 text-center border-r border-slate-100 last:border-r-0",
                    isToday(day.date) && "bg-indigo-50"
                  )}
                >
                  <p className="text-xs font-bold text-slate-500 uppercase">
                    {day.dayName}
                  </p>
                  <p className={cn(
                    "text-lg font-black mt-1",
                    isToday(day.date) ? "text-indigo-600" : "text-slate-800"
                  )}>
                    {day.dayNumber}
                  </p>
                </div>
              ))}
            </div>

            {/* Time Slots / Appointments */}
            <div className="flex-1 overflow-y-auto">
              {viewMode === 'day' ? (
                <DayView
                  date={currentDate}
                  appointments={filteredAppointments}
                  calendars={calendars}
                  onSelectAppointment={(apt) => { setSelectedAppointment(apt); setShowDetailModal(true); }}
                  selectedCalendar={selectedCalendar}
                />
              ) : (
                <WeekMonthView
                  viewMode={viewMode}
                  currentDate={currentDate}
                  appointments={filteredAppointments}
                  calendars={calendars}
                  onSelectAppointment={(apt) => { setSelectedAppointment(apt); setShowDetailModal(true); }}
                  selectedCalendar={selectedCalendar}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateAppointmentModal
            calendars={calendars}
            selectedCalendarId={selectedCalendar}
            onClose={() => setShowCreateModal(false)}
            onCreate={loadData}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDetailModal && selectedAppointment && (
          <AppointmentDetailModal
            appointment={selectedAppointment}
            onClose={() => setShowDetailModal(false)}
            onUpdate={loadData}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettingsModal && (
          <CalendarSettingsModal
            calendars={calendars}
            onClose={() => setShowSettingsModal(false)}
            onUpdate={loadData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// StatCard Component
// ============================================

function StatCard({
  icon,
  label,
  value,
  subValue,
  color
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subValue: string;
  color: 'indigo' | 'amber' | 'emerald' | 'purple';
}) {
  const colors = {
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", colors[color].bg)}>
          <span className={colors[color].text}>{icon}</span>
        </div>
        <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
      </div>
      <p className="text-2xl font-black text-slate-800">{value}</p>
      <p className="text-xs text-slate-500">{subValue}</p>
    </div>
  );
}

// ============================================
// Day View Component
// ============================================

function DayView({
  date,
  appointments,
  calendars,
  onSelectAppointment,
  selectedCalendar
}: {
  date: Date;
  appointments: Appointment[];
  calendars: Calendar[];
  onSelectAppointment: (apt: Appointment) => void;
  selectedCalendar: string | null;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.start_time).toDateString();
    return aptDate === date.toDateString();
  });

  return (
    <div className="relative">
      {hours.map((hour) => (
        <div key={hour} className="flex border-b border-slate-100 min-h-[60px]">
          <div className="w-16 py-2 pr-3 text-right text-xs font-bold text-slate-400 border-r border-slate-100 shrink-0">
            {hour.toString().padStart(2, '0')}:00
          </div>
          <div className="flex-1 relative">
            {dayAppointments
              .filter(apt => new Date(apt.start_time).getHours() === hour)
              .map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  calendar={calendars.find(c => c.id === apt.calendar_id)}
                  onClick={() => onSelectAppointment(apt)}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Week/Month View Component
// ============================================

function WeekMonthView({
  viewMode,
  currentDate,
  appointments,
  calendars,
  onSelectAppointment,
  selectedCalendar
}: {
  viewMode: 'week' | 'month';
  currentDate: Date;
  appointments: Appointment[];
  calendars: Calendar[];
  onSelectAppointment: (apt: Appointment) => void;
  selectedCalendar: string | null;
}) {
  const days = viewMode === 'week' ? getWeekDays(currentDate) : getMonthDays(currentDate);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid h-full" style={{ gridTemplateColumns: viewMode === 'month' ? `repeat(7, 1fr)` : `60px repeat(7, 1fr)` }}>
        {viewMode === 'week' && (
          <div className="border-r border-slate-100" />
        )}
        {days.map((day, dayIndex) => (
          <div
            key={dayIndex}
            className={cn(
              "border-r border-slate-100 last:border-r-0 p-1",
              isToday(day.date) && "bg-indigo-50/50"
            )}
          >
            {viewMode === 'week' ? (
              // Week view: show hours
              <WeekDayColumn
                date={day.date}
                appointments={appointments}
                calendars={calendars}
                onSelectAppointment={onSelectAppointment}
              />
            ) : (
              // Month view: compact
              <MonthDayCell
                date={day.date}
                appointments={appointments}
                calendars={calendars}
                onSelectAppointment={onSelectAppointment}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekDayColumn({
  date,
  appointments,
  calendars,
  onSelectAppointment
}: {
  date: Date;
  appointments: Appointment[];
  calendars: Calendar[];
  onSelectAppointment: (apt: Appointment) => void;
}) {
  const dayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.start_time);
    return aptDate.toDateString() === date.toDateString();
  });

  const calendar = calendars[0];

  return (
    <div className="space-y-1">
      {dayAppointments.slice(0, 5).map((apt) => (
        <div
          key={apt.id}
          onClick={() => onSelectAppointment(apt)}
          className={cn(
            "p-1.5 rounded-lg text-xs cursor-pointer transition-all hover:scale-[1.02]",
            apt.status === 'confirmed' && "bg-emerald-100 text-emerald-800",
            apt.status === 'pending' && "bg-amber-100 text-amber-800",
            apt.status === 'cancelled' && "bg-slate-100 text-slate-500 line-through"
          )}
          style={{ borderLeft: `3px solid ${apt.calendar_color || '#3B82F6'}` }}
        >
          <p className="font-bold truncate">{apt.client_name}</p>
          <p className="text-[10px] opacity-75">
            {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
          </p>
        </div>
      ))}
      {dayAppointments.length > 5 && (
        <p className="text-[10px] text-slate-500 text-center font-bold">
          +{dayAppointments.length - 5} mais
        </p>
      )}
    </div>
  );
}

function MonthDayCell({
  date,
  appointments,
  calendars,
  onSelectAppointment
}: {
  date: Date;
  appointments: Appointment[];
  calendars: Calendar[];
  onSelectAppointment: (apt: Appointment) => void;
}) {
  const dayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.start_time);
    return aptDate.toDateString() === date.toDateString();
  });

  return (
    <div className={cn(
      "min-h-[80px] p-1 rounded-lg transition-colors",
      isToday(date) && "bg-indigo-100"
    )}>
      <p className={cn(
        "text-xs font-bold mb-1",
        isToday(date) ? "text-indigo-600" : "text-slate-500"
      )}>
        {date.getDate()}
      </p>
      <div className="space-y-0.5">
        {dayAppointments.slice(0, 3).map((apt) => (
          <div
            key={apt.id}
            onClick={() => onSelectAppointment(apt)}
            className={cn(
              "p-0.5 rounded text-[10px] font-medium truncate cursor-pointer",
              apt.status === 'confirmed' && "bg-emerald-500 text-white",
              apt.status === 'pending' && "bg-amber-500 text-white",
              apt.status === 'cancelled' && "bg-slate-300 text-slate-600"
            )}
          >
            {formatTime(apt.start_time)} {apt.client_name?.split(' ')[0]}
          </div>
        ))}
        {dayAppointments.length > 3 && (
          <p className="text-[10px] text-slate-500 font-bold">
            +{dayAppointments.length - 3}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// Appointment Card
// ============================================

function AppointmentCard({
  appointment,
  calendar,
  onClick
}: {
  appointment: Appointment;
  calendar?: Calendar;
  onClick: () => void;
}) {
  const startHour = new Date(appointment.start_time).getHours();
  const duration = appointment.duration_minutes || 60;
  const height = (duration / 60) * 60;

  return (
    <div
      onClick={onClick}
      className={cn(
        "absolute left-0 right-0 p-2 rounded-lg cursor-pointer transition-all hover:shadow-md",
        appointment.status === 'confirmed' && "bg-emerald-500/90 text-white",
        appointment.status === 'pending' && "bg-amber-500/90 text-white",
        appointment.status === 'cancelled' && "bg-slate-300/90 text-slate-600",
        appointment.status === 'completed' && "bg-blue-500/90 text-white"
      )}
      style={{
        top: '2px',
        height: `${height}px`,
        borderLeft: `4px solid ${appointment.calendar_color || calendar?.color || '#3B82F6'}`
      }}
    >
      <p className="font-bold text-sm truncate">{appointment.client_name}</p>
      <p className="text-xs opacity-80">
        {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
      </p>
      {height > 50 && appointment.title && (
        <p className="text-xs opacity-70 truncate mt-1">{appointment.title}</p>
      )}
    </div>
  );
}

// ============================================
// Create Appointment Modal
// ============================================

function CreateAppointmentModal({
  calendars,
  selectedCalendarId,
  onClose,
  onCreate
}: {
  calendars: Calendar[];
  selectedCalendarId: string | null;
  onClose: () => void;
  onCreate: () => void;
}) {
  const [formData, setFormData] = useState({
    calendar_id: selectedCalendarId || (calendars[0]?.id || ''),
    client_name: '',
    client_phone: '',
    client_email: '',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration_minutes: 60,
    status: 'pending',
    location: '',
    price: 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_name || !formData.date || !formData.time) return;

    setSaving(true);
    try {
      const startTime = `${formData.date}T${formData.time}:00`;
      const endDate = new Date(startTime);
      endDate.setMinutes(endDate.getMinutes() + formData.duration_minutes);
      const endTime = endDate.toISOString();

      const result = await calendarDb.createAppointment({
        calendar_id: formData.calendar_id || undefined,
        client_name: formData.client_name,
        client_phone: formData.client_phone || undefined,
        client_email: formData.client_email || undefined,
        title: formData.title || undefined,
        description: formData.description || undefined,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: formData.duration_minutes,
        status: 'pending',
        location: formData.location || undefined,
        price: formData.price,
      });

      if (result) {
        onCreate();
        onClose();
      } else {
        alert('Erro ao criar agendamento. Verifique os dados.');
      }
    } catch (err) {
      console.error('Erro ao criar agendamento:', err);
      alert('Erro ao criar agendamento: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const selectedCalendar = calendars.find(c => c.id === formData.calendar_id);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-800">Novo Agendamento</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Calendar Selector */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Agenda</label>
            <select
              value={formData.calendar_id}
              onChange={(e) => setFormData({ ...formData, calendar_id: e.target.value })}
              className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium"
            >
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>
          </div>

          {/* Client Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Nome do Cliente *</label>
              <input
                type="text"
                required
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Telefone</label>
              <input
                type="tel"
                value={formData.client_phone}
                onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
                placeholder="5548999999999"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
              <input
                type="email"
                value={formData.client_email}
                onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Data *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Hora *</label>
              <input
                type="time"
                required
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Duração</label>
              <select
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hora</option>
                <option value={90}>1h 30min</option>
                <option value={120}>2 horas</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Descrição/Serviço</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm resize-none"
              rows={2}
              placeholder="Descrição do serviço ou consulta..."
            />
          </div>

          {/* Price */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Valor (R$)</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
              placeholder="0.00"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !formData.client_name}
              className="flex-1 px-4 py-2.5 bg-indigo-500 rounded-xl text-white font-bold text-sm hover:bg-indigo-600 disabled:opacity-50"
            >
              {saving ? 'Criando...' : 'Criar Agendamento'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// Appointment Detail Modal
// ============================================

function AppointmentDetailModal({
  appointment,
  onClose,
  onUpdate
}: {
  appointment: Appointment;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: Appointment['status']) => {
    setUpdating(true);
    await calendarDb.updateAppointmentStatus(appointment.id, newStatus);
    onUpdate();
    onClose();
    setUpdating(false);
  };

  const handleCancel = async () => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;
    setUpdating(true);
    await calendarDb.cancelAppointment(appointment.id);
    onUpdate();
    onClose();
    setUpdating(false);
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-100' },
      confirmed: { label: 'Confirmado', color: 'text-emerald-600', bg: 'bg-emerald-100' },
      completed: { label: 'Concluído', color: 'text-blue-600', bg: 'bg-blue-100' },
      cancelled: { label: 'Cancelado', color: 'text-rose-600', bg: 'bg-rose-100' },
      no_show: { label: 'Não Compareceu', color: 'text-slate-600', bg: 'bg-slate-100' },
    };
    return configs[status] || configs.pending;
  };

  const statusConfig = getStatusConfig(appointment.status);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-6"
          style={{ backgroundColor: appointment.calendar_color || '#3B82F6' }}
        >
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="text-sm opacity-80">{appointment.calendar_name}</p>
              <h3 className="text-xl font-black">{appointment.client_name}</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status */}
          <div className={cn("px-4 py-2 rounded-xl text-center font-bold", statusConfig.bg, statusConfig.color)}>
            {statusConfig.label}
          </div>

          {/* Date & Time */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <CalendarIcon size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800">
                {formatDateLong(appointment.start_time)}
              </p>
              <p className="text-sm text-slate-500">
                {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
              </p>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            {appointment.client_phone && (
              <a
                href={`tel:${appointment.client_phone}`}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <Phone size={16} className="text-slate-400" />
                <span className="text-sm font-medium">{appointment.client_phone}</span>
              </a>
            )}
            {appointment.client_email && (
              <a
                href={`mailto:${appointment.client_email}`}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <Mail size={16} className="text-slate-400" />
                <span className="text-sm font-medium">{appointment.client_email}</span>
              </a>
            )}
            {appointment.location && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <MapPin size={16} className="text-slate-400" />
                <span className="text-sm font-medium">{appointment.location}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {appointment.description && (
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-600">{appointment.description}</p>
            </div>
          )}

          {/* Price */}
          {appointment.price > 0 && (
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
              <span className="font-bold text-amber-800">Valor</span>
              <span className="text-xl font-black text-amber-700">
                R$ {appointment.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            {appointment.status === 'pending' && (
              <button
                onClick={() => handleStatusChange('confirmed')}
                disabled={updating}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 rounded-xl text-white font-bold text-sm hover:bg-emerald-600 disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                Confirmar
              </button>
            )}
            {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
              <>
                <button
                  onClick={() => handleStatusChange('completed')}
                  disabled={updating}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 rounded-xl text-white font-bold text-sm hover:bg-blue-600 disabled:opacity-50"
                >
                  <Check size={16} />
                  Concluir
                </button>
                <button
                  onClick={handleCancel}
                  disabled={updating}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500 rounded-xl text-white font-bold text-sm hover:bg-rose-600 disabled:opacity-50"
                >
                  <XCircle size={16} />
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// Calendar Settings Modal
// ============================================

function CalendarSettingsModal({
  calendars,
  onClose,
  onUpdate
}: {
  calendars: Calendar[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCalendar, setNewCalendar] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    service_duration: 60,
    location: '',
    location_type: 'office' as const,
  });
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalendar.name) return;

    setSaving(true);
    await calendarDb.createCalendar(newCalendar);
    setShowCreateForm(false);
    setNewCalendar({ name: '', description: '', color: '#3B82F6', service_duration: 60, location: '', location_type: 'office' });
    onUpdate();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta agenda?')) return;
    await calendarDb.deleteCalendar(id);
    onUpdate();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-800">Configurar Agendas</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Existing Calendars */}
          <div className="space-y-3 mb-6">
            <h4 className="text-sm font-bold text-slate-500 uppercase">Agendas</h4>
            {calendars.map((cal) => (
              <div
                key={cal.id}
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl"
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: cal.color }}
                />
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{cal.name}</p>
                  <p className="text-xs text-slate-500">
                    {cal.service_duration}min • {cal.location || 'Sem local definido'}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(cal.id)}
                  className="p-2 hover:bg-rose-100 rounded-lg text-rose-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Create New */}
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              <Plus size={18} />
              Nova Agenda
            </button>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4 p-4 bg-slate-50 rounded-xl">
              <h4 className="font-bold text-slate-700">Nova Agenda</h4>
              <input
                type="text"
                required
                value={newCalendar.name}
                onChange={(e) => setNewCalendar({ ...newCalendar, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
                placeholder="Nome do profissional"
              />
              <input
                type="text"
                value={newCalendar.description}
                onChange={(e) => setNewCalendar({ ...newCalendar, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
                placeholder="Descrição do serviço"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500">Cor</label>
                  <input
                    type="color"
                    value={newCalendar.color}
                    onChange={(e) => setNewCalendar({ ...newCalendar, color: e.target.value })}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Duração padrão</label>
                  <select
                    value={newCalendar.service_duration}
                    onChange={(e) => setNewCalendar({ ...newCalendar, service_duration: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hora</option>
                    <option value={90}>1h 30min</option>
                    <option value={120}>2 horas</option>
                  </select>
                </div>
              </div>
              <input
                type="text"
                value={newCalendar.location}
                onChange={(e) => setNewCalendar({ ...newCalendar, location: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
                placeholder="Local do atendimento"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-600 font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-indigo-500 rounded-xl text-white font-bold text-sm"
                >
                  {saving ? 'Salvando...' : 'Criar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// Helper Functions
// ============================================

function formatDateHeader(date: Date, mode: ViewMode): string {
  if (mode === 'day') {
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  if (mode === 'week') {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function formatDateLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

interface DayInfo {
  date: Date;
  dayNumber: number;
  dayName: string;
}

function getWeekDays(currentDate: Date): DayInfo[] {
  const start = new Date(currentDate);
  start.setDate(currentDate.getDate() - currentDate.getDay());
  
  const days: DayInfo[] = [];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    days.push({
      date,
      dayNumber: date.getDate(),
      dayName: dayNames[i],
    });
  }
  return days;
}

function getMonthDays(currentDate: Date): DayInfo[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const days: DayInfo[] = [];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  // Add days from previous month to fill first week
  const startDayOfWeek = firstDay.getDay();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push({
      date,
      dayNumber: date.getDate(),
      dayName: dayNames[date.getDay()],
    });
  }
  
  // Add all days of current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    days.push({
      date,
      dayNumber: d,
      dayName: dayNames[date.getDay()],
    });
  }
  
  // Add days from next month to fill last week
  const remainingDays = 7 - (days.length % 7);
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        dayNumber: i,
        dayName: dayNames[date.getDay()],
      });
    }
  }
  
  return days;
}
