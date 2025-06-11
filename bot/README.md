# WhatsApp Web API with Express

This project demonstrates how to interact with WhatsApp Web using the `whatsapp-web.js` library and an Express.js server. You can send messages, receive messages, and even send images with captions to WhatsApp contacts programmatically.

## Getting Started

Follow these steps to set up and run the application:

### Prerequisites

- Node.js and npm installed on your machine.

### Installation

1. Clone the repository to your local machine:

   ```bash
   git clone https://github.com/yourusername/whatsapp-web-api.git
   ```
   
2. Change to the project directory:

   ```bash
   cd whatsapp-web-api
   ```

3. Install the dependencies:

   ```bash
   npm install
   ```

4. Change bot library:

   ```bash
   // Web-whatsapp.js
   node change-client-bot.js BC=WW

   // Venom-bot
   node change-client-bot.js BC=VB
   ```

5. Start the Express server:

   ```bash
   npm start
   ```

### Usage

After starting the server, open your browser and navigate to http://localhost:5000 to access the application.

Scan the QR code with your phone using the WhatsApp app to authenticate.

Once authenticated, the application will be ready to send and receive WhatsApp messages programmatically.

### Endpoints

#### **1. `/status`**
- **Method**: `GET`
- **Description**: Retrieves the bot's current status, including uptime, root folder, port, and fallback number.
- **Response**:
  ```json
  {
    "status": "Bot is running",
    "rootFolder": "/path/to/root",
    "port": 7260,
    "uptime": "3600 seconds",
    "fallbackNumber": "1234567890"
  }
  ```

#### **2. `/restart`**
- **Method**: `POST`
- **Description**: Restarts the bot. Useful for applying configuration changes.
- **Response**:
  ```json
  {
    "message": "Bot is restarting..."
  }
  ```

#### **3. `/change-fallback-number`**
- **Method**: `POST`
- **Description**: Updates the fallback phone number used when a valid number is unavailable.
- **Request Body**:
  ```json
  {
    "newFallbackNumber": "9876543210"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Fallback number updated successfully",
    "fallbackNumber": "9876543210"
  }
  ```

#### **4. `/change-port`**
- **Method**: `POST`
- **Description**: Changes the server's port and restarts the bot to apply the change.
- **Request Body**:
  ```json
  {
    "newPort": 8080
  }
  ```
- **Response**:
  ```json
  {
    "message": "Server port will change to 8080. Restarting..."
  }
  ```

#### **5. `/qr-code`**
- **Method**: `GET`
- **Description**: Retrieves the QR code for WhatsApp Web authentication.
- **Response**:
  - If QR code is available:
    ```html
    <img src="data:image/png;base64,..." alt="QR Code" />
    ```
  - If QR code is unavailable:
    ```html
    <h1>QR code not found, try refreshing</h1>
    ```

#### **6. `/send-message`**
- **Method**: `POST`
- **Description**: Sends a WhatsApp message to a specific contact.
- **Request Body**:
  ```json
  {
    "phoneNumber": "+1234567890",
    "message": "Hello, this is a test message!"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Message sent successfully"
  }
  ```

#### **7. `/receive-image-and-json`**
- **Method**: `POST`
- **Description**: Sends an image and a JSON object as a WhatsApp message.
- **Request Body**:
  ```json
  {
    "phoneNumber": "+1234567890",
    "image": "base64EncodedImage",
    "name": "John Doe",
    "rank": "1"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Message sent successfully"
  }
  ```

#### **8. `/confirmation`**
- **Method**: `POST`
- **Description**: Sends a confirmation message to a user based on their Discord ID or phone number.
- **Request Body**:
  ```json
  {
    "discorduserid": "123456789",
    "phoneNumber": "+1234567890",
    "message": "Your confirmation message here"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Confirmation message sent successfully"
  }
  ```

### Notes:
- Ensure the server is running on the correct port (`BASE_URL` in `.env`).
- Use appropriate headers (`Content-Type: application/json`) for POST requests.
- For troubleshooting, refer to the server logs.

### Additional Configuration

You can customize the behavior of the WhatsApp client by modifying the code in `app.js`.

### Troubleshooting

If you encounter any issues or errors, please check the console for error messages.

### License

This project is licensed under the MIT License - see the LICENSE file for details.

### Acknowledgments

- **whatsapp-web.js**: WhatsApp Web API library used in this project.
- **Express.js**: Web framework for Node.js used to build the server.
- **axios**: HTTP client for making requests to external APIs.
- **qrcode-terminal**: Library for displaying QR codes in the terminal.