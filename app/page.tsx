"use client";

import { useState, useEffect, useRef } from "react";

export default function TimerPage() {
  const [time, setTime] = useState(60.0);
  const [initialTime, setInitialTime] = useState(60.0); // 初期タイマー値の保持用
  const [isRunning, setIsRunning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("未接続");
  const [ipAddress, setIpAddress] = useState("192.168.10.105");

  const socketRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket接続
  const connectWebSocket = () => {
    try {
      setStatus("接続中...");
      const ws = new WebSocket(`ws://${ipAddress}:8080`);

      ws.onopen = () => {
        setConnected(true);
        setStatus("接続成功");
        socketRef.current = ws;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // サーバーからの状態更新があれば反映
          if (data.running !== undefined && data.running !== isRunning) {
            setIsRunning(data.running);
          }
        } catch (e) {
          console.error("受信データの解析エラー:", e);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocketエラー:", error);
        setStatus("接続エラー");
        setConnected(false);
      };

      ws.onclose = () => {
        setStatus("接続終了");
        setConnected(false);
        socketRef.current = null;
      };

      return ws;
    } catch (error) {
      console.error("接続エラー:", error);
      setStatus("接続エラー");
      return null;
    }
  };

  // 切断
  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setConnected(false);
      setStatus("切断済み");
    }
  };

  // トグルボタン
  const toggleTimer = () => {
    if (!connected) return;

    if (isRunning) {
      // 停止
      stopTimer();
      sendCommand("stop");
    } else {
      // 開始（設定された時間からリスタート）
      setTime(initialTime);
      startTimer();
      sendCommand("start");
    }
  };

  // コマンド送信
  const sendCommand = (command: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(command);
    }
  };

  // タイマー開始
  const startTimer = () => {
    setIsRunning(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTime((prevTime) => {
        const newTime = Math.max(0, prevTime - 0.1);
        // タイマーが0になったら停止
        if (newTime === 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          setIsRunning(false);
          sendCommand("timeout");
        }
        return parseFloat(newTime.toFixed(1));
      });
    }, 100);
  };

  // タイマー停止
  const stopTimer = () => {
    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  // コンポーネントがアンマウントされたらタイマーとWebSocketをクリーンアップ
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4">タイマー</h1>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            className="border p-2 flex-1"
            placeholder="Pico W IPアドレス"
            disabled={connected}
          />
          {!connected ? (
            <button
              onClick={connectWebSocket}
              className="bg-blue-500 text-white p-2 rounded"
            >
              接続
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="bg-red-500 text-white p-2 rounded"
            >
              切断
            </button>
          )}
        </div>
        <div
          className={`p-2 rounded text-center ${
            connected
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {status}
        </div>
      </div>

      <div className="text-center">
        {!isRunning && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              タイマー時間（秒）
            </label>
            <input
              type="number"
              min="1"
              max="3600"
              step="0.1"
              value={initialTime}
              onChange={(e) =>
                setInitialTime(parseFloat(e.target.value) || 60.0)
              }
              className="border p-2 text-center w-full mb-2 text-xl"
              disabled={isRunning}
            />
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setInitialTime(30.0)}
                className="bg-gray-200 px-2 py-1 rounded text-sm"
                disabled={isRunning}
              >
                30秒
              </button>
              <button
                onClick={() => setInitialTime(60.0)}
                className="bg-gray-200 px-2 py-1 rounded text-sm"
                disabled={isRunning}
              >
                60秒
              </button>
              <button
                onClick={() => setInitialTime(90.0)}
                className="bg-gray-200 px-2 py-1 rounded text-sm"
                disabled={isRunning}
              >
                90秒
              </button>
              <button
                onClick={() => setInitialTime(120.0)}
                className="bg-gray-200 px-2 py-1 rounded text-sm"
                disabled={isRunning}
              >
                2分
              </button>
            </div>
          </div>
        )}

        <div
          className="text-6xl font-bold my-8"
          style={{
            color: isRunning ? "#3b82f6" : time > 0 ? "#000" : "#dc2626",
          }}
        >
          {time.toFixed(1)}
        </div>

        <button
          onClick={toggleTimer}
          disabled={!connected}
          className={`px-6 py-3 rounded text-white font-bold w-full ${
            isRunning
              ? "bg-red-500 hover:bg-red-600"
              : "bg-blue-500 hover:bg-blue-600"
          } ${!connected ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isRunning ? "停止" : "開始"}
        </button>
      </div>
    </div>
  );
}
