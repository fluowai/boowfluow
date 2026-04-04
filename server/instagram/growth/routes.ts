import { Router, Request, Response } from 'express';
import { ClientFactory } from '../client/factory';
import { SessionStore } from '../session';
import { ChallengeHandler } from '../challenge';
import { GrowthService, GrowthConfig, TargetUser } from '../growth/engine';
import { automationScheduler } from '../automation/scheduler';
import { analyticsService } from '../analytics';
import { mapIgError, InstagramError } from '../errors';
import { InstagramAccount } from '../types';
import { supabase } from '../../supabase';

const router = Router();

let clientFactory: ClientFactory;
let sessionStore: SessionStore;
let challengeHandler: ChallengeHandler;
const growthServices: Map<string, GrowthService> = new Map();

export function initGrowthRoutes() {
  sessionStore = new SessionStore();
  challengeHandler = new ChallengeHandler();
  clientFactory = new ClientFactory(sessionStore, challengeHandler);
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

function getGrowthService(accountId: string): GrowthService {
  let service = growthServices.get(accountId);
  if (!service) {
    service = new GrowthService();
    growthServices.set(accountId, service);
  }
  return service;
}

router.post('/accounts/:id/growth/config', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;
    const config: Partial<GrowthConfig> = req.body;
    
    // Validação de posse via DB
    const { data: check } = await supabase.from('instagram_accounts').select('id').eq('id', id).eq('user_id', userId).single();
    if (!check) return res.status(403).json({ success: false, error: 'Acesso Negado' });

    const service = getGrowthService(id);
    service.updateConfig(config);
    
    return res.json({ success: true, config: service.getConfig() });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.get('/accounts/:id/growth/config', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const { data: check } = await supabase.from('instagram_accounts').select('id').eq('id', id).eq('user_id', userId).single();
    if (!check) return res.status(403).json({ success: false, error: 'Acesso Negado' });

    const service = getGrowthService(id);
    return res.json({ success: true, config: service.getConfig() });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.get('/accounts/:id/growth/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const { data: check } = await supabase.from('instagram_accounts').select('id').eq('id', id).eq('user_id', userId).single();
    if (!check) return res.status(403).json({ success: false, error: 'Acesso Negado' });

    const service = getGrowthService(id);
    return res.json({ success: true, stats: service.getStats() });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/accounts/:id/growth/pause', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const { data: check } = await supabase.from('instagram_accounts').select('id').eq('id', id).eq('user_id', userId).single();
    if (!check) return res.status(403).json({ success: false, error: 'Acesso Negado' });

    const service = getGrowthService(id);
    service.pause();
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/accounts/:id/growth/resume', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const { data: check } = await supabase.from('instagram_accounts').select('id').eq('id', id).eq('user_id', userId).single();
    if (!check) return res.status(403).json({ success: false, error: 'Acesso Negado' });

    const service = getGrowthService(id);
    service.resume();
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/accounts/:id/growth/follow', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, userId: bodyUserId } = req.body;
    
    if (!username && !bodyUserId) {
      return res.status(400).json({ success: false, error: 'Username or userId required' });
    }
    
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(id, userId);
    const service = getGrowthService(id);
    
    let targetUser: TargetUser;
    if (bodyUserId) {
      const userInfo = await session.client.user.info(bodyUserId);
      targetUser = {
        username: userInfo.username,
        userId: userInfo.pk,
        followers: userInfo.follower_count,
        following: userInfo.following_count,
        isPrivate: userInfo.is_private
      };
    } else {
      const userInfo = await session.client.user.usernameinfo(username);
      targetUser = {
        username: userInfo.username,
        userId: userInfo.pk,
        followers: userInfo.follower_count,
        following: userInfo.following_count,
        isPrivate: userInfo.is_private
      };
    }
    
    await service.follow(session, targetUser);
    await analyticsService.recordAction(id, 'follow', { targetUsername: username });
    
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/accounts/:id/growth/unfollow', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId: targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }
    
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(id, userId);
    const service = getGrowthService(id);
    await service.unfollow(session, targetUserId);
    await analyticsService.recordAction(id, 'unfollow', { targetUserId });
    
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/accounts/:id/growth/like', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { mediaId } = req.body;
    
    if (!mediaId) {
      return res.status(400).json({ success: false, error: 'mediaId required' });
    }
    
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(id, userId);
    const service = getGrowthService(id);
    
    await service.likeMedia(session, mediaId);
    await analyticsService.recordAction(id, 'like', { mediaId });
    
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/accounts/:id/growth/comment', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { mediaId, text } = req.body;
    
    if (!mediaId || !text) {
      return res.status(400).json({ success: false, error: 'mediaId and text required' });
    }
    
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(id, userId);
    const service = getGrowthService(id);
    
    await service.comment(session, mediaId, text);
    await analyticsService.recordAction(id, 'comment', { mediaId, text });
    
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/accounts/:id/growth/routine/follow-hashtag', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hashtag, count, minFollowers, maxFollowers } = req.body;
    
    if (!hashtag) {
      return res.status(400).json({ success: false, error: 'hashtag required' });
    }
    
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(id, userId);
    const service = getGrowthService(id);
    
    const users = await service.searchTargetUsers(session, hashtag, minFollowers, maxFollowers);
    
    let followed = 0;
    for (const user of users.slice(0, count || 10)) {
      try {
        await service.follow(session, user);
        followed++;
        await analyticsService.recordAction(id, 'follow', { targetUsername: user.username, source: 'routine' });
      } catch (e) {
        console.warn(`Failed to follow ${user.username}:`, e);
      }
    }
    
    return res.json({ success: true, followed, total: users.length });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/accounts/:id/growth/routine/unfollow-non-followers', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { count } = req.body;
    
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(id, userId);
    const service = getGrowthService(id);
    
    const users = await service.getUsersWhoDontFollowBack(session, session.sessionData.rankToken);
    
    let unfollowed = 0;
    for (const user of users.slice(0, count || 10)) {
      try {
        await service.unfollow(session, user.userId);
        unfollowed++;
        await analyticsService.recordAction(id, 'unfollow', { targetUsername: user.username, source: 'routine' });
      } catch (e) {
        console.warn(`Failed to unfollow ${user.username}:`, e);
      }
    }
    
    return res.json({ success: true, unfollowed, total: users.length });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.get('/accounts/:id/growth/non-followers', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(id, userId);
    const service = getGrowthService(id);
    
    const users = await service.getFollowersNotFollowingBack(session, session.sessionData.rankToken);
    
    return res.json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.get('/accounts/:id/growth/who-dont-follow-back', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(id, userId);
    const service = getGrowthService(id);
    
    const users = await service.getUsersWhoDontFollowBack(session, session.sessionData.rankToken);
    
    return res.json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.get('/accounts/:id/analytics', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const period = (req.query.period as 'day' | 'week' | 'month') || 'week';
    
    const analytics = await analyticsService.getAccountAnalytics(id, period);
    
    return res.json({ success: true, analytics });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.get('/accounts/:id/analytics/competitor/:username', async (req: Request, res: Response) => {
  try {
    const { id, username } = req.params;
    
    const userId = (req as any).userId;
    const session = await getAuthenticatedSession(id, userId);
    const analytics = await analyticsService.getCompetitorAnalytics(username, session);
    
    return res.json({ success: true, analytics });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/accounts/:id/schedule/post', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, mediaPath, caption, location, scheduledAt } = req.body;
    
    if (!type || !scheduledAt) {
      return res.status(400).json({ success: false, error: 'type and scheduledAt required' });
    }
    
    const post = automationScheduler.schedulePost({
      accountId: id,
      type,
      mediaPath,
      caption,
      location,
      scheduledAt: new Date(scheduledAt)
    });
    
    return res.json({ success: true, post });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.get('/accounts/:id/schedule/posts', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const posts = automationScheduler.getScheduledPosts(id);
    return res.json({ success: true, posts });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.delete('/accounts/:id/schedule/post/:postId', async (req: Request, res: Response) => {
  try {
    const { id, postId } = req.params;
    const success = automationScheduler.cancelScheduledPost(id, postId);
    return res.json({ success });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
