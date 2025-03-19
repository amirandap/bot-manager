# Bot Manager Backend

## Overview
The Bot Manager backend is a Node.js application built with TypeScript that provides an API for managing Discord and WhatsApp bots. It exposes endpoints to retrieve the current list of bots and their statuses.

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bot-manager/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the application**
   ```bash
   npm start
   ```

## API Endpoints

### Get All Bots
- **Endpoint:** `GET /api/bots`
- **Description:** Returns a JSON array of all current Discord and WhatsApp bots.

### Get Discord Bot Status
- **Endpoint:** `GET /api/status/discord`
- **Description:** Returns the current status of Discord bots.

### Get WhatsApp Bot Status
- **Endpoint:** `GET /api/status/whatsapp`
- **Description:** Returns the current status of WhatsApp bots.

## Directory Structure
- `src/`: Contains the source code for the backend application.
  - `controllers/`: Contains the controllers for handling requests.
  - `routes/`: Contains the route definitions for the API.
  - `services/`: Contains the services for interacting with Discord and WhatsApp APIs.
  - `types/`: Contains TypeScript interfaces for type definitions.
  - `app.ts`: Entry point of the application.

## Technologies Used
- Node.js
- TypeScript
- Express

## License
This project is licensed under the MIT License.