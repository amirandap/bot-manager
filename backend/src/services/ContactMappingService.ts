import Database from 'better-sqlite3';
import path from 'path';

export interface ContactMapping {
  externalsource: string;
  externalid: string;
  phonenumber: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContactLookupResult {
  found: boolean;
  phonenumber?: string;
  mapping?: ContactMapping;
}

/**
 * Service for managing external contact mappings
 * Maps external identifiers (like @logistica_softgroup from trellousername) to phone numbers
 */
export class ContactMappingService {
  private db: Database.Database;
  private dbPath: string;

  constructor() {
    // Create database in data directory
    this.dbPath = path.join(__dirname, '../../../data/contact_mappings.db');
    this.db = new Database(this.dbPath);
    this.initializeDatabase();
  }

  /**
   * Initialize the database and create the contact_mappings table
   */
  private initializeDatabase(): void {
    try {
      // Create the contact_mappings table
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS contact_mappings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          externalsource TEXT NOT NULL,
          externalid TEXT NOT NULL,
          phonenumber TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(externalsource, externalid)
        )
      `;
      
      this.db.exec(createTableQuery);

      // Create index for faster lookups
      const createIndexQuery = `
        CREATE INDEX IF NOT EXISTS idx_external_lookup 
        ON contact_mappings(externalsource, externalid)
      `;
      
      this.db.exec(createIndexQuery);

      console.log('✅ Contact mappings database initialized successfully');
      console.log(`📁 Database location: ${this.dbPath}`);
      
      // Log current mappings count
      const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM contact_mappings');
      const result = countStmt.get() as { count: number };
      console.log(`📊 Current mappings count: ${result.count}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize contact mappings database:', error);
      throw error;
    }
  }

  /**
   * Look up a phone number by external source and ID
   */
  public lookupPhoneNumber(externalsource: string, externalid: string): ContactLookupResult {
    try {
      console.log(`🔍 Looking up contact: ${externalsource} -> ${externalid}`);
      
      const stmt = this.db.prepare(`
        SELECT externalsource, externalid, phonenumber, created_at, updated_at 
        FROM contact_mappings 
        WHERE externalsource = ? AND externalid = ?
      `);
      
      const result = stmt.get(externalsource, externalid) as ContactMapping | undefined;
      
      if (result) {
        console.log(`✅ Contact found: ${externalid} -> ${result.phonenumber}`);
        return {
          found: true,
          phonenumber: result.phonenumber,
          mapping: result
        };
      } else {
        console.log(`❌ Contact not found: ${externalsource} -> ${externalid}`);
        return {
          found: false
        };
      }
    } catch (error) {
      console.error('❌ Error looking up contact:', error);
      throw error;
    }
  }

