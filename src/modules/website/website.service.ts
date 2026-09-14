import { websiteRepository } from "./website.repository.js";

export const websiteService = {
  publicContent(gymId: string) {
    return websiteRepository.fullContent(gymId, true);
  },

  adminContent(gymId: string) {
    return websiteRepository.fullContent(gymId, false);
  },

  saveBranding(gymId: string, input: Record<string, unknown>) {
    return websiteRepository.saveBranding(gymId, input);
  },

  saveSection(gymId: string, sectionKey: string, content: unknown) {
    return websiteRepository.saveSection(gymId, sectionKey, content);
  },

  createGallery(gymId: string, input: Record<string, unknown>) {
    return websiteRepository.upsertGallery(gymId, input);
  },

  updateGallery(gymId: string, id: string, input: Record<string, unknown>) {
    return websiteRepository.upsertGallery(gymId, input, id);
  },

  deleteGallery(gymId: string, id: string) {
    return websiteRepository.deleteGallery(gymId, id);
  },

  createProgram(gymId: string, input: Record<string, unknown>) {
    return websiteRepository.upsertProgram(gymId, input);
  },

  updateProgram(gymId: string, id: string, input: Record<string, unknown>) {
    return websiteRepository.upsertProgram(gymId, input, id);
  },

  deleteProgram(gymId: string, id: string) {
    return websiteRepository.deleteProgram(gymId, id);
  },

  createPricing(gymId: string, input: Record<string, unknown>) {
    return websiteRepository.upsertPricing(gymId, input);
  },

  updatePricing(gymId: string, id: string, input: Record<string, unknown>) {
    return websiteRepository.upsertPricing(gymId, input, id);
  },

  deletePricing(gymId: string, id: string) {
    return websiteRepository.deletePricing(gymId, id);
  },

  createBlog(gymId: string, input: Record<string, unknown>) {
    return websiteRepository.upsertBlog(gymId, input);
  },

  updateBlog(gymId: string, id: string, input: Record<string, unknown>) {
    return websiteRepository.upsertBlog(gymId, input, id);
  },

  deleteBlog(gymId: string, id: string) {
    return websiteRepository.deleteBlog(gymId, id);
  },
};