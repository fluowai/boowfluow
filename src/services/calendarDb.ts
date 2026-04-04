import { supabase } from '../lib/supabase';

// ============================================
// TYPES
// ============================================

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  color: string;
  service_duration: number;
  buffer_time: number;
  location?: string;
  location_type: 'office' | 'home' | 'online' | 'client';
  calendar_type: 'appointment' | 'block' | 'availability';
  business_hours: BusinessHours;
  allow_cancellation_hours: number;
  allow_reschedule_hours: number;
  require_confirmation: boolean;
  auto_confirm_appointments: boolean;
  send_reminders: boolean;
  reminder_times: number[];
  is_active: boolean;
  assigned_agent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  enabled: boolean;
  start: string;
  end: string;
}

export interface Appointment {
  id: string;
  calendar_id?: string;
  calendar_name?: string;
  calendar_color?: string;
  client_name: string;
  client_phone?: string;
  client_email?: string;
  lead_id?: string;
  lead_name?: string;
  lead_phone?: string;
  title?: string;
  description?: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'rescheduled';
  status_history: StatusChange[];
  location?: string;
  location_type: 'office' | 'home' | 'online' | 'client';
  meeting_link?: string;
  price: number;
  is_paid: boolean;
  payment_method?: string;
  created_by_agent?: string;
  agent_notes?: string;
  source: 'manual' | 'whatsapp' | 'widget' | 'api' | 'ai_agent';
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  completed_at?: string;
}

export interface StatusChange {
  status: string;
  changed_at: string;
  previous_status?: string;
  changed_by?: string;
}

export interface BlockedTime {
  id: string;
  calendar_id: string;
  start_time: string;
  end_time: string;
  reason?: string;
  block_type: 'block' | 'vacation' | 'holiday' | 'meeting' | 'busy';
  recurrence_rule?: Record<string, any>;
  created_at: string;
}

export interface AvailableSlot {
  slot_start: string;
  slot_end: string;
}

// ============================================
// CALENDARS CRUD
// ============================================

export async function getCalendars(agentId?: string): Promise<Calendar[]> {
  let query = supabase
    .from('calendars')
    .select('*')
    .order('name');

  if (agentId) {
    query = query.eq('assigned_agent_id', agentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Calendar: Erro ao buscar agendas:', error);
    return [];
  }

  return data || [];
}

export async function getCalendarById(id: string): Promise<Calendar | null> {
  const { data, error } = await supabase
    .from('calendars')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Calendar: Erro ao buscar agenda:', error);
    return null;
  }

  return data;
}

export async function createCalendar(calendar: Partial<Calendar>): Promise<Calendar | null> {
  const { data, error } = await supabase
    .from('calendars')
    .insert([{
      name: calendar.name,
      description: calendar.description,
      color: calendar.color || '#3B82F6',
      service_duration: calendar.service_duration || 60,
      buffer_time: calendar.buffer_time || 15,
      location: calendar.location,
      location_type: calendar.location_type || 'office',
      business_hours: calendar.business_hours || getDefaultBusinessHours(),
      is_active: true,
    }])
    .select()
    .single();

  if (error) {
    console.error('Calendar: Erro ao criar agenda:', error);
    return null;
  }

  return data;
}

export async function updateCalendar(id: string, updates: Partial<Calendar>): Promise<boolean> {
  const { error } = await supabase
    .from('calendars')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Calendar: Erro ao atualizar agenda:', error);
    return false;
  }

  return true;
}

export async function deleteCalendar(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('calendars')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Calendar: Erro ao deletar agenda:', error);
    return false;
  }

  return true;
}

function getDefaultBusinessHours(): BusinessHours {
  return {
    monday: { enabled: true, start: '09:00', end: '18:00' },
    tuesday: { enabled: true, start: '09:00', end: '18:00' },
    wednesday: { enabled: true, start: '09:00', end: '18:00' },
    thursday: { enabled: true, start: '09:00', end: '18:00' },
    friday: { enabled: true, start: '09:00', end: '18:00' },
    saturday: { enabled: false, start: '09:00', end: '13:00' },
    sunday: { enabled: false, start: '09:00', end: '13:00' },
  };
}

// ============================================
// APPOINTMENTS CRUD
// ============================================

