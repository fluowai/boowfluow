import axios from 'axios';

/**
 * SER-02: Serviço de Provisionamento Automático na Vercel
 * Gerencia a infraestrutura frontend via API.
 */

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
const GITHUB_REPO = process.env.GITHUB_REPO;
const BACKEND_URL = process.env.BACKEND_URL;

const vercelApi = axios.create({
  baseURL: 'https://api.vercel.com',
  headers: {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
  },
  params: VERCEL_TEAM_ID ? { teamId: VERCEL_TEAM_ID } : {},
});

export async function createVercelProject(slug: string, domain: string) {
  try {
    console.log(`[VercelService] Criando projeto: wl-${slug}`);
    const response = await vercelApi.post('/v9/projects', {
      name: `wl-${slug}`,
      framework: 'vite',
      gitRepository: {
        type: 'github',
        repo: GITHUB_REPO,
      },
      environmentVariables: [
        { key: 'VITE_API_URL', value: BACKEND_URL, target: ['production'] },
        { key: 'VITE_WHITELABEL_DOMAIN', value: domain, target: ['production'] }
      ]
    });
    return response.data;
  } catch (err: any) {
    console.error('[VercelService] Erro ao criar projeto:', err.response?.data || err.message);
    throw err;
  }
}

export async function addVercelDomain(projectId: string, domain: string) {
  try {
    console.log(`[VercelService] Adicionando domínio: ${domain} ao projeto: ${projectId}`);
    const response = await vercelApi.post(`/v9/projects/${projectId}/domains`, {
      name: domain,
    });
    return response.data;
  } catch (err: any) {
    console.error('[VercelService] Erro ao adicionar domínio:', err.response?.data || err.message);
    throw err;
  }
}

export async function triggerVercelDeploy(projectId: string, slug: string) {
  try {
    console.log(`[VercelService] Disparando deploy para projeto: ${projectId}`);
    const response = await vercelApi.post('/v13/deployments', {
      name: `wl-${slug}`,
      project: projectId,
      target: 'production'
    });
    return response.data;
  } catch (err: any) {
    console.error('[VercelService] Erro ao disparar deploy:', err.response?.data || err.message);
    throw err;
  }
}
