# Bot Manager

Bot Manager is a monorepo project that provides a backend service for managing Discord and WhatsApp bots, along with a frontend interface built using Next.js. The backend exposes RESTful API endpoints to retrieve bot information and their statuses, while the frontend offers a user-friendly interface to manage and view the status of these bots.

## Project Structure

```
bot-manager
├── backend          # Node.js TypeScript backend
│   ├── src
│   │   ├── controllers       # Controllers for handling requests
│   │   ├── routes            # Route definitions
│   │   ├── services          # Services for bot interactions
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
├── package.json           # Root configuration for the monorepo
└── README.md              # Overview and setup instructions for the project
```

## Features

- **Backend**:
  - RESTful API to manage Discord and WhatsApp bots.
  - Endpoints to retrieve all bots and their statuses.
  
- **Frontend**:
  - User interface to view and manage bot statuses.
  - Built with Next.js 15 using the app router.

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

- **GET /api/bots**: Retrieve all current Discord and WhatsApp bots.
- **GET /api/status/discord**: Get the status of Discord bots.
- **GET /api/status/whatsapp**: Get the status of WhatsApp bots.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License.