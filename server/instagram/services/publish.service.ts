import { InstagramSession } from '../types';
import { mapIgError, InstagramUploadError } from '../errors';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

const logger = pino({ name: 'PublishService' });

export class PublishService {
  constructor(private session: InstagramSession) {}

  async publishPhoto(options: {
    file: string | Buffer;
    caption?: string;
    location?: {
      name: string;
      lat: number;
      lng: number;
      externalId: string;
    };
    users?: Array<{ username: string; x: number; y: number }>;
  }) {
    try {
      let buffer: Buffer;
      
      if (typeof options.file === 'string') {
        buffer = fs.readFileSync(options.file);
      } else {
        buffer = options.file;
      }

      const publishOptions: any = {
        file: buffer,
        caption: options.caption || ''
      };

      if (options.location) {
        publishOptions.location = {
          name: options.location.name,
          lat: options.location.lat,
          lng: options.location.lng,
          external_id: options.location.externalId
        };
      }

      if (options.users && options.users.length > 0) {
        publishOptions.usertags = {
          in: options.users.map(u => ({
            user_id: u.username,
            position: [u.x, u.y]
          }))
        };
      }

      return await this.session.client.publish.photo(publishOptions);
    } catch (err) {
      logger.error({ error: err }, 'Failed to publish photo');
      throw mapIgError(err);
    }
  }

  async publishVideo(options: {
    file: string | Buffer;
    caption?: string;
    coverImage?: string | Buffer;
    location?: {
      name: string;
      lat: number;
      lng: number;
      externalId: string;
    };
  }) {
    try {
      let videoBuffer: Buffer;
      
      if (typeof options.file === 'string') {
        videoBuffer = fs.readFileSync(options.file);
      } else {
        videoBuffer = options.file;
      }

      let coverBuffer: Buffer | undefined;
      if (options.coverImage) {
        if (typeof options.coverImage === 'string') {
          coverBuffer = fs.readFileSync(options.coverImage);
        } else {
          coverBuffer = options.coverImage;
        }
      }

      const publishOptions: any = {
        file: videoBuffer,
        caption: options.caption || '',
        coverImage: coverBuffer
      };

      if (options.location) {
        publishOptions.location = {
          name: options.location.name,
          lat: options.location.lat,
          lng: options.location.lng,
          external_id: options.location.externalId
        };
      }

      return await this.session.client.publish.video(publishOptions);
    } catch (err) {
      logger.error({ error: err }, 'Failed to publish video');
      throw mapIgError(err);
    }
  }

  async publishStory(options: {
    file: string | Buffer;
    caption?: string;
    stickers?: Record<string, unknown>;
  }) {
    try {
      let buffer: Buffer;
      
      if (typeof options.file === 'string') {
        buffer = fs.readFileSync(options.file);
      } else {
        buffer = options.file;
      }

      const isVideo = buffer.slice(0, 4).toString('hex').startsWith('66747970') || 
                      buffer.slice(0, 4).toString('hex').startsWith('1f8b') ||
                      path.extname(options.file as string).match(/\.(mp4|mov|webm)$/i);

      if (isVideo) {
        return await this.session.client.publish.story({
          file: buffer,
          caption: options.caption,
          ...options.stickers
        });
      }

      return await this.session.client.publish.story({
        file: buffer,
        caption: options.caption,
        ...options.stickers
      });
    } catch (err) {
      logger.error({ error: err }, 'Failed to publish story');
      throw mapIgError(err);
    }
  }

  async publishAlbum(options: {
    files: (string | Buffer)[];
    caption?: string;
  }) {
    try {
      const buffers = options.files.map(file => {
        if (typeof file === 'string') {
          return fs.readFileSync(file);
        }
        return file;
      });

      return await this.session.client.publish.album({
        files: buffers,
        caption: options.caption || ''
      } as any);
    } catch (err) {
      logger.error({ error: err }, 'Failed to publish album');
      throw mapIgError(err);
    }
  }
}
