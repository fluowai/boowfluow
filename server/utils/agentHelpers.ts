import { supabase } from '../supabase';

export async function resolveAgentPersonality(agent: any) {
  let finalPersonality = agent.personality || '';
  const { data: dbVars } = await supabase.from('agent_variables').select('*').eq('agent_id', agent.id);
  
  if (dbVars) {
    dbVars.forEach((v: any) => {
      const regex = new RegExp(`\\{\\{${v.key}\\}\\}`, 'g');
      finalPersonality = finalPersonality.replace(regex, v.value || `[${v.key}]`);
    });
  }
  return finalPersonality;
}

export function isAgentInWorkTime(agent: any) {
  if (!agent.working_hours?.enabled) return true;
  
  const now = new Date();
  const timezone = agent.working_hours.timezone || 'America/Sao_Paulo';
  
  const localTime = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short'
  }).formatToParts(now);

  const day = localTime.find(p => p.type === 'weekday')?.value.toLowerCase() || '';
  const hourMinute = `${localTime.find(p => p.type === 'hour')?.value}:${localTime.find(p => p.type === 'minute')?.value}`;
  
  const schedule = agent.working_hours.schedule?.[day];
  if (!schedule || schedule.length !== 2) return false;
  
  const [start, end] = schedule;
  return hourMinute >= start && hourMinute <= end;
}
