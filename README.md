# 🃏 Makao - Real-Time Multiplayer Card Game

![Makao Banner](https://images.unsplash.com/photo-1541278107931-e006523892df?q=80&w=2000&auto=format&fit=crop)

A modern, web-based implementation of the classic European card game **Makao** (similar to Uno). Play with friends online in real-time or practice against AI bots in this fast-paced, interactive web application.

Built with React, WebSockets, and Tailwind CSS, this project features a fully synchronized multiplayer experience, drag-and-drop card mechanics, and customizable house rules.

---

## ✨ Features

- **🌍 Real-Time Multiplayer:** Play with friends instantly using WebSocket-based synchronization.
- **🤖 Smart AI Bots:** Not enough players? Fill the room with AI bots that know how to play the game.
- **🖐️ Interactive UI:** Drag and drop cards to rearrange your hand, with smooth animations powered by Framer Motion.
- **⚙️ Customizable Rules:** Adjust the number of Jokers, toggle battle card effects, and customize penalties before starting a match.
- **📜 Game History:** A detailed, scrollable event log tracks every move, draw, and penalty in real-time.
- **📱 Responsive Design:** Play comfortably on both desktop and mobile devices.

---

## 📸 Screenshots

*(Add your own screenshots here by replacing the placeholder links)*

| Game Lobby | Active Gameplay |
| :---: | :---: |
| <img width="2559" height="1328" alt="image" src="https://github.com/user-attachments/assets/af1b0025-6182-4050-9e18-36d69e593127" /> | <img width="2559" height="1336" alt="image" src="https://github.com/user-attachments/assets/0228640e-d5cd-4ffa-8716-4eb490893ee7" /> |
| *Create a room, invite friends, and configure rules.* | *Drag & drop cards, call Makao, and track history.* |

---

## 📜 How to Play (Makao Rules)

The goal of the game is to be the first player to get rid of all your cards. 

1. **Matching:** Play a card that matches the **Suit** or **Rank** of the top card on the discard pile.
2. **Action Cards:**
   - **2 & 3:** Forces the next player to draw cards (Battle cards).
   - **4:** Forces the next player to skip their turn.
   - **Jack (J):** Allows you to request a specific Rank (non-action cards only).
   - **Queen (Q):** "Queen of everything" - can be played on anything, and anything can be played on it. (Can also cancel battle cards depending on house rules).
   - **King (K) of Spades/Hearts:** Heavy battle cards that force players to draw 5 cards.
   - **Ace (A):** Allows you to change the current Suit.
   - **Joker:** Can substitute for any card.
3. **Calling Makao:** You **MUST** click the "Makao!" button when you have exactly 1 card left. If you forget, other players can catch you, forcing you to draw 5 penalty cards!

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Framer Motion, Lucide Icons, `@hello-pangea/dnd`
- **Backend:** Node.js, Express, `ws` (WebSockets)
- **Language:** TypeScript

---

## 🚀 Getting Started (Local Development)

To run this project locally on your machine:

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/makao-game.git
   cd makao-game
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`.

---

## 🌐 Deployment

This application requires a Node.js environment to run the WebSocket server. You can easily host it for free on platforms like **Render**, **Railway**, or **Fly.io**.

### Deploying to Render (Free Tier)

1. Push your code to a GitHub repository.
2. Create a free account on [Render.com](https://render.com/).
3. Click **New +** and select **Web Service**.
4. Connect your GitHub account and select your Makao repository.
5. Configure the deployment with the following settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
6. Click **Create Web Service**. 

Render will build and deploy your app. Once finished, you'll receive a public URL (e.g., `https://makao-game.onrender.com`) that you can share with your friends to play online!

---

## 📄 License

This project is open-source and available under the MIT License. Feel free to fork, modify, and improve it!
