const logger = require('../utils/logger');

class FigmaService {
  constructor(apiToken = process.env.FIGMA_API_TOKEN) {
    this.apiToken = apiToken;
  }

  isAvailable() {
    return !!this.apiToken;
  }

  async createMockupDoc(title, description) {
    // Placeholder: integrate Figma REST API here when token available
    logger.info(`[Figma] Requested mockup: ${title}`);
    return {
      url: 'https://www.figma.com/file/placeholder',
      title,
      description
    };
  }
}

module.exports = new FigmaService();
