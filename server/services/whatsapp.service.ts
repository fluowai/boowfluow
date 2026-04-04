import { whatsappService } from '../whatsapp';

export const whatsappSrv = {
  getInstances() {
    return whatsappService.getAllInstances();
  },
  
  async connect(instanceName: string) {
    return await whatsappService.connect(instanceName);
  },

  async disconnect(instanceName: string) {
    return await whatsappService.disconnect(instanceName);
  },

  async getContacts(instanceName: string) {
    return await whatsappService.getContacts(instanceName);
  },

  async sendTextMessage(instanceName: string, jid: string, text: string) {
    return await whatsappService.sendTextMessage(instanceName, jid, text);
  },

  async sendMediaBase64(instanceName: string, jid: string, base64: string, mimetype: string, filename?: string, caption?: string) {
    return await whatsappService.sendMediaBase64(instanceName, jid, base64, mimetype, filename, caption);
  },

  getProfilePicture(instanceName: string, jid: string) {
    return whatsappService.getProfilePicture(instanceName, jid);
  },

  getConnectionInfo(instanceName: string) {
    return whatsappService.getConnectionInfo(instanceName);
  },

  getInstanceSnapshot(instanceName: string) {
    return whatsappService.getInstanceSnapshot(instanceName);
  }
};