export async function getAppointments(filters?: {
  calendarId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  leadId?: string;
}): Promise<Appointment[]> {
  let query = supabase
    .from('appointments')
    .select('*')
    .order('start_time');

  if (filters?.calendarId) {
    query = query.eq('calendar_id', filters.calendarId);
  }
  if (filters?.startDate) {
    query = query.gte('start_time', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('start_time', filters.endDate);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.leadId) {
    query = query.eq('lead_id', filters.leadId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Calendar: Erro ao buscar agendamentos:', error);
    return [];
  }

  return data || [];
}

export async function getAppointmentsByDate(date: string, calendarId?: string): Promise<Appointment[]> {
  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59`;

  return getAppointments({
    calendarId,
    startDate: startOfDay,
    endDate: endOfDay,
  });
}

export async function getTodayAppointments(): Promise<Appointment[]> {
  const today = new Date().toISOString().split('T')[0];
  return getAppointmentsByDate(today);
}

export async function getUpcomingAppointments(days: number = 7): Promise<Appointment[]> {
  const startDate = new Date().toISOString();
  const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  return getAppointments({ startDate, endDate });
}

export async function getAppointmentById(id: string): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Calendar: Erro ao buscar agendamento:', error);
    return null;
  }

  return data;
}

export async function createAppointment(appointment: Partial<Appointment>): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .insert([{
      calendar_id: appointment.calendar_id,
      client_name: appointment.client_name,
      client_phone: appointment.client_phone,
      client_email: appointment.client_email,
      lead_id: appointment.lead_id,
      title: appointment.title || appointment.client_name,
      description: appointment.description,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      duration_minutes: appointment.duration_minutes,
      status: appointment.status || 'pending',
      location: appointment.location,
      location_type: appointment.location_type || 'office',
      meeting_link: appointment.meeting_link,
      price: appointment.price || 0,
      source: appointment.source || 'manual',
    }])
    .select()
    .single();

  if (error) {
    console.error('Calendar: Erro ao criar agendamento:', error);
    return null;
  }

  if (!data) {
    console.error('Calendar: Nenhum dado retornado ao criar agendamento');
    return null;
  }

  return data as Appointment;
}

export async function updateAppointment(id: string, updates: Partial<Appointment>): Promise<boolean> {
  const updateData: any = { ...updates };
  
  // Handle status changes
  if (updates.status === 'confirmed') {
    updateData.confirmed_at = new Date().toISOString();
  } else if (updates.status === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString();
  } else if (updates.status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  // Remove nested objects
  delete updateData.calendars;
  delete updateData.leads;
  delete updateData.calendar_name;
  delete updateData.calendar_color;
  delete updateData.lead_name;
  delete updateData.lead_phone;

  const { error } = await supabase
    .from('appointments')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Calendar: Erro ao atualizar agendamento:', error);
    return false;
  }

  return true;
}

export async function updateAppointmentStatus(
  id: string,
  status: Appointment['status'],
  notes?: string
): Promise<boolean> {
  const updates: Partial<Appointment> = { status };
  if (notes) {
    updates.agent_notes = notes;
  }
  return updateAppointment(id, updates);
}

export async function cancelAppointment(id: string, reason?: string): Promise<boolean> {
  return updateAppointment(id, {
    status: 'cancelled',
    agent_notes: reason,
  });
}

export async function rescheduleAppointment(
  id: string,
  newStartTime: string,
  newEndTime: string
): Promise<boolean> {
  return updateAppointment(id, {
    status: 'rescheduled',
    start_time: newStartTime,
    end_time: newEndTime,
  });
}

export async function deleteAppointment(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Calendar: Erro ao deletar agendamento:', error);
    return false;
  }

  return true;
}

// ============================================
// BLOCKED TIMES
// ============================================

export async function getBlockedTimes(
  calendarId: string,
  startDate?: string,
  endDate?: string
): Promise<BlockedTime[]> {
  let query = supabase
    .from('blocked_times')
    .select('*')
    .eq('calendar_id', calendarId)
    .order('start_time');

  if (startDate) {
    query = query.gte('end_time', startDate);
  }
  if (endDate) {
    query = query.lte('start_time', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Calendar: Erro ao buscar bloqueios:', error);
    return [];
  }

  return data || [];
}

export async function createBlockedTime(blocked: Partial<BlockedTime>): Promise<BlockedTime | null> {
  const { data, error } = await supabase
    .from('blocked_times')
    .insert([{
      calendar_id: blocked.calendar_id,
      start_time: blocked.start_time,
      end_time: blocked.end_time,
      reason: blocked.reason,
      block_type: blocked.block_type || 'block',
    }])
    .select()
    .single();

  if (error) {
    console.error('Calendar: Erro ao criar bloqueio:', error);
    return null;
  }

  return data;
}

export async function deleteBlockedTime(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('blocked_times')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Calendar: Erro ao deletar bloqueio:', error);
    return false;
  }

  return true;
}

// ============================================
// AVAILABLE SLOTS (Query the database function)
// ============================================

export async function getAvailableSlots(
  calendarId: string,
  date: string,
  durationMinutes: number = 60
): Promise<AvailableSlot[]> {
  // This calls the PostgreSQL function we created
  const { data, error } = await supabase.rpc('get_available_slots', {
    p_calendar_id: calendarId,
    p_date: date,
    p_duration_minutes: durationMinutes,
  });

  if (error) {
    console.error('Calendar: Erro ao buscar slots disponíveis:', error);
    return [];
  }

  return data || [];
}

// ============================================
// AI AGENT: Create appointment from chat
// ============================================

export async function agentCreateAppointment(params: {
  calendarId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  leadId?: string;
  date: string;      // YYYY-MM-DD
  time: string;      // HH:MM
  durationMinutes?: number;
  description?: string;
  title?: string;
}): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
  try {
    // Get calendar for duration and location
    const calendar = await getCalendarById(params.calendarId);
    if (!calendar) {
      return { success: false, error: 'Agenda não encontrada' };
    }

    // Calculate times
    const duration = params.durationMinutes || calendar.service_duration;
    const [hours, minutes] = params.time.split(':').map(Number);
    const startTime = new Date(`${params.date}T${params.time}:00`);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    // Check for conflicts
    const conflicts = await getAppointments({
      calendarId: params.calendarId,
      startDate: startTime.toISOString(),
      endDate: endTime.toISOString(),
    });

    if (conflicts.length > 0) {
      return { success: false, error: 'Horário já está ocupado' };
    }

    // Create appointment
    const appointment = await createAppointment({
      calendar_id: params.calendarId,
      client_name: params.clientName,
      client_phone: params.clientPhone,
      client_email: params.clientEmail,
      lead_id: params.leadId,
      title: params.title || `Agendamento: ${params.clientName}`,
      description: params.description,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: duration,
      status: calendar.auto_confirm_appointments ? 'confirmed' : 'pending',
      location: calendar.location,
      location_type: calendar.location_type,
      source: 'ai_agent',
    });

    if (!appointment) {
      return { success: false, error: 'Erro ao criar agendamento' };
    }

    return { success: true, appointment };
  } catch (err: any) {
    console.error('Calendar: Erro ao criar agendamento via IA:', err);
    return { success: false, error: err.message };
  }
}

// ============================================
// STATISTICS
// ============================================

export interface CalendarStats {
  totalAppointments: number;
  pendingAppointments: number;
  confirmedAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  todayAppointments: number;
  weekAppointments: number;
  totalRevenue: number;
  avgAppointmentsPerDay: number;
}

export async function getCalendarStats(calendarId?: string): Promise<CalendarStats> {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  const appointments = await getAppointments({
    calendarId,
    startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(),
    endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString(),
  });

  const todayStr = today.toISOString().split('T')[0];
  const weekEnd = new Date(startOfWeek);
  weekEnd.setDate(startOfWeek.getDate() + 7);

  return {
    totalAppointments: appointments.length,
    pendingAppointments: appointments.filter(a => a.status === 'pending').length,
    confirmedAppointments: appointments.filter(a => a.status === 'confirmed').length,
    completedAppointments: appointments.filter(a => a.status === 'completed').length,
    cancelledAppointments: appointments.filter(a => a.status === 'cancelled').length,
    noShowAppointments: appointments.filter(a => a.status === 'no_show').length,
    todayAppointments: appointments.filter(a => a.start_time.startsWith(todayStr)).length,
    weekAppointments: appointments.filter(a => {
      const date = new Date(a.start_time);
      return date >= startOfWeek && date < weekEnd;
    }).length,
    totalRevenue: appointments
      .filter(a => a.status === 'completed' && a.is_paid)
      .reduce((sum, a) => sum + (a.price || 0), 0),
    avgAppointmentsPerDay: Math.round(appointments.length / 30),
  };
}

// ============================================
// LEAD APPOINTMENTS
// ============================================

export async function getLeadAppointments(leadId: string): Promise<Appointment[]> {
  return getAppointments({ leadId });
}

export async function getClientAppointmentsByPhone(phone: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('client_phone', phone)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Calendar: Erro ao buscar agendamentos do cliente:', error);
    return [];
  }

  return data || [];
}
