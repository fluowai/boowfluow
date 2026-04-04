import { Router } from 'express';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { encrypt } from '../../services/encryption.service';
import { createVercelProject, addVercelDomain, triggerVercelDeploy } from '../../services/vercel.service';
import { adminAuth } from '../../middleware/adminAuth';

/**
 * SER-06: Rotas de Administração Whitelabel
 * CRUD + Provisionamento Automático no Vercel.
 * Todas as rotas aqui são protegidas por ADMIN_API_KEY.
 */

const router = Router();

router.use(adminAuth);

// 1. LISTAR TODOS OS CLIENTES
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('whitelabels')
    .select('id, slug, domain, theme, status, created_at, updated_at, vercel_project_id');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 2. CADASTRAR NOVO CLIENTE (PROVISIONAMENTO AUTOMÁTICO)
router.post('/', async (req, res) => {
  const { slug, domain, supabase_url, supabase_anon_key, supabase_service_key, theme } = req.body;

  try {
    // A. Salvar config inicial (provisioning)
    console.log(`[Admin] Iniciando provisionamento para: ${slug}`);
    const encryptedServiceKey = encrypt(supabase_service_key);

    const { data: wl, error } = await supabaseAdmin
      .from('whitelabels')
      .insert([{
        slug,
        domain,
        supabase_url,
        supabase_anon_key,
        supabase_service_key: encryptedServiceKey,
        theme,
        status: 'provisioning'
      }])
      .select()
      .single();

    if (error) throw new Error(`Falha ao salvar config: ${error.message}`);

    // B. Criar projeto no Vercel
    const vProject = await createVercelProject(slug, domain);
    const projectId = vProject.id;

    // C. Adicionar domínio customizado
    await addVercelDomain(projectId, domain);

    // D. Disparar primeiro deploy
    const vDeploy = await triggerVercelDeploy(projectId, slug);

    // E. Atualizar com sucesso
    await supabaseAdmin
      .from('whitelabels')
      .update({
        vercel_project_id: projectId,
        vercel_deployment_url: vDeploy.url,
        status: 'active'
      })
      .eq('id', wl.id);

    res.json({ 
      success: true, 
      message: 'Provisionamento automático concluído com sucesso!',
      whitelabel: { ...wl, vercel_project_id: projectId }
    });

  } catch (err: any) {
    console.error('[Admin] Falha no provisionamento:', err.message);
    res.status(500).json({ error: 'Erro no provisionamento: ' + err.message });
  }
});

// 3. EDITAR CLIENTE
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (updates.supabase_service_key) {
    updates.supabase_service_key = encrypt(updates.supabase_service_key);
  }

  const { data, error } = await supabaseAdmin
    .from('whitelabels')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 4. SUSPENDER CLIENTE
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabaseAdmin
    .from('whitelabels')
    .update({ status: 'suspended' })
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Whitelabel suspenso com sucesso.' });
});

// 5. FORÇAR REDEPLOY MANUAL
router.post('/:id/deploy', async (req, res) => {
  const { id } = req.params;
  
  try {
    const { data: wl, error } = await supabaseAdmin
      .from('whitelabels')
      .select('slug, vercel_project_id')
      .eq('id', id)
      .single();

    if (error || !wl || !wl.vercel_project_id) {
      throw new Error('Whitelabel não encontrado ou projeto Vercel não provisionado.');
    }

    const vDeploy = await triggerVercelDeploy(wl.vercel_project_id, wl.slug);
    
    await supabaseAdmin
      .from('whitelabels')
      .update({ 
        vercel_deployment_url: vDeploy.url,
        status: 'active' 
      })
      .eq('id', id);

    res.json({ success: true, url: vDeploy.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
