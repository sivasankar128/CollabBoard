import React from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import Whiteboard from "./whiteboard";
import { v4 as uuid } from "uuid";
import "./index"; // We'll create this next

function Home() {
  const navigate = useNavigate();

  const createRoom = () => {
    const roomId = uuid().slice(0, 8); // shorter for readability
    navigate(`/board/${roomId}`);
  };

  return (
    <div className="home-container">
      <div className="home-box">
        <h1 className="title">✨CollabBoard   </h1>
        <p className="subtitle">Draw together in real-time from anywhere!</p>
        <button onClick={createRoom} className="create-button">
          ➕ Create New Whiteboard
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/board/:roomId" element={<Whiteboard />} />
      </Routes>
    </Router>
  );
}

export default App;
