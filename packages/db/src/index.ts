// Re-export generated Prisma types for consumers
export * from './generated/prisma/index';
// Export the prisma client singleton
export * from './client';
// Export repository functions
export { mediaAsset } from './repositories/mediaAsset';
export { campaign } from './repositories/campaign';
export { ad } from './repositories/ad';
export { brand } from './repositories/brand';
export { analytics } from './repositories/analytics';
export { recommendation } from './repositories/recommendation';
export { notification } from './repositories/notification';
export { socialAccount } from './repositories/socialAccount';

