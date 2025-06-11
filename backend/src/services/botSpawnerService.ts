import fs from 'fs';
import path from 'path';
import pm2 from 'pm2';
import { ConfigService } from './configService';
import { Bot } from '../types';

export class BotSpawnerService {
    private configService: ConfigService;
    private botDirectory: string;
    private dataDirectory: string;

    constructor() {
        this.configService = ConfigService.getInstance();
        this.botDirectory = path.join(__dirname, '../../../bot');
        this.dataDirectory = path.join(__dirname, '../../../data');
    }

    async createNewWhatsAppBot(botConfig: Omit<Bot, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bot> {
        try {
            const botId = `whatsapp-bot-${Date.now()}`;
            
            console.log(`🤖 Creating new WhatsApp bot: ${botId}`);

            // 1. Validar que el bot directory existe y tiene package.json
            await this.validateBotDirectory();

            // 2. Crear directorios centrales para este bot
            await this.createBotDataDirectories(botId);

            // 3. Iniciar bot con PM2 usando variables de entorno
            await this.startBotWithPM2(botId, botConfig);

            // 4. Agregar a configuración central (config/bots.json)
            const newBot = await this.addBotToConfig(botConfig, botId);

            console.log(`✅ Bot ${botId} created and started successfully`);
            console.log(`📄 Updated config/bots.json with new bot`);
            
            return newBot;

        } catch (error) {
            console.error('❌ Error creating new WhatsApp bot:', error);
            throw new Error(`Failed to create new WhatsApp bot: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async validateBotDirectory(): Promise<void> {
        const packageJsonPath = path.join(this.botDirectory, 'package.json');
        
        if (!fs.existsSync(this.botDirectory)) {
            throw new Error(`Bot directory not found: ${this.botDirectory}`);
        }
        
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error(`Bot package.json not found: ${packageJsonPath}`);
        }

        console.log(`✅ Bot directory validated: ${this.botDirectory}`);
    }

    private async createBotDataDirectories(botId: string): Promise<void> {
        console.log(`📁 Creating data directories for bot: ${botId}`);
        
        const directories = [
            path.join(this.dataDirectory, 'sessions', botId),
            path.join(this.dataDirectory, 'qr-codes'),
            path.join(this.dataDirectory, 'logs', botId)
        ];
        
        directories.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`  ✅ Created ${path.relative(process.cwd(), dir)}`);
            }
        });
    }

    private async startBotWithPM2(botId: string, botConfig: any): Promise<void> {
        console.log(`🚀 Starting bot ${botId} with PM2...`);
        
        return new Promise((resolve, reject) => {
            pm2.connect((err) => {
                if (err) {
                    console.error('❌ Failed to connect to PM2:', err);
                    reject(err);
                    return;
                }

                const pm2Config = {
                    name: botId,
                    script: path.join(this.botDirectory, 'src/simple-index.ts'),
                    interpreter: 'ts-node',
                    cwd: this.botDirectory,
                    env: {
                        ...process.env,
                        BOT_ID: botId,
                        BOT_NAME: botConfig.name,
                        BOT_PORT: botConfig.apiPort.toString(),
                        BOT_TYPE: botConfig.type,
                        NODE_ENV: 'production'
                    }
                };

                pm2.start(pm2Config, (err, proc) => {
                    pm2.disconnect(); // Always disconnect after operation
                    
                    if (err) {
                        console.error(`❌ PM2 start failed:`, err);
                        reject(err);
                    } else {
                        console.log(`  ✅ Bot ${botId} started with PM2`);
                        console.log(`  📄 PM2 process created successfully`);
                        resolve();
                    }
                });
            });
        });
    }

    private async addBotToConfig(botConfig: any, botId: string): Promise<Bot> {
        const newBot: Bot = {
            ...botConfig,
            id: botId,
            pm2ServiceId: botId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Usar ConfigService para agregar al JSON y guardar automáticamente
        const addedBot = this.configService.addBot(newBot);
        
        console.log(`📝 Bot added to config/bots.json:`);
        console.log(`   - ID: ${addedBot.id}`);
        console.log(`   - Name: ${addedBot.name}`);
        console.log(`   - Port: ${addedBot.apiPort}`);
        console.log(`   - PM2 Service: ${addedBot.pm2ServiceId}`);

        return addedBot;
    }

    async stopBot(botId: string): Promise<boolean> {
        console.log(`🛑 Stopping bot: ${botId}`);
        
        return new Promise((resolve) => {
            pm2.connect((err) => {
                if (err) {
                    console.error(`❌ Failed to connect to PM2:`, err);
                    resolve(false);
                    return;
                }

                pm2.stop(botId, (err) => {
                    pm2.disconnect();
                    
                    if (err) {
                        console.error(`❌ Error stopping bot ${botId}:`, err);
                        resolve(false);
                    } else {
                        console.log(`✅ Bot ${botId} stopped successfully`);
                        resolve(true);
                    }
                });
            });
        });
    }

    async startBot(botId: string): Promise<boolean> {
        console.log(`🚀 Starting bot: ${botId}`);
        
        return new Promise((resolve) => {
            pm2.connect((err) => {
                if (err) {
                    console.error(`❌ Failed to connect to PM2:`, err);
                    resolve(false);
                    return;
                }

                pm2.restart(botId, (err) => {
                    pm2.disconnect();
                    
                    if (err) {
                        console.error(`❌ Error starting bot ${botId}:`, err);
                        resolve(false);
                    } else {
                        console.log(`✅ Bot ${botId} started successfully`);
                        resolve(true);
                    }
                });
            });
        });
    }

    async restartBot(botId: string): Promise<boolean> {
        console.log(`🔄 Restarting bot: ${botId}`);
        
        return new Promise((resolve) => {
            pm2.connect((err) => {
                if (err) {
                    console.error(`❌ Failed to connect to PM2:`, err);
                    resolve(false);
                    return;
                }

                pm2.restart(botId, (err) => {
                    pm2.disconnect();
                    
                    if (err) {
                        console.error(`❌ Error restarting bot ${botId}:`, err);
                        resolve(false);
                    } else {
                        console.log(`✅ Bot ${botId} restarted successfully`);
                        resolve(true);
                    }
                });
            });
        });
    }

    async deleteBot(botId: string): Promise<boolean> {
        try {
            console.log(`🗑️  Deleting bot: ${botId}`);

            // 1. Detener bot en PM2
            await this.stopBot(botId);

            // 2. Eliminar de PM2
            await new Promise<void>((resolve) => {
                pm2.connect((err) => {
                    if (err) {
                        console.warn(`⚠️  Warning connecting to PM2: ${err.message}`);
                        resolve();
                        return;
                    }

                    pm2.delete(botId, (err) => {
                        pm2.disconnect();
                        
                        if (err) {
                            console.warn(`⚠️  Warning deleting from PM2: ${err.message}`);
                        } else {
                            console.log(`✅ Bot ${botId} removed from PM2`);
                        }
                        resolve();
                    });
                });
            });

            // 3. Eliminar datos del bot (sessions, logs, qr)
            const botDataPaths = [
                path.join(this.dataDirectory, 'sessions', botId),
                path.join(this.dataDirectory, 'logs', botId)
            ];

            botDataPaths.forEach(dir => {
                if (fs.existsSync(dir)) {
                    fs.rmSync(dir, { recursive: true, force: true });
                    console.log(`✅ Removed data directory: ${path.relative(process.cwd(), dir)}`);
                }
            });

            // 4. Eliminar QR code
            const qrPath = path.join(this.dataDirectory, 'qr-codes', `${botId}.png`);
            if (fs.existsSync(qrPath)) {
                fs.unlinkSync(qrPath);
                console.log(`✅ Removed QR code: ${path.relative(process.cwd(), qrPath)}`);
            }

            // 5. Eliminar de config/bots.json
            const deleted = this.configService.deleteBot(botId);
            if (deleted) {
                console.log(`✅ Bot ${botId} removed from config/bots.json`);
            } else {
                console.warn(`⚠️  Bot ${botId} not found in config/bots.json`);
            }

            console.log(`🎉 Bot ${botId} completely deleted`);
            return true;

        } catch (error) {
            console.error(`❌ Error deleting bot ${botId}:`, error);
            return false;
        }
    }

    async listActiveBots(): Promise<{ pm2Bots: any[], configBots: Bot[] }> {
        try {
            // 1. Obtener bots de PM2
            const pm2Bots = await new Promise<any[]>((resolve) => {
                pm2.connect((err) => {
                    if (err) {
                        console.warn('⚠️  Could not connect to PM2:', err.message);
                        resolve([]);
                        return;
                    }

                    pm2.list((err, processDescriptionList) => {
                        pm2.disconnect();
                        
                        if (err) {
                            console.warn('⚠️  Could not get PM2 list:', err.message);
                            resolve([]);
                        } else {
                            resolve(processDescriptionList || []);
                        }
                    });
                });
            });

            // 2. Obtener bots de config
            const configBots = this.configService.getAllBots();

            return { pm2Bots, configBots };

        } catch (error) {
            console.error('❌ Error listing active bots:', error);
            return { pm2Bots: [], configBots: [] };
        }
    }

    async syncBotsWithPM2(): Promise<{ synchronized: string[], orphaned: string[], missing: string[] }> {
        const { pm2Bots, configBots } = await this.listActiveBots();
        
        const pm2BotNames = pm2Bots.map(bot => bot.name);
        const configBotIds = configBots.map(bot => bot.id);

        const synchronized = configBotIds.filter(id => pm2BotNames.includes(id));
        const orphaned = pm2BotNames.filter(name => !configBotIds.includes(name));
        const missing = configBotIds.filter(id => !pm2BotNames.includes(id));

        console.log(`📊 Bot synchronization status:`);
        console.log(`   ✅ Synchronized: ${synchronized.length} bots`);
        console.log(`   🔍 Orphaned PM2 processes: ${orphaned.length} bots`);
        console.log(`   ❓ Missing from PM2: ${missing.length} bots`);

        return { synchronized, orphaned, missing };
    }
}
