import { Router, Request, Response } from 'express';
import { ClientFactory } from '../client/factory';
import { SessionStore } from '../session';
import { ChallengeHandler } from '../challenge';
import { AccountService, UserService, MediaService, FriendshipService, DirectService } from '../repositories';
import { PublishService, SearchService, TagService, LocationService } from '../services';
import { InstagramError, InstagramChallengeError, mapIgError } from '../errors';
import { automationScheduler } from '../automation/scheduler';
import { InstagramAccount, ApiResponse } from '../types';
import { supabase } from '../../supabase';
import { generateId } from '../utils/encryption';
import pino from 'pino';
import multer from 'multer';
import path from 'path';

const logger = pino({ name: 'InstagramRoutes' });
const router = Router();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

let clientFactory: ClientFactory;
let sessionStore: SessionStore;
let challengeHandler: ChallengeHandler;

export function initInstagramRoutes() {
  sessionStore = new SessionStore();
  challengeHandler = new ChallengeHandler();
  clientFactory = new ClientFactory(sessionStore, challengeHandler);
  
  // Initialize automation scheduler
  automationScheduler.init(clientFactory);
  
  return router;
}

async function getAuthenticatedSession(accountId: string, userId: string) {
  const session = await clientFactory.getClient(accountId);
  if (!session?.isConnected) {
    const { data: account } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();
    
    if (!account) {
      throw new InstagramError('Account not found or access denied', 'NOT_FOUND', 403);
    }

    return await clientFactory.login(account as InstagramAccount);
  }
  return session;
}

function handleError(res: Response, error: unknown) {
  const igError = mapIgError(error);
  logger.error({ error: igError }, 'Request error');
  return res.status(igError.statusCode || 500).json({
    success: false,
    error: {
      code: igError.code,
      message: igError.message
    }
  } as ApiResponse);
}

router.post('/accounts', async (req: Request, res: Response) => {
  try {
    const { username, password, proxy } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'Username and password are required' }
      } as ApiResponse);
    }

    const id = generateId();
    const userId = (req as any).userId;
    const { data, error } = await supabase
      .from('instagram_accounts')
      .insert({
        id,
        user_id: userId,
        username,
        password,
        proxy: proxy || null,
        status: 'inactive',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    logger.info({ accountId: id, username }, 'Account created');

    return res.status(201).json({
      success: true,
      data
    } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { data, error } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ success: true, data } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { data, error } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Account not found' }
      } as ApiResponse);
    }

    return res.json({ success: true, data } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.delete('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await clientFactory.getClient(req.params.id);
    
    // Verifica posse antes de deletar
    const { data: check } = await supabase.from('instagram_accounts').select('id').eq('id', req.params.id).eq('user_id', userId).single();
    if (!check) return res.status(403).json({ success: false, error: 'Acesso Negado' });

    if (session) {
      await clientFactory.removeClient(req.params.id);
    }

    await sessionStore.deleteSession(req.params.id);

    const { error } = await supabase
      .from('instagram_accounts')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    logger.info({ accountId: req.params.id }, 'Account deleted');

    return res.json({ success: true } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/accounts/:id/login', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { data: account, error: accError } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (accError || !account) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Account not found' }
      } as ApiResponse);
    }

    const session = await clientFactory.login(account as InstagramAccount);

    await supabase
      .from('instagram_accounts')
      .update({ status: 'active', last_login: new Date().toISOString() })
      .eq('id', req.params.id);

    return res.json({
      success: true,
      data: { connected: session.isConnected, accountId: req.params.id }
    } as ApiResponse);
  } catch (err) {
    if (err instanceof InstagramChallengeError) {
      return res.status(200).json({
        success: true,
        data: { challenge: true, type: err.challengeType }
      } as ApiResponse);
    }
    return handleError(res, err);
  }
});

