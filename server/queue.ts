import { EventEmitter } from 'events';

/**
 * Fila Assíncrona em Memória para isolar o Kanban do WhatsApp.
 * Executa os Jobs em Background Sequencialmente ou com Simultaneidade Controlada.
 * Reduz a carga do Event Loop Principal do NodeJS que o Puppeteer exige.
 */
class MessageQueueManager extends EventEmitter {
  private queue: any[] = [];
  private processing: boolean = false;
  private concurrencyLimit = 3;
  private currentWorkers = 0;

  constructor() {
    super();
    // Aumenta o limite padrão de listeners caso muitos workers assinem
    this.setMaxListeners(20);
  }

  /**
   * Adiciona um trabalho (Job) na Fila e continua a thread limpa.
   */
  enqueue(jobName: string, payload: any) {
    console.log(`[Queue] 📥 Job enfileirado: ${jobName}`);
    this.queue.push({ jobName, payload });
    this.processNext();
  }

  private async processNext() {
    if (this.currentWorkers >= this.concurrencyLimit || this.queue.length === 0) {
      return; 
    }

    this.currentWorkers++;
    const job = this.queue.shift();

    if (!job) {
      this.currentWorkers--;
      return;
    }

    try {
      // Dispara o evento de forma assíncrona para que os Workers registrados processem
      // Encapsula em uma Promise para esperar o worker finalizar
      await new Promise<void>((resolve, reject) => {
         const listeners = this.listeners(job.jobName);
         if (listeners.length === 0) {
            console.warn(`[Queue] Nenhum Worker registrado para o Job: ${job.jobName}`);
            return resolve();
         }
         
         // Presume-se apenas 1 worker responsável por JobName para manter sanidade
         const workerFn = listeners[0] as Function;
         Promise.resolve(workerFn(job.payload)).then(resolve).catch(reject);
      });
      
    } catch (e) {
      console.error(`[Queue] ❌ Erro Crítico processando Job '${job.jobName}':`, e);
      // Aqui poderíamos implementar recíproco ou mover para Dead Letter Queue no Supabase
    } finally {
      this.currentWorkers--;
      this.processNext(); // Continua o esvaziamento da fila
    }
  }
}

/**
 * Fila Exclusiva para Download e Enriquecimento de Mídia (Tolerante a falhas)
 */
class MediaQueueManager extends EventEmitter {
  private queue: any[] = [];
  private concurrencyLimit = 15;
  private currentWorkers = 0;
  // Deduplicação: armazena qual messageId já está na fila ou sendo processada.
  private processingSet: Set<string> = new Set();

  constructor() {
    super();
    this.setMaxListeners(20);
  }

  enqueue(jobName: string, payload: any, deduplicationKey?: string) {
    if (deduplicationKey) {
      if (this.processingSet.has(deduplicationKey)) {
        return; // Já está na fila ou processando
      }
      this.processingSet.add(deduplicationKey);
    }
    
    console.log(`[MediaQueue] 📥 Media Job enfileirado: ${jobName} | Key: ${deduplicationKey || 'none'}`);
    this.queue.push({ jobName, payload, deduplicationKey });
    this.processNext();
  }

  private async processNext() {
    if (this.currentWorkers >= this.concurrencyLimit || this.queue.length === 0) {
      return; 
    }

    this.currentWorkers++;
    const job = this.queue.shift();

    if (!job) {
      this.currentWorkers--;
      return;
    }

    try {
      await new Promise<void>((resolve, reject) => {
         const listeners = this.listeners(job.jobName);
         if (listeners.length === 0) {
            console.warn(`[MediaQueue] Nenhum Worker para Job: ${job.jobName}`);
            return resolve();
         }
         const workerFn = listeners[0] as Function;
         // Protegendo o worker inteiro contra exceções fatais não tratadas
         Promise.resolve(workerFn(job.payload)).then(resolve).catch(reject);
      });
    } catch (e: any) {
      console.error(`[MediaQueue] ❌ Erro não tratado processando Job '${job.jobName}':`, e.message);
    } finally {
      if (job.deduplicationKey) {
        this.processingSet.delete(job.deduplicationKey);
      }
      this.currentWorkers--;
      this.processNext();
    }
  }
}

export const messageQueue = new MessageQueueManager();
export const mediaQueue = new MediaQueueManager();
