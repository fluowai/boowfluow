import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import extract from 'extract-zip';
import { supabaseAdmin } from './supabaseAdmin';

const BUCKET_NAME = 'whatsapp-sessions';

/**
 * Salva a sessão do WhatsApp no Supabase Storage.
 * Compacta a pasta da sessão em um arquivo .zip antes do upload.
 */
export async function saveSession(instanceName: string, sessionPath: string) {
  const zipPath = path.join(path.dirname(sessionPath), `${instanceName}.zip`);
  
  if (!fs.existsSync(sessionPath)) {
    console.warn(`[SessionStorage][${instanceName}] Pasta de sessão não encontrada para salvar: ${sessionPath}`);
    return;
  }

  console.log(`[SessionStorage][${instanceName}] Compactando sessão para upload...`);
  
  try {
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      archive.directory(sessionPath, false);
      archive.finalize();
    });

    const fileBuffer = fs.readFileSync(zipPath);
    const fileName = `${instanceName}.zip`;

    console.log(`[SessionStorage][${instanceName}] Fazendo upload para o Supabase Storage...`);
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        upsert: true,
        contentType: 'application/zip'
      });

    if (error) throw error;
    console.log(`[SessionStorage][${instanceName}] Sessão salva com sucesso no Storage.`);

    // Limpa o arquivo zip temporário local
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    
  } catch (err: any) {
    console.error(`[SessionStorage][${instanceName}] Erro ao salvar sessão:`, err.message);
  }
}

/**
 * Restaura a sessão do Supabase Storage para o sistema de arquivos local.
 * Descarta a sessão local existente antes de restaurar a remota.
 */
export async function restoreSession(instanceName: string, sessionPath: string) {
  const zipPath = path.join(path.dirname(sessionPath), `${instanceName}.zip`);
  const fileName = `${instanceName}.zip`;

  console.log(`[SessionStorage][${instanceName}] Verificando sessão no Supabase Storage...`);

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .download(fileName);

    if (error || !data) {
      console.log(`[SessionStorage][${instanceName}] Nenhuma sessão encontrada no Storage para restaurar.`);
      return false;
    }

    console.log(`[SessionStorage][${instanceName}] Sessão encontrada. Baixando e extraindo...`);
    
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(zipPath, buffer);

    // Limpa pasta local se existir para evitar conflitos
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
    fs.mkdirSync(sessionPath, { recursive: true });

    await extract(zipPath, { dir: sessionPath });
    console.log(`[SessionStorage][${instanceName}] Sessão restaurada com sucesso.`);

    // Limpa o arquivo zip temporário
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    return true;

  } catch (err: any) {
    console.error(`[SessionStorage][${instanceName}] Erro ao restaurar sessão:`, err.message);
    return false;
  }
}

/**
 * Remove a sessão do Supabase Storage.
 */
export async function deleteSession(instanceName: string) {
  const fileName = `${instanceName}.zip`;
  console.log(`[SessionStorage][${instanceName}] Removendo sessão do Storage...`);

  try {
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([fileName]);

    if (error) throw error;
    console.log(`[SessionStorage][${instanceName}] Sessão removida com sucesso de ${BUCKET_NAME}.`);
  } catch (err: any) {
    console.error(`[SessionStorage][${instanceName}] Erro ao deletar sessão:`, err.message);
  }
}