  /**
   * Add a new contact mapping
   */
  public addMapping(mapping: Omit<ContactMapping, 'created_at' | 'updated_at'>): ContactMapping {
    try {
      console.log(`📝 Adding contact mapping: ${mapping.externalsource} -> ${mapping.externalid} -> ${mapping.phonenumber}`);
      
      const stmt = this.db.prepare(`
        INSERT INTO contact_mappings (externalsource, externalid, phonenumber) 
        VALUES (?, ?, ?)
      `);
      
      const result = stmt.run(mapping.externalsource, mapping.externalid, mapping.phonenumber);
      
      // Get the inserted record
      const getStmt = this.db.prepare(`
        SELECT externalsource, externalid, phonenumber, created_at, updated_at 
        FROM contact_mappings 
        WHERE rowid = ?
      `);
      
      const insertedMapping = getStmt.get(result.lastInsertRowid) as ContactMapping;
      
      console.log(`✅ Contact mapping added successfully with ID: ${result.lastInsertRowid}`);
      return insertedMapping;
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        console.log(`⚠️ Contact mapping already exists: ${mapping.externalsource} -> ${mapping.externalid}`);
        throw new Error(`Contact mapping already exists for ${mapping.externalsource}:${mapping.externalid}`);
      }
      console.error('❌ Error adding contact mapping:', error);
      throw error;
    }
  }

  /**
   * Update an existing contact mapping
   */
  public updateMapping(externalsource: string, externalid: string, phonenumber: string): ContactMapping | null {
    try {
      console.log(`📝 Updating contact mapping: ${externalsource} -> ${externalid} -> ${phonenumber}`);
      
      const stmt = this.db.prepare(`
        UPDATE contact_mappings 
        SET phonenumber = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE externalsource = ? AND externalid = ?
      `);
      
      const result = stmt.run(phonenumber, externalsource, externalid);
      
      if (result.changes === 0) {
        console.log(`❌ Contact mapping not found for update: ${externalsource} -> ${externalid}`);
        return null;
      }
      
      // Get the updated record
      const getStmt = this.db.prepare(`
        SELECT externalsource, externalid, phonenumber, created_at, updated_at 
        FROM contact_mappings 
        WHERE externalsource = ? AND externalid = ?
      `);
      
      const updatedMapping = getStmt.get(externalsource, externalid) as ContactMapping;
      
      console.log(`✅ Contact mapping updated successfully`);
      return updatedMapping;
      
    } catch (error) {
      console.error('❌ Error updating contact mapping:', error);
      throw error;
    }
  }

  /**
   * Delete a contact mapping
   */
  public deleteMapping(externalsource: string, externalid: string): boolean {
    try {
      console.log(`🗑️ Deleting contact mapping: ${externalsource} -> ${externalid}`);
      
      const stmt = this.db.prepare(`
        DELETE FROM contact_mappings 
        WHERE externalsource = ? AND externalid = ?
      `);
      
      const result = stmt.run(externalsource, externalid);
      
      if (result.changes === 0) {
        console.log(`❌ Contact mapping not found for deletion: ${externalsource} -> ${externalid}`);
        return false;
      }
      
      console.log(`✅ Contact mapping deleted successfully`);
      return true;
      
    } catch (error) {
      console.error('❌ Error deleting contact mapping:', error);
      throw error;
    }
  }

  /**
   * Delete all contact mappings (clear the table)
   */
  public deleteAllMappings(): number {
    try {
      console.log(`🗑️ Deleting ALL contact mappings`);
      
      const stmt = this.db.prepare('DELETE FROM contact_mappings');
      const result = stmt.run();
      
      console.log(`✅ Deleted ${result.changes} contact mappings`);
      return result.changes;
      
    } catch (error) {
      console.error('❌ Error deleting all contact mappings:', error);
      throw error;
    }
  }

  /**
   * Get all mappings for a specific external source
   */
  public getMappingsBySource(externalsource: string): ContactMapping[] {
    try {
      console.log(`📋 Getting all mappings for source: ${externalsource}`);
      
      const stmt = this.db.prepare(`
        SELECT externalsource, externalid, phonenumber, created_at, updated_at 
        FROM contact_mappings 
        WHERE externalsource = ? 
        ORDER BY created_at DESC
      `);
      
      const mappings = stmt.all(externalsource) as ContactMapping[];
      
      console.log(`📊 Found ${mappings.length} mappings for source: ${externalsource}`);
      return mappings;
      
    } catch (error) {
      console.error('❌ Error getting mappings by source:', error);
      throw error;
    }
  }

  /**
   * Get all contact mappings with optional pagination
   */
  public getAllMappings(limit: number = 100, offset: number = 0): { mappings: ContactMapping[], total: number } {
    try {
      console.log(`📋 Getting all mappings (limit: ${limit}, offset: ${offset})`);
      
      // Get total count
      const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM contact_mappings');
      const countResult = countStmt.get() as { count: number };
      
      // Get mappings with pagination
      const stmt = this.db.prepare(`
        SELECT externalsource, externalid, phonenumber, created_at, updated_at 
        FROM contact_mappings 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `);
      
      const mappings = stmt.all(limit, offset) as ContactMapping[];
      
      console.log(`📊 Retrieved ${mappings.length} mappings out of ${countResult.count} total`);
      
      return {
        mappings,
        total: countResult.count
      };
      
    } catch (error) {
      console.error('❌ Error getting all mappings:', error);
      throw error;
    }
  }

  /**
   * Check if the database connection is healthy
   */
  public healthCheck(): { healthy: boolean, error?: string } {
    try {
      const stmt = this.db.prepare('SELECT 1 as test');
      stmt.get();
      return { healthy: true };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Close the database connection
   */
  public close(): void {
    try {
      this.db.close();
      console.log('📴 Contact mappings database connection closed');
    } catch (error) {
      console.error('❌ Error closing database:', error);
    }
  }

  /**
   * Get database statistics
   */
  public getStats(): { totalMappings: number, uniqueSources: number, dbPath: string } {
    try {
      const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM contact_mappings');
      const totalResult = totalStmt.get() as { count: number };
      
      const sourcesStmt = this.db.prepare('SELECT COUNT(DISTINCT externalsource) as count FROM contact_mappings');
      const sourcesResult = sourcesStmt.get() as { count: number };
      
      return {
        totalMappings: totalResult.count,
        uniqueSources: sourcesResult.count,
        dbPath: this.dbPath
      };
    } catch (error) {
      console.error('❌ Error getting database stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const contactMappingService = new ContactMappingService();