router.post('/accounts/:id/logout', async (req: Request, res: Response) => {
  try {
    const session = await clientFactory.getClient(req.params.id);
    if (session) {
      await clientFactory.logout(session);
    }

    const userId = (req as any).userId;
    await supabase
      .from('instagram_accounts')
      .update({ status: 'inactive' })
      .eq('id', req.params.id)
      .eq('user_id', userId);

    return res.json({ success: true } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/accounts/:id/challenge/verify', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);

    const success = await challengeHandler.sendSecurityCode(session, code);

    if (success) {
      await supabase
        .from('instagram_accounts')
        .update({ status: 'active' })
        .eq('id', req.params.id);
    }

    return res.json({ success } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/accounts/:id/user', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const service = new AccountService(session);
    const user = await service.getCurrentUser();
    return res.json({ success: true, data: user } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/accounts/:id/profile', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const service = new AccountService(session);
    const user = await service.getCurrentUser();
    return res.json({ success: true, data: user } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/accounts/:id/user/:username', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const service = new UserService(session);
    const user = await service.getInfoByUsername(req.params.username);
    return res.json({ success: true, data: user } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/accounts/:id/follow/:userId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const service = new FriendshipService(session);
    const result = await service.follow(req.params.userId);
    return res.json({ success: true, data: result } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.delete('/accounts/:id/follow/:userId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const service = new FriendshipService(session);
    const result = await service.unfollow(req.params.userId);
    return res.json({ success: true, data: result } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/accounts/:id/inbox', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const service = new DirectService(session);
    const inbox = await service.getInbox();
    const items = await inbox.items();
    return res.json({ success: true, data: { threads: items } } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/accounts/:id/thread/:threadId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const service = new DirectService(session);
    const messages = await service.getThread(req.params.threadId);
    return res.json({ success: true, data: { messages } } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/accounts/:id/direct', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const service = new DirectService(session);
    const { recipientUsers, text, threadTitle } = req.body;
    const result = await service.sendMessage({ recipientUsers, text, threadTitle });
    return res.json({ success: true, data: result } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/accounts/:id/search/:type', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const { type } = req.params;
    const { q, lat, lng } = req.query;

    const service = new SearchService(session);
    let results;

    switch (type) {
      case 'users':
        results = await service.searchUsers(q as string);
        break;
      case 'hashtags':
        results = await service.searchHashtags(q as string);
        break;
      case 'locations':
        results = await service.searchLocations(q as string);
        break;
      case 'blended':
        results = await service.searchBlended(q as string);
        break;
      case 'location':
        results = await service.searchByLocation(Number(lat), Number(lng), q as string);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_TYPE', message: 'Invalid search type' }
        } as ApiResponse);
    }

    return res.json({ success: true, data: results } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/accounts/:id/tags/:tag', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const service = new TagService(session);
    const feed = await service.getTagFeed(req.params.tag);
    return res.json({ success: true, data: feed } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/accounts/:id/location/:locationId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const service = new LocationService(session);
    const info = await service.getLocationInfo(req.params.locationId);
    return res.json({ success: true, data: info } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/accounts/:id/location/:locationId/feed', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const service = new LocationService(session);
    const { tab } = req.query;
    const feed = await service.getLocationFeed(req.params.locationId, (tab as 'recent' | 'ranked') || 'recent');
    return res.json({ success: true, data: feed } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/accounts/:id/media/:mediaId/like', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const service = new MediaService(session);
    await service.like(req.params.mediaId);
    return res.json({ success: true } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.delete('/accounts/:id/media/:mediaId/like', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const service = new MediaService(session);
    await service.unlike(req.params.mediaId);
    return res.json({ success: true } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/accounts/:id/media/:mediaId/comment', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const service = new MediaService(session);
    const { text } = req.body;
    const result = await service.comment(req.params.mediaId, text);
    return res.json({ success: true, data: result } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/accounts/:id/media/:mediaId/save', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const service = new MediaService(session);
    await service.save(req.params.mediaId);
    return res.json({ success: true } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/accounts/:id/publish/photo', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const service = new PublishService(session);
    
    const file = req.file?.buffer;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded' }
      } as ApiResponse);
    }

    const { caption, location, users } = req.body;
    const locationObj = location ? JSON.parse(location) : undefined;
    const usersArr = users ? JSON.parse(users) : undefined;

    const result = await service.publishPhoto({
      file,
      caption,
      location: locationObj,
      users: usersArr
    });

    return res.json({ success: true, data: result } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/accounts/:id/publish/story', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const service = new PublishService(session);
    
    const file = req.file?.buffer;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded' }
      } as ApiResponse);
    }

    const { caption } = req.body;

    const result = await service.publishStory({ file, caption });

    return res.json({ success: true, data: result } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/accounts/:id/feed/timeline', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const feed = session.client.feed.timeline();
    const items = await feed.items();
    return res.json({ success: true, data: items } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/accounts/:id/feed/user/:userId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const feed = session.client.feed.user(req.params.userId);
    const items = await feed.items();
    return res.json({ success: true, data: items } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/accounts/:id/followers', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const feed = session.client.feed.accountFollowers({ id: session.sessionData.rankToken } as any);
    const items = await feed.items();
    return res.json({ success: true, data: items } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/accounts/:id/following', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const feed = session.client.feed.accountFollowing({ id: session.sessionData.rankToken } as any);
    const items = await feed.items();
    return res.json({ success: true, data: items } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/accounts/:id/feed/saved', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const feed = session.client.feed.saved();
    const items = await feed.items();
    return res.json({ success: true, data: items } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/accounts/:id/feed/liked', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const feed = session.client.feed.liked();
    const items = await feed.items();
    return res.json({ success: true, data: items } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/accounts/:id/feed/discover', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(req.params.id, userId);
    const feed = session.client.feed.discover();
    const items = await feed.items();
    return res.json({ success: true, data: items } as ApiResponse);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/health', (req: Request, res: Response) => {
  const sessions = clientFactory.getActiveSessions();
  res.json({
    status: 'ok',
    activeSessions: sessions.length,
    timestamp: new Date().toISOString()
  });
});

export default router;
