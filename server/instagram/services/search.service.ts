import { InstagramSession } from '../types';
import { mapIgError } from '../errors';
import pino from 'pino';

const logger = pino({ name: 'SearchService' });

export class SearchService {
  constructor(private session: InstagramSession) {}

  async searchUsers(query: string) {
    try {
      return await this.session.client.search.users(query);
    } catch (err) {
      logger.error({ query, error: err }, 'Failed to search users');
      throw mapIgError(err);
    }
  }

  async searchHashtags(query: string) {
    try {
      return await this.session.client.search.tags(query);
    } catch (err) {
      logger.error({ query, error: err }, 'Failed to search hashtags');
      throw mapIgError(err);
    }
  }

  async searchLocations(query: string) {
    try {
      return await this.session.client.search.places(query);
    } catch (err) {
      logger.error({ query, error: err }, 'Failed to search locations');
      throw mapIgError(err);
    }
  }

  async searchBlended(query: string) {
    try {
      return await this.session.client.search.blended(query);
    } catch (err) {
      logger.error({ query, error: err }, 'Failed to blended search');
      throw mapIgError(err);
    }
  }

  async searchByLocation(lat: number, lng: number, query?: string) {
    try {
      return await this.session.client.search.location(lat, lng, query);
    } catch (err) {
      logger.error({ lat, lng, query, error: err }, 'Failed to search by location');
      throw mapIgError(err);
    }
  }
}

export class TagService {
  constructor(private session: InstagramSession) {}

  async getTagFeed(tag: string) {
    try {
      const feed = this.session.client.feed.tag(tag);
      return await feed.items();
    } catch (err) {
      logger.error({ tag, error: err }, 'Failed to get tag feed');
      throw mapIgError(err);
    }
  }

  async searchTags(query: string) {
    try {
      return await this.session.client.tag.search(query);
    } catch (err) {
      logger.error({ query, error: err }, 'Failed to search tags');
      throw mapIgError(err);
    }
  }
}

export class LocationService {
  constructor(private session: InstagramSession) {}

  async getLocationInfo(locationId: string | number) {
    try {
      return await this.session.client.location.info(locationId);
    } catch (err) {
      logger.error({ locationId, error: err }, 'Failed to get location info');
      throw mapIgError(err);
    }
  }

  async getLocationFeed(locationId: string | number, tab: 'recent' | 'ranked' = 'recent') {
    try {
      const feed = this.session.client.feed.location(locationId);
      return await feed.items();
    } catch (err) {
      logger.error({ locationId, error: err }, 'Failed to get location feed');
      throw mapIgError(err);
    }
  }

  async searchLocations(lat: number, lng: number, query?: string) {
    try {
      return await this.session.client.locationSearch.index(lat, lng, query);
    } catch (err) {
      logger.error({ lat, lng, query, error: err }, 'Failed to search locations');
      throw mapIgError(err);
    }
  }

  async getLocationStory(locationId: string | number) {
    try {
      return await this.session.client.location.story(locationId);
    } catch (err) {
      logger.error({ locationId, error: err }, 'Failed to get location story');
      throw mapIgError(err);
    }
  }
}
