import { InstagramSession } from '../types';
import { mapIgError } from '../errors';
import pino from 'pino';

const logger = pino({ name: 'MediaRepository' });

export class MediaService {
  constructor(private session: InstagramSession) {}

  async getInfo(mediaId: string) {
    try {
      return await this.session.client.media.info(mediaId);
    } catch (err) {
      logger.error({ mediaId, error: err }, 'Failed to get media info');
      throw mapIgError(err);
    }
  }

  async edit(mediaId: string, captionText: string) {
    try {
      return await this.session.client.media.editMedia({ mediaId, captionText });
    } catch (err) {
      logger.error({ mediaId, error: err }, 'Failed to edit media');
      throw mapIgError(err);
    }
  }

  async delete(mediaId: string, mediaType: 'PHOTO' | 'VIDEO' | 'CAROUSEL' = 'PHOTO') {
    try {
      return await this.session.client.media.delete({ mediaId, mediaType });
    } catch (err) {
      logger.error({ mediaId, error: err }, 'Failed to delete media');
      throw mapIgError(err);
    }
  }

  async like(mediaId: string, module?: string) {
    try {
      const options = { mediaId, d: 0 as const, moduleInfo: { module_name: module || 'feed_timeline' } };
      return await this.session.client.media.like(options as any);
    } catch (err) {
      logger.error({ mediaId, error: err }, 'Failed to like media');
      throw mapIgError(err);
    }
  }

  async unlike(mediaId: string, module?: string) {
    try {
      const options = { mediaId, d: 0 as const, moduleInfo: { module_name: module || 'feed_timeline' } };
      return await this.session.client.media.unlike(options as any);
    } catch (err) {
      logger.error({ mediaId, error: err }, 'Failed to unlike media');
      throw mapIgError(err);
    }
  }

  async comment(mediaId: string, text: string, replyToCommentId?: string) {
    try {
      return await this.session.client.media.comment({ mediaId, text, replyToCommentId });
    } catch (err) {
      logger.error({ mediaId, error: err }, 'Failed to comment');
      throw mapIgError(err);
    }
  }

  async deleteComment(mediaId: string, commentIds: string[]) {
    try {
      return await this.session.client.media.commentsBulkDelete(mediaId, commentIds);
    } catch (err) {
      logger.error({ mediaId, error: err }, 'Failed to delete comments');
      throw mapIgError(err);
    }
  }

  async getLikers(mediaId: string) {
    try {
      return await this.session.client.media.likers(mediaId);
    } catch (err) {
      logger.error({ mediaId, error: err }, 'Failed to get likers');
      throw mapIgError(err);
    }
  }

  async save(mediaId: string, collectionIds?: string[]) {
    try {
      return await this.session.client.media.save(mediaId, collectionIds);
    } catch (err) {
      logger.error({ mediaId, error: err }, 'Failed to save media');
      throw mapIgError(err);
    }
  }

  async unsave(mediaId: string) {
    try {
      return await this.session.client.media.unsave(mediaId);
    } catch (err) {
      logger.error({ mediaId, error: err }, 'Failed to unsave media');
      throw mapIgError(err);
    }
  }

  async onlyMe(mediaId: string) {
    try {
      return await this.session.client.media.onlyMe(mediaId);
    } catch (err) {
      logger.error({ mediaId, error: err }, 'Failed to set media as only me');
      throw mapIgError(err);
    }
  }

  async undoOnlyMe(mediaId: string) {
    try {
      return await this.session.client.media.undoOnlyMe(mediaId);
    } catch (err) {
      logger.error({ mediaId, error: err }, 'Failed to undo only me');
      throw mapIgError(err);
    }
  }
}
