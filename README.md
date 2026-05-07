# Mafia — Real-Time Social Deduction Game

A full-stack, moderator-free implementation of the Mafia party game using:
- **Backend**: ASP.NET Core 8 + SignalR
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand

---

## 🚀 Quick Start

### Prerequisites
- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Node.js 18+](https://nodejs.org/)

---

### 1. Run the Backend

```bash
cd backend
dotnet run
```

Backend will start at `http://localhost:5000`.  
SignalR hub available at `http://localhost:5000/hubs/game`.

---

### 2. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will start at `http://localhost:5173`.  
The Vite dev server proxies `/api` and `/hubs` to the backend automatically.

---

## 🎮 How to Play

### Setup
1. One player opens the app and clicks **Create Room** → gets a 6-character code.
2. All other players open the app on **their own devices**, click **Join Room**, and enter the code + a name.
3. When 6–20 players have joined, the host clicks **Start Game**.

### Roles (assigned privately by server)
| Role | Count | Night Action |
|------|-------|-------------|
| 🔴 Mafia | 1 per 4 players | Vote to kill a non-Mafia player |
| 🟢 Doctor | 1 | Protect any player (not same two nights in a row) |
| 🔵 Detective | 1 | Investigate a player → learn if they're Mafia |
| ⚪ Citizen | Rest | Click "Sleep / Pass" to confirm readiness |

### Night Phase
- Each player acts privately on their own device.
- Night resolves when **all living players submit** or the **60-second timer** expires.
- The Mafia can see each other's votes in real time via the **Mafia Channel**.
- The Detective gets a **private result**: 🔴 Mafia or 🟢 Innocent.

### Day Phase
- Who died is announced cinematically.
- 90-second **discussion timer** — talk with your village.
- When discussion ends, **voting** opens.
- Player with the most votes is eliminated (tie = no elimination).
- Eliminated player's role is revealed.

### Win Conditions
- **Town wins** when all Mafia members are eliminated.
- **Mafia wins** when Mafia count ≥ remaining Town count.

---

## 🏗️ Project Structure

```
Mafia/
├── backend/          # ASP.NET Core 8 Web API
│   ├── Hubs/         # SignalR GameHub
│   ├── Controllers/  # REST: RoomController
│   ├── Services/     # Game logic services
│   ├── Models/       # Domain models
│   └── DTOs/         # Transfer objects
└── frontend/         # React + TypeScript + Vite
    └── src/
        ├── pages/    # Full page components
        ├── components/# Shared UI components
        ├── store/    # Zustand state
        ├── hooks/    # useSignalR, useTimer
        └── services/ # Axios API calls
```

---

## 🔒 Security Notes
- Roles are **never broadcast** to all clients — each player only receives their own role.
- All night actions are **validated server-side** (phase, alive status, role matching).
- Dead players cannot submit actions or votes.
- Room state is scoped — cross-room event leakage is impossible.
