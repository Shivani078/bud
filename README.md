
# Saathi AI: Your AI-Powered E-commerce Assistant

## 📝 Project Description

Saathi AI is a comprehensive, AI-powered application designed to streamline and enhance the e-commerce experience for sellers. The primary goal of this project is to provide sellers with a suite of intelligent tools that simplify complex tasks like inventory management, product listing, and market analysis. By leveraging the power of generative AI, Saathi AI empowers sellers to make data-driven decisions, optimize their online stores, and stay competitive in a fast-paced market.

### Technology Choices

- **React with Vite:** We chose **React** for its component-based architecture, which allows for the creation of reusable UI elements and a more organized codebase. **Vite** was selected as the build tool for its incredibly fast development server and optimized build process, resulting in a smoother and more efficient development experience.

- **FastAPI:** For the backend, we opted for **FastAPI**, a modern Python web framework. Its high-performance nature, automatic interactive documentation, and simple syntax make it an excellent choice for building robust and scalable APIs.

- **Groq & Google Generative AI:** The core of our AI-powered features is driven by **Groq** and **Google Generative AI**. Groq's fast inference engine ensures that our AI chat provides real-time responses, while Google's advanced models enable sophisticated features like demand forecasting and AI-driven product recommendations.

- **Firebase Authentication:** To ensure secure and reliable user management, we integrated **Firebase Authentication**, which provides a robust and easy-to-implement solution for handling user sign-up, login, and session management.

- **Appwrite:** We use **Appwrite** for its backend services, including database and storage, to manage product information and user data.

## ✨ Features

- **🤖 AI Copilot Chat:** Get instant answers to your questions, from inventory management to sales analytics.
- **📈 Trends & Insights:** Stay ahead of the curve with real-time analysis of market trends and consumer behavior.
- **📦 Inventory Planner:** Forecast demand, manage stock levels, and avoid stockouts with our intelligent inventory planner.
- **📝 Product Listing:** Quickly generate and optimize product listings with AI-powered suggestions.
- **📊 Interactive Dashboard:** Visualize your sales data, track key metrics, and gain actionable insights through an intuitive dashboard.

## 💻 Tech Stack

### Frontend

- **React:** A JavaScript library for building user interfaces.
- **Vite:** A fast build tool and development server for modern web projects.
- **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
- **Recharts:** A composable charting library for React.
- **React Router:** For declarative routing in your React application.
- **Lucide React:** A library of beautiful and consistent icons.
- **Firebase:** Used for user authentication.

### Backend

- **FastAPI:** A modern, fast (high-performance) web framework for building APIs with Python.
- **Groq:** Powering the AI chat with a fast and efficient language model.
- **Google Generative AI:** For advanced generative AI capabilities.
- **Uvicorn:** An ASGI server for running the FastAPI application.

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- **Node.js** (v14 or later)
- **Python** (v3.9 or later)
- **pip** (Python package installer)

### Client Setup

1. **Clone the repository:**
   ```sh
   git clone https://github.com/Shivani078/bud.git
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Set up environment variables:**
    Create a `.env` file in the root directory and add the following:
    ```
    VITE_FIREBASE_API_KEY=your_firebase_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
    VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
    VITE_FIREBASE_APP_ID=your_firebase_app_id
    VITE_APPWRITE_ENDPOINT=your_appwrite_endpoint
    VITE_APPWRITE_PROJECT_ID=your_appwrite_project_id
    VITE_APPWRITE_DB_ID=your_appwrite_db_id
    VITE_APPWRITE_COLLECTION_ID=your_appwrite_collection_id
    VITE_APPWRITE_BUCKET_ID=your_appwrite_bucket_id
    VITE_APPWRITE_ORDERSUM_COLLECTION_ID=your_appwrite_ordersum_collection_id
    VITE_APPWRITE_PROFILES_COLLECTION_ID=your_appwrite_profiles_collection_id
    VITE_APPWRITE_CHAT_COLLECTION_ID=your_appwrite_chat_collection_id
    VITE_BACKEND_URL=your_backend_url
    ```
4. **Run the development server:**
   ```sh
   npm run dev
   ```

### Server Setup
1. **Navigate to the backend directory:**
   ```sh
   cd backend
   ```
2. **Create a virtual environment:**
   ```sh
   python -m venv venv
   source venv/bin/activate
   ```
3. **Install dependencies:**
   ```sh
   pip install -r requirements.txt
   ```
4. **Set up environment variables:**
   Create a `.env` file in the `backend` directory and add the following:
   ```
   GROQ_API_KEY=your_groq_api_key
   GOOGLE_API_KEY=your_google_api_key
   OPENWEATHER_API_KEY=your_openweather_api_key
   ```
5. **Run the backend server:**
   ```sh
   uvicorn main:app --reload
   ```

## API Endpoints

The backend exposes the following API endpoints:

- **/api/chat:** Handles AI chat functionalities.
- **/api/planner:** Manages inventory planning and forecasting.
- **/api/trends:** Provides real-time market trends and insights.
- **/api/listing:** Manages product listing generation and optimization.
- **/api/dashboard:** Retrieves and processes data for the dashboard.
- **/:** A simple health check endpoint.

## 🔮 Challenges and Future Enhancements

### Challenges

- **Real-time Data Sync:** Ensuring that the data between the frontend and backend is always in sync, especially with real-time trend analysis, can be challenging.
- **Crafting Rich Context Prompts:** Designing effective prompts that provide the LLM with sufficient context to generate accurate and relevant answers is a key challenge.

### Future Enhancements

- **Advanced Analytics:** We hope to implement more advanced analytics, such as customer sentiment analysis and competitor tracking.
- **Mobile Application:** A native mobile app for both iOS and Android is on our roadmap to provide sellers with on-the-go access.
