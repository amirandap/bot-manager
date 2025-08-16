export interface EndpointRoutingResult {
  endpoint: string;
  bodyData: any;
  messageType: string;
}

export class MessageRoutingService {
  /**
   * Determine the optimal endpoint based on message data and file attachment
   *
   * ✅ SIMPLIFIED: Always use unified /send-message endpoint
   * The bot's /send-message handles all types: text, images, videos, audio, documents
   * and all recipients: individual phones, multiple phones, groups, mixed
   */
  public determineOptimalEndpoint(
    data: any,
    file?: Express.Multer.File
  ): EndpointRoutingResult {
    // Always use the unified /send-message endpoint
    // The bot will auto-detect content type and recipient types
    const messageType = this.determineMessageType(data, file);
    const bodyData = this.createUnifiedBodyData(data);

    console.log(
      `� [BACKEND] Using UNIFIED endpoint → /send-message (${messageType})`
    );

    return {
      endpoint: "/send-message",
      bodyData,
      messageType,
    };
  }

  /**
   * Determine message type for logging/analytics purposes
   */
  private determineMessageType(data: any, file?: Express.Multer.File): string {
    if (file) {
      const mimeType = file.mimetype.toLowerCase();
      if (mimeType.startsWith("image/")) return "IMAGE_ATTACHMENT";
      if (mimeType.startsWith("video/")) return "VIDEO_ATTACHMENT";
      if (mimeType.startsWith("audio/")) return "AUDIO_ATTACHMENT";
      return "DOCUMENT_ATTACHMENT";
    }

    const allRecipients = this.normalizeRecipients(data);
    const { groups, phones } = this.separateRecipients(allRecipients);

    if (groups.length > 0 && phones.length > 0) return "HYBRID";
    if (groups.length > 0) return "GROUP";
    if (phones.length > 1) return "BROADCAST";
    if (phones.length === 1) return "INDIVIDUAL";
    return "TEXT_ONLY";
  }

  /**
   * Create unified body data using bot's /send-message format
   * Uses "to" field as per bot's unified endpoint specification
   */
  private createUnifiedBodyData(data: any): any {
    const allRecipients = this.normalizeRecipients(data);

    // Use bot's unified format with "to" field
    const bodyData: any = {
      to: allRecipients.length === 1 ? allRecipients[0] : allRecipients,
      message: data.message || "", // Message or caption
    };

    // Pass through Discord integration if exists
    if (data.discorduserid) {
      bodyData.discorduserid = data.discorduserid;
    }

    // Handle legacy caption field (for compatibility)
    if (data.caption) {
      bodyData.message = data.caption;
    }

    return bodyData;
  }

  /**
   * Normalize recipients from various input formats
   * Supports: phoneNumber, to, groupId, group_id fields
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
   * Separate recipients into groups and phone numbers
   * Groups contain "@g.us", phones don't
   */
  private separateRecipients(recipients: string[]): {
    groups: string[];
    phones: string[];
  } {
    const groups = recipients.filter((recipient) =>
      recipient.includes("@g.us")
    );
    const phones = recipients.filter(
      (recipient) => !recipient.includes("@g.us")
    );

    return { groups, phones };
  }
}
