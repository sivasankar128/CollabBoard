import React, { useRef, useEffect, useState } from "react";
import socket from "./socket";
import { useParams } from "react-router-dom";
import "./index";

const Whiteboard = () => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const currentStroke = useRef([]);
  const { roomId } = useParams();

  const [color, setColor] = useState("black");
  const [size, setSize] = useState(3);
  const [tool, setTool] = useState("pen");

  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctxRef.current = ctx;

    socket.emit("join-room", roomId);
    socket.on("drawing", drawFromOthers);
    socket.on("clear-canvas", () => {
      clearCanvasLocally();
    });

    return () => socket.off("drawing",);
  }, [roomId]);

  const drawFromOthers = ({ x0, y0, x1, y1, color, size }) => {
    const ctx = ctxRef.current;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };

  const startDrawing = ({ nativeEvent }) => {
    drawing.current = true;
    const { offsetX, offsetY } = nativeEvent;
    currentStroke.current = [{ x: offsetX, y: offsetY }];
  };

  const finishDrawing = () => {
    if (currentStroke.current.length > 1) {
      setUndoStack((prev) => [...prev, {
        points: [...currentStroke.current],
        color: tool === "eraser" ? "white" : color,
        size,
      }]);
      setRedoStack([]); // Clear redo on new draw
    }
    drawing.current = false;
    currentStroke.current = [];
  };

  const draw = ({ nativeEvent }) => {
    if (!drawing.current) return;
    const { offsetX, offsetY } = nativeEvent;
    const ctx = ctxRef.current;
    const strokeColor = tool === "eraser" ? "white" : color;

    const prevPoint = currentStroke.current[currentStroke.current.length - 1];
    const newPoint = { x: offsetX, y: offsetY };
    currentStroke.current.push(newPoint);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(prevPoint.x, prevPoint.y);
    ctx.lineTo(newPoint.x, newPoint.y);
    ctx.stroke();

    socket.emit("drawing", {
      roomId,
      data: {
        x0: prevPoint.x,
        y0: prevPoint.y,
        x1: newPoint.x,
        y1: newPoint.y,
        color: strokeColor,
        size,
      },
    });
  };

  const redraw = (strokes) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    strokes.forEach(({ points, color, size }) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.beginPath();
      for (let i = 1; i < points.length; i++) {
        ctx.moveTo(points[i - 1].x, points[i - 1].y);
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    });
  };
  
  const clearCanvasLocally = () => {
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setUndoStack([]);
    setRedoStack([]);
  };

  const handleClearCanvas = () => {
    clearCanvasLocally();
    socket.emit("clear-canvas", { roomId });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
  
    const newUndoStack = [...undoStack];
    const popped = newUndoStack.pop();
    const newRedoStack = [...redoStack, popped];
  
    setUndoStack(newUndoStack);
    setRedoStack(newRedoStack);
    redraw(newUndoStack);
  };
  
  const handleRedo = () => {
    if (redoStack.length === 0) return;
  
    const newRedoStack = [...redoStack];
    const recovered = newRedoStack.pop();
    const newUndoStack = [...undoStack, recovered];
  
    setUndoStack(newUndoStack);
    setRedoStack(newRedoStack);
    redraw(newUndoStack);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const image = canvas.toDataURL("image/png");
  
    const link = document.createElement("a");
    link.href = image;
    link.download = `whiteboard-${roomId}.png`;
    link.click();
  };

  
  return (
    <>
      <div className="toolbar">
        <label>Tool</label>
        <button onClick={() => setTool("pen")} className={tool === "pen" ? "active-tool" : ""}>🖊 Pen</button>
        <button onClick={() => setTool("eraser")} className={tool === "eraser" ? "active-tool" : ""}>❌ Eraser</button>

        <label htmlFor="color">Color</label>
        <input
          type="color"
          id="color"
          value={color}
          disabled={tool === "eraser"}
          onChange={(e) => setColor(e.target.value)}
        />

        <label htmlFor="size">{tool === "pen" ? "Pen" : "Eraser"} Size: {size}px</label>
        <input
          id="size"
          type="range"
          min="1"
          max="30"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
        />

        <button onClick={handleUndo}>↩️ Undo</button>
        <button onClick={handleRedo}>↪️ Redo</button>
        <button onClick={handleClearCanvas}>🧼 Clear All</button>
        <button className="download" onClick={downloadCanvas}>📥 Download</button>
      </div>

      <canvas
        ref={canvasRef}
        className="whiteboard-canvas"
        onMouseDown={startDrawing}
        onMouseUp={finishDrawing}
        onMouseMove={draw}
      />
    </>
  );
};

export default Whiteboard;
