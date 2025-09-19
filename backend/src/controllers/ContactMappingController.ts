import { Request, Response } from 'express';
import { contactMappingService, ContactMapping } from '../services/ContactMappingService';

/**
 * Controller for managing external contact mappings
 * Provides CRUD operations for the contact mapping dictionary
 */
export class ContactMappingController {

  /**
   * GET /api/contacts/mappings - Get all contact mappings with pagination
   */
  public async getAllMappings(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const source = req.query.source as string;

      let result;
      
      if (source) {
        // Get mappings for specific source
        const mappings = contactMappingService.getMappingsBySource(source);
        result = {
          mappings,
          total: mappings.length,
          limit,
          offset: 0,
          source
        };
      } else {
        // Get all mappings with pagination
        result = contactMappingService.getAllMappings(limit, offset);
        result = { ...result, limit, offset };
      }

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error getting contact mappings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve contact mappings',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/contacts/lookup/:source/:id - Look up phone number by external source and ID
   */
  public async lookupContact(req: Request, res: Response): Promise<void> {
    try {
      const { source, id } = req.params;

      if (!source || !id) {
        res.status(400).json({
          success: false,
          error: 'External source and ID are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = contactMappingService.lookupPhoneNumber(source, id);

      if (result.found) {
        res.json({
          success: true,
          data: {
            found: true,
            phonenumber: result.phonenumber,
            mapping: result.mapping
          },
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Contact mapping not found',
          data: {
            found: false,
            searched: { externalsource: source, externalid: id }
          },
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('❌ Error looking up contact:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to lookup contact',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/contacts/mappings - Add new contact mapping
   */
  public async addMapping(req: Request, res: Response): Promise<void> {
    try {
      const { externalsource, externalid, phonenumber } = req.body;

      // Validation
      if (!externalsource || !externalid || !phonenumber) {
        res.status(400).json({
          success: false,
          error: 'externalsource, externalid, and phonenumber are required',
          received: { externalsource, externalid, phonenumber },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate phone number format (basic validation)
      const phoneRegex = /^\+?[1-9]\d{10,14}$/;
      if (!phoneRegex.test(phonenumber.replace(/\s/g, ''))) {
        res.status(400).json({
          success: false,
          error: 'Invalid phone number format. Use international format (e.g., +1234567890)',
          received: { phonenumber },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const mapping = contactMappingService.addMapping({
        externalsource: externalsource.trim(),
        externalid: externalid.trim(),
        phonenumber: phonenumber.replace(/\s/g, '') // Remove spaces
      });

      res.status(201).json({
        success: true,
        data: mapping,
        message: 'Contact mapping added successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error adding contact mapping:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: 'Contact mapping already exists',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to add contact mapping',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * PUT /api/contacts/mappings/:source/:id - Update existing contact mapping
   */
  public async updateMapping(req: Request, res: Response): Promise<void> {
    try {
      const { source, id } = req.params;
      const { phonenumber } = req.body;

      if (!source || !id) {
        res.status(400).json({
          success: false,
          error: 'External source and ID are required in URL path',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!phonenumber) {
        res.status(400).json({
          success: false,
          error: 'phonenumber is required in request body',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate phone number format
      const phoneRegex = /^\+?[1-9]\d{10,14}$/;
      if (!phoneRegex.test(phonenumber.replace(/\s/g, ''))) {
        res.status(400).json({
          success: false,
          error: 'Invalid phone number format. Use international format (e.g., +1234567890)',
          received: { phonenumber },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const updatedMapping = contactMappingService.updateMapping(
        source.trim(),
        id.trim(),
        phonenumber.replace(/\s/g, '') // Remove spaces
      );

      if (updatedMapping) {
        res.json({
          success: true,
          data: updatedMapping,
          message: 'Contact mapping updated successfully',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Contact mapping not found',
          searched: { externalsource: source, externalid: id },
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('❌ Error updating contact mapping:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update contact mapping',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * DELETE /api/contacts/mappings/:source/:id - Delete contact mapping
   */
  public async deleteMapping(req: Request, res: Response): Promise<void> {
    try {
      const { source, id } = req.params;

      if (!source || !id) {
        res.status(400).json({
          success: false,
          error: 'External source and ID are required in URL path',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const deleted = contactMappingService.deleteMapping(source.trim(), id.trim());

      if (deleted) {
        res.json({
          success: true,
          message: 'Contact mapping deleted successfully',
          deleted: { externalsource: source, externalid: id },
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Contact mapping not found',
          searched: { externalsource: source, externalid: id },
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('❌ Error deleting contact mapping:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete contact mapping',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * DELETE /api/contacts/mappings/all - Delete all contact mappings
   */
  public async deleteAllMappings(req: Request, res: Response): Promise<void> {
    try {
      const deletedCount = contactMappingService.deleteAllMappings();

      res.json({
        success: true,
        message: `All contact mappings deleted successfully`,
        deletedCount,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error deleting all contact mappings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete all contact mappings',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/contacts/stats - Get database statistics
   */
  public async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = contactMappingService.getStats();
      const health = contactMappingService.healthCheck();

      res.json({
        success: true,
        data: {
          ...stats,
          health
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error getting contact mapping stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get database statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/contacts/bulk-import - Bulk import contact mappings
   */
  public async bulkImport(req: Request, res: Response): Promise<void> {
    try {
      const { mappings } = req.body;

      if (!Array.isArray(mappings)) {
        res.status(400).json({
          success: false,
          error: 'mappings must be an array of contact mapping objects',
          expected: {
            mappings: [
              {
                externalsource: 'string',
                externalid: 'string',
                phonenumber: 'string'
              }
            ]
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const results = {
        total: mappings.length,
        successful: 0,
        failed: 0,
        errors: [] as Array<{ index: number, mapping: any, error: string }>
      };

      for (let i = 0; i < mappings.length; i++) {
        const mapping = mappings[i];
        
        try {
          // Validate required fields
          if (!mapping.externalsource || !mapping.externalid || !mapping.phonenumber) {
            throw new Error('Missing required fields: externalsource, externalid, phonenumber');
          }

          // Validate phone number format
          const phoneRegex = /^\+?[1-9]\d{10,14}$/;
          if (!phoneRegex.test(mapping.phonenumber.replace(/\s/g, ''))) {
            throw new Error('Invalid phone number format');
          }

          contactMappingService.addMapping({
            externalsource: mapping.externalsource.trim(),
            externalid: mapping.externalid.trim(),
            phonenumber: mapping.phonenumber.replace(/\s/g, '')
          });

          results.successful++;

        } catch (error) {
          results.failed++;
          results.errors.push({
            index: i,
            mapping,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const statusCode = results.failed === 0 ? 201 : 207; // 207 = Multi-Status

      res.status(statusCode).json({
        success: results.failed === 0,
        data: results,
        message: `Bulk import completed: ${results.successful} successful, ${results.failed} failed`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error in bulk import:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process bulk import',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
}