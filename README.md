# Bot Manager

Bot Manager is a monorepo project that provides a backend service for managing Discord and WhatsApp bots, along with a frontend interface built using Next.js. The backend uses a configuration file to manage bot definitions and exposes RESTful API endpoints to retrieve bot information and their statuses, while the frontend offers a user-friendly interface to manage and view the status of these bots.

## Project Structure

```
bot-manager
├── backend          # Node.js TypeScript backend
│   ├── src
│   │   ├── controllers       # Controllers for handling requests
│   │   ├── routes            # Route definitions
│   │   ├── services          # Services for bot interactions and config management
│   │   ├── app.ts            # Entry point for the backend application
│   │   └── types             # Type definitions
│   ├── package.json          # Backend dependencies and scripts
│   ├── tsconfig.json         # TypeScript configuration for backend
│   └── README.md             # Documentation for the backend
├── frontend         # Next.js frontend
│   ├── src
│   │   ├── app              # Application layout and pages
│   │   ├── components        # React components
│   │   ├── pages            # Page components
│   │   └── styles           # Global styles
│   ├── package.json         # Frontend dependencies and scripts
│   ├── tsconfig.json        # TypeScript configuration for frontend
│   └── README.md            # Documentation for the frontend
├── config                 # Configuration files
│   └── bots.json          # Bot configuration file
├── package.json           # Root configuration for the monorepo
└── README.md              # Overview and setup instructions for the project
```

## Features

- **Backend**:
  - Configuration-driven bot management via JSON file
  - RESTful API to manage Discord and WhatsApp bots
  - Endpoints to retrieve all bots and their statuses
  - CRUD operations for bot management
  - Fallback API host configuration for empty apiHost values
  
- **Frontend**:
  - User interface to view and manage bot statuses
  - Built with Next.js 15 using the app router

## Configuration

The bot configuration is stored in `config/bots.json`. Each bot entry includes:

- `id`: Unique identifier for the bot
- `name`: Display name of the bot
- `type`: Bot type ('whatsapp' or 'discord')
- `pm2ServiceId`: PM2 process identifier
- `apiHost`: API host URL (uses fallback if empty)
- `apiPort`: API port number
- `phoneNumber`: WhatsApp phone number (null for Discord bots)
- `pushName`: WhatsApp display name (null for Discord bots)
- `enabled`: Whether the bot is active
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### Environment Variables

- `FALLBACK_API_HOST`: Default API host when bot's apiHost is empty (default: 'http://localhost')
- `PORT`: Backend server port (default: 3001)

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd bot-manager
   ```

2. Install dependencies for both backend and frontend:
   ```
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

3. Ensure the configuration file exists:
   ```
   mkdir -p config
   # Copy the sample configuration or create your own config/bots.json
   ```

### Running the Application

- To start the backend server:
  ```
  cd backend
  npm run start
  ```

- To start the frontend application:
  ```
  cd frontend
  npm run dev
  ```

### API Endpoints

- **GET /api/bots**: Retrieve all configured bots
- **GET /api/status/discord**: Get the status of Discord bots
- **GET /api/status/whatsapp**: Get the status of WhatsApp bots
- **GET /api/status/:id**: Get the status of a specific bot
- **POST /api/bots**: Create a new bot configuration
- **PUT /api/bots/:id**: Update an existing bot configuration
- **DELETE /api/bots/:id**: Delete a bot configuration

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License.