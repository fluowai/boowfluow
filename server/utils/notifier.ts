import nodemailer from 'nodemailer';
import { supabase } from '../supabase';
import { whatsappService } from '../whatsapp';

// Limite de envio para evitar spam de alertas
const recentAlerts = new Map<string, number>();

export async function notifyCriticalError(errorMessage: string) {
  try {
    // Evita spam de erros muito parecidos: debounce de 5 segundos
    const errorSignature = errorMessage.substring(0, 50);
    const now = Date.now();
    if (recentAlerts.has(errorSignature) && (now - recentAlerts.get(errorSignature)!) < 5000) {
      return; 
    }
    recentAlerts.set(errorSignature, now);

    // 1. Buscar configurações ativas
    const { data: configs } = await supabase
      .from('system_config')
      .select('*')
      .in('key', ['support_email', 'support_phone', 'support_instance']);
    
    const configMap = configs?.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}) as any || {};

    const supportEmail = configMap?.support_email;
    const supportPhone = configMap?.support_phone?.replace(/\D/g, '');
    const supportInstance = configMap?.support_instance;

    // 2. Notificação via E-mail
    if (supportEmail && process.env.SMTP_HOST && process.env.SMTP_USER) {
       try {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_PORT === '465',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });

          await transporter.sendMail({
            from: `"Lamborghini Alertas" <${process.env.SMTP_USER}>`,
            to: supportEmail,
            subject: '🚨 CRÍTICO: Falha no Sistema Boowfluow',
            text: `O sistema detectou um erro crítico:\n\n${errorMessage}\n\nPor favor, verifique o monitor de logs na Dashboard imediatamente.`,
          });
       } catch (emailErr: any) {
          process.stdout.write(`[Notifier] Erro ao enviar e-mail: ${emailErr.message}\n`);
       }
    }

    // 3. Notificação Direta via WhatsApp (Número VIP)
    if (supportPhone) {
      let instances = whatsappService.getAllInstances().filter(i => i.status === 'connected' || i.status === 'ready');
      if (supportInstance) {
         instances = instances.filter(i => i.instanceName === supportInstance);
      }
      
      if (instances.length > 0) {
        const instanceName = instances[0].instanceName;
        try {
          const instance = whatsappService['instanceStore'].get(instanceName);
          if (!instance?.client) throw new Error('Cliente indefinido');
          
          const numberId = await instance.client.getNumberId(supportPhone);
          if (numberId) {
             const jid = numberId._serialized;
             const text = `*🚨 ALERTA VIP DE DIAGNÓSTICO E SUPORTE 🚨*\n\nDetectamos uma ocorrência sistêmica:\n\n_${errorMessage}_\n\nVerifique o Painel de Controle Imediatamente.`;
             await whatsappService.sendTextMessage(instanceName, jid, text);
             console.log(`[Notifier] Alerta enviado diretamente ao número ${supportPhone} com sucesso.`);
          } else {
             console.warn(`[Notifier] O número ${supportPhone} não é reconhecido pelo WhatsApp. Dica: tente com ou sem o nono dígito (9).`);
          }
        } catch (e: any) {
          console.warn('[Notifier] Falha ao tentar disparar alerta via sistema:', e.message);
        }
      } else {
         console.warn(`[Notifier] O número ${supportPhone} foi configurado, mas não há nenhuma instância conectada enviando Alertas.`);
      }
    }
  } catch (error: any) {
    // Silencia erros no próprio notificador para não causar looping
    process.stdout.write(`[Notifier] Erro crasso na função principal: ${error.message}\n`);
  }
}
