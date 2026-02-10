# Startup Guide for UnifiedLearningApp

## Prerequisites

- Node.js and npm
- Python 3.x
- Android Studio (for Android emulator) or a physical device
- React Native development environment set up (JDK, Android SDK, etc.)

## 1. Backend Setup

The backend is a Python FastAPI application.

1.  **Navigate to the backend directory:**
    ```bash
    cd UnifiedLearningApp/backend
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv venv
    .\venv\Scripts\activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the server:**
    ```bash
    python main.py
    ```
    The server will start on `http://0.0.0.0:8000`.

## 2. Frontend Setup

The frontend is a React Native Expo project.

1.  **Navigate to the app directory:**
    ```bash
    cd UnifiedLearningApp
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the application:**

    - **For Android (recommended):**
      Make sure your Android emulator is running or a device is connected.
      ```bash
      npm run android
      ```

    - **For iOS (Mac only):**
      ```bash
      npm run ios
      ```

    - **Start with Expo Go (might not work with some native modules):**
      ```bash
      npm start
      ```

## Troubleshooting

- **Backend Connection:** Ensure your device/emulator can reach the backend. If using an emulator, `http://10.0.2.2:8000` often maps to `localhost:8000`. Check your frontend API configuration.
- **Native Modules:** If you see errors about missing modules, try rebuilding the development build:
  ```bash
  npx expo run:android
  ```
