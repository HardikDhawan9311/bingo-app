import { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:4000");

export default function App() {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [inRoom, setInRoom] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [cells, setCells] = useState([]);
  const [marked, setMarked] = useState([]); // [{num, name}]
  const [completedLines, setCompletedLines] = useState(new Set());
  const [result, setResult] = useState("");
  const [playerId, setPlayerId] = useState(null);

  const generateNumbers = () => {
    let nums = Array.from({ length: 25 }, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    setCells(nums);
    setMarked([]);
    setCompletedLines(new Set());
  };

  useEffect(() => {
    socket.on("gameStart", ({ assignedPlayer, playerNames }) => {
      generateNumbers();
      setPlayerId(assignedPlayer);
      setGameStarted(true);
    });

    socket.on("gameResult", ({ result }) => {
      setResult(result);
    });

    socket.on("markNumber", ({ num, name }) => {
      if (!marked.some((m) => m.num === num)) {
        const newMarked = [...marked, { num, name }];
        setMarked(newMarked);
        checkLines(newMarked.map((m) => m.num));
      }
    });

    return () => {
      socket.off("gameStart");
      socket.off("gameResult");
      socket.off("markNumber");
    };
  }, [marked]);

  const handleClick = (num) => {
    if (result) return;
    if (!marked.some((m) => m.num === num)) {
      socket.emit("numberClicked", { roomCode, num, name: playerName });
    }
  };

  const checkLines = (markedNums) => {
    let newLines = new Set();

    for (let r = 0; r < 5; r++) {
      if (cells.slice(r * 5, r * 5 + 5).every((n) => markedNums.includes(n)))
        newLines.add("row" + r);
    }

    for (let c = 0; c < 5; c++) {
      if ([0, 1, 2, 3, 4].every((r) => markedNums.includes(cells[r * 5 + c])))
        newLines.add("col" + c);
    }

    if ([0, 6, 12, 18, 24].every((i) => markedNums.includes(cells[i])))
      newLines.add("diag1");
    if ([4, 8, 12, 16, 20].every((i) => markedNums.includes(cells[i])))
      newLines.add("diag2");

    setCompletedLines(newLines);
    socket.emit("updateLines", { roomCode, lines: newLines.size, name: playerName });
  };

  const createRoom = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    socket.emit("createRoom", { roomCode: code, name: playerName }, (res) => {
      if (res.success) {
        setRoomCode(code);
        setInRoom(true);
      } else {
        alert(res.message);
      }
    });
  };

  const joinRoom = () => {
    socket.emit("joinRoom", { roomCode, name: playerName }, (res) => {
      if (res.success) setInRoom(true);
      else alert(res.message);
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-gray-900 to-black text-white p-6 relative overflow-hidden">
      {/* Subtle animated circles background */}
      <div className="absolute w-full h-full top-0 left-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-40 h-40 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full opacity-20 animate-pulse`}
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${5 + Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {!inRoom ? (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-10 rounded-3xl shadow-2xl w-full max-w-md text-center relative z-10">
          <h2 className="text-4xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 animate-pulse">
            🎲 Multiplayer Bingo
          </h2>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter Your Name"
            className="border border-gray-600 px-4 py-2 rounded-xl text-black w-52 mb-4 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-1"
          />
          <div className="flex flex-col md:flex-row items-center justify-center gap-3">
            <button
              onClick={createRoom}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-xl hover:scale-105 transition-transform"
            >
              Create Room
            </button>
            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Room Code"
              className="border border-gray-600 px-4 py-2 rounded-xl text-black w-36 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1"
            />
            <button
              onClick={joinRoom}
              className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-xl hover:scale-105 transition-transform"
            >
              Join Room
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl shadow-2xl w-full max-w-lg text-center relative z-10">
          <h2 className="text-2xl font-bold mb-4 text-indigo-300">Room: {roomCode}</h2>
          {result && (
            <h3
              className={`text-3xl font-extrabold mb-6 animate-bounce ${
                result.includes("Wins") ? "text-green-400" : "text-red-400"
              }`}
            >
              {result}
            </h3>
          )}
          <div className="grid grid-cols-5 gap-3 max-w-sm mx-auto mt-4">
            {cells.map((num) => {
              const markedCell = marked.find((m) => m.num === num);
              return (
                <button
                  key={num}
                  onClick={() => handleClick(num)}
                  className={`w-16 h-16 flex items-center justify-center rounded-2xl font-bold text-lg transition-all duration-300 transform ${
                    markedCell
                      ? markedCell.name === playerName
                        ? "bg-green-400 text-white shadow-2xl scale-110 animate-pulse"
                        : "bg-blue-500 text-white shadow-2xl scale-110 animate-pulse"
                      : "bg-gray-700 text-gray-200 hover:bg-gray-600 hover:scale-105"
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>
          <p className="mt-6 text-yellow-300 font-semibold text-lg animate-pulse">
            ⭐ Completed Lines: {completedLines.size}
          </p>
        </div>
      )}
    </div>
  );
}
