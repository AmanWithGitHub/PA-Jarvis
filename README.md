# AMAN JARVIS

## What is JARVIS?

JARVIS is Aman Saini's personal AI chat app. You can ask it about Aman's profile or ask general questions. It has a React website and a .NET backend that connects to Groq when you add an API key.

## What you need

- Windows
- [Visual Studio Code](https://code.visualstudio.com/)
- [Node.js](https://nodejs.org/) (npm is included)
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)

## Set it up

1. Open the `Jarvis` folder in VS Code.
2. Open **Terminal → New Terminal**.
3. Set up Groq if you want AI answers. In the VS Code Explorer, open `backend/AmanJarvis.API` and create a file named `.env` if it does not already exist. Put these lines in it:

   ```text
   GROQ_API_KEY=your_groq_key_goes_here
   GROQ_MODEL=openai/gpt-oss-120b
   ```

   Replace the example text with your own key. Keep `.env` on your computer; it is excluded from Git. Without a key, JARVIS will tell you Groq is not configured.

   **Privacy:** when Groq is enabled, JARVIS sends Aman's complete profile to Groq with each message so it can answer personal questions accurately.

## Run JARVIS

You need two terminals in VS Code. Keep both open while using the app.

In the first terminal, start the backend:

```powershell
dotnet run --project backend/AmanJarvis.API -c Release --urls http://localhost:5080
```

In the second terminal, start the website:

```powershell
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## Using the chat

Type a question in the message box and press **Enter** to send it. Press **Shift+Enter** to add a new line. You can ask about Aman, choose a suggested question, or ask a general question. Restart the backend after changing Aman's profile or the `.env` file.

## Main files

- `src/` — the website and chat screen.
- `backend/AmanJarvis.API/` — the .NET backend.
- `backend/AmanJarvis.API/Data/aman-profile.json` — Aman's personal profile used by JARVIS.
- `backend/AmanJarvis.API/.env` — your private Groq settings. Do not upload this file or share your key.
