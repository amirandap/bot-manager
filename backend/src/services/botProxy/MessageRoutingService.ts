export interface EndpointRoutingResult {
  endpoint: string;
  bodyData: any;
  messageType: string;
}

export class MessageRoutingService {
  
  /**
   * Determine the optimal endpoint based on message data and file attachment
   */
  public determineOptimalEndpoint(data: any, file?: Express.Multer.File): EndpointRoutingResult {
    
    // Check if there's a file attachment
    if (file) {
      console.log(`📎 [BACKEND] File attachment detected: ${file.originalname} (${file.mimetype})`);
      
      // Determine endpoint based on file type
      const mimeType = file.mimetype.toLowerCase();
      
      if (mimeType.startsWith('image/')) {
        console.log(`🖼️ [BACKEND] IMAGE attachment → /send-image`);
        return {
          endpoint: "/send-image",
          bodyData: {
            to: this.normalizeRecipients(data),
            message: data.message || '' // Use as caption for images
          },
          messageType: "IMAGE_ATTACHMENT"
        };
      } else if (mimeType.startsWith('video/')) {
        console.log(`🎬 [BACKEND] VIDEO attachment → /send-video`);
        return {
          endpoint: "/send-video",
          bodyData: {
            to: this.normalizeRecipients(data),
            message: data.message || '' // Use as caption for videos
          },
          messageType: "VIDEO_ATTACHMENT"
        };
      } else if (mimeType.startsWith('audio/')) {
        console.log(`🎵 [BACKEND] AUDIO attachment → /send-audio`);
        return {
          endpoint: "/send-audio",
          bodyData: {
            to: this.normalizeRecipients(data),
            message: data.message || ''
          },
          messageType: "AUDIO_ATTACHMENT"
        };
      } else {
        // Everything else goes to document endpoint
        console.log(`📄 [BACKEND] DOCUMENT attachment → /send-document`);
        return {
          endpoint: "/send-document",
          bodyData: {
            to: this.normalizeRecipients(data),
            message: data.message || ''
          },
          messageType: "DOCUMENT_ATTACHMENT"
        };
      }
    }
    
    // No file attachment - use existing logic
    return this.determineTextMessageEndpoint(data);
  }

  /**
   * Normalize recipients from various input formats
   */
  public normalizeRecipients(data: any): string[] {
    const toField = data.to || [];
    const phoneNumbers = data.phoneNumber || [];
    const groupId = data.groupId || data.group_id;
    
    // Combine all recipients into unified array
    let allRecipients: string[] = [];
    
    // Add phoneNumber(s) to recipients
    if (Array.isArray(phoneNumbers)) {
      allRecipients.push(...phoneNumbers);
    } else if (phoneNumbers) {
      allRecipients.push(phoneNumbers);
    }
    
    // Add to field to recipients  
    if (Array.isArray(toField)) {
      allRecipients.push(...toField);
    } else if (toField) {
      allRecipients.push(toField);
    }
    
    // Add groupId to recipients
    if (groupId) {
      allRecipients.push(groupId);
    }
    
    // Remove duplicates
    const uniqueRecipients = new Set(allRecipients);
    return Array.from(uniqueRecipients);
  }

  /**
   * Determine endpoint for text-only messages (existing logic)
   */
  private determineTextMessageEndpoint(data: any): EndpointRoutingResult {
    const allRecipients = this.normalizeRecipients(data);
    
    // Classify recipients
    const groups = allRecipients.filter(recipient => recipient.includes('@g.us'));
    const phones = allRecipients.filter(recipient => !recipient.includes('@g.us'));
    
    // Determine optimal endpoint and format data
    if (groups.length > 0 && phones.length > 0) {
      // HYBRID: Use broadcast endpoint
      console.log(`🔄 [BACKEND] HYBRID message → /send-broadcast (${phones.length} phones + ${groups.length} groups)`);
      return {
        endpoint: "/send-broadcast",
        bodyData: { 
          to: allRecipients,
          message: data.message
        },
        messageType: "HYBRID"
      };
      
    } else if (groups.length > 0) {
      // GROUP ONLY: Use group-specific endpoint
      console.log(`🏢 [BACKEND] GROUP message → /send-to-group (${groups.length} group(s))`);
      return {
        endpoint: "/send-to-group",
        bodyData: {
          groupId: groups.length === 1 ? groups[0] : groups,
          message: data.message
        },
        messageType: "GROUP"
      };
      
    } else if (phones.length >= 1) {
      // PHONE(S): Use phone-specific endpoint
      console.log(`📱 [BACKEND] PHONE message → /send-to-phone (${phones.length} phone(s))`);
      return {
        endpoint: "/send-to-phone",
        bodyData: {
          phoneNumber: phones.length === 1 ? phones[0] : phones,
          message: data.message,
          discorduserid: data.discorduserid // Pass through if exists
        },
        messageType: phones.length === 1 ? "INDIVIDUAL" : "BROADCAST"
      };
      
    } else {
      // NO VALID RECIPIENTS: Fallback to legacy endpoint
      console.warn(`⚠️ [BACKEND] UNKNOWN message → /send-message (fallback)`);
      return {
        endpoint: "/send-message",
        bodyData: data,
        messageType: "UNKNOWN"
      };
    }
  }
}
