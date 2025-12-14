import { useEffect, useRef, useState } from "react";
import SensorCard from "../component/SensorCard";
import {
  Thermometer,
  Droplets,
  Fan,
  Users,
  ChevronDown,
  Flame,
  Activity, // ใช้แทน Tracking (icon ทั่วไป)
} from "lucide-react";

// JJ
const CLIENT_ID = "7110f199-404c-4755-add4-03973643f106"; // Client ID ของ Device_2
const USERNAME = "3jxZsTrgy3bgoT1iCsW1R5sxPzW2QPEe"; // Token ของ Device_2  
const PASSWORD = "xyqZj3vAwcLU6uwjwuURSnFiwAMkNy36"; // Secret หรือ "" ถ้าไม่ใช้

// Peng
// const CLIENT_ID = "47c27d0b-7e62-459b-8163-c1d24351b8d1";
// const USERNAME  = "MHX8XnbrSyJth41kr5Z9gTDURCoKgWPr";
// const PASSWORD  = "APdgUtTcYStKPgWheTjwbBEenvojVJjx";

// Pai
// const CLIENT_ID = "c0809376-3f43-4d32-b508-f684fa070dd8";
// const USERNAME  = "K5bbdbWjJUWRor9bSaMBCzKpd69F33BF";
// const PASSWORD  = "geYMVXufQb24HW7wxWcqRcGBwSDt9MnW";

const TOPIC = "@msg/room1/sensor"; // ESP32 -> Web
const CONTROL_TOPIC = "@msg/room1/control"; // Web -> ESP32

const MQTT_URL = "wss://mqtt.netpie.io:443/mqtt";

const GOOGLE_SHEET_URL =
  "https://script.google.com/macros/s/AKfycbyEoQ_fd_QG8LNDAdrZFW89RGRmov4SaZOVoC0urXaHupt9RcKVssrIAJ58fiXJUxELMg/exec";

interface SensorDataType {
  temp: number | string;
  hum: number | string;
  infrared: number | string;
  tracking: number | string;
  flame: string; // "FIRE!" หรือ "Safe"
  fan: boolean;
  updated: string;
  isConnected: boolean;
}

const stopLoadingDots = !true;

export default function MainPage() {
  const modes = ["Auto", "Manual"];

  const [showDropdown, setShowDropdown] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<"Auto" | "Manual">("Auto");
  const [temperature, setTemperature] = useState<number>(25.0);

  // detection จาก Google Sheet
  const [sheetDetection, setSheetDetection] = useState<number>(0);

  // เพลงที่ user เลือก
  const [selectedSong, setSelectedSong] = useState<string | null>(null);

  const [sensorData, setSensorData] = useState<SensorDataType>({
    temp: 0,
    hum: 0,
    infrared: "-",
    tracking: 0,
    flame: "Safe",
    fan: false,
    updated: "-",
    isConnected: false,
  });

  const [dots, setDots] = useState("");
  const clientRef = useRef<any>(null);

  function validateData(value: string | number) {
    if (typeof value === "number") return value;
    if (!isNaN(Number(value))) return Number(value);
    return 0;
  }

  function boundValue(value: number, min: number, max: number) {
    if (typeof value !== "number") return 0;
    if (!value) return 0;
    if (value <= min) return min;
    if (value >= max) return max;
    return value;
  }

  // ===== 1) ดึงข้อมูลจาก Google Sheet + ส่ง control ไป ESP32 =====
  useEffect(() => {
    const fetchSheetData = async () => {
      if (!GOOGLE_SHEET_URL || GOOGLE_SHEET_URL.includes("YOUR_GOOGLE")) return;

      try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const data = await response.json();

        if (data && data.detection !== undefined) {
          const det = Number(data.detection);
          console.log("Sheet Data (detection):", det);
          setSheetDetection(det);

          // ส่ง control packet ไปหา ESP32 ผ่าน MQTT
          if (clientRef.current && clientRef.current.connected) {
            const payload = JSON.stringify({
              detection: det,
              mode, // "Auto" หรือ "Manual"
              setTemp: temperature,
              song: selectedSong || "",
            });

            clientRef.current.publish(CONTROL_TOPIC, payload, { qos: 0 });
            console.log("Publish CONTROL:", CONTROL_TOPIC, payload);
            setSelectedSong(null);
          }
        }
      } catch (error) {
        console.error("Error fetching Google Sheet:", error);
      }
    };

    // ดึงครั้งแรก
    fetchSheetData();
    // ดึงทุก 2 วิ
    const intervalId = setInterval(fetchSheetData, 2000);

    return () => clearInterval(intervalId);
  }, [mode, temperature, selectedSong]);

  // ===== 2) MQTT Logic: รับค่าจาก ESP32 =====
  useEffect(() => {
    if (typeof (window as any).mqtt === "undefined") {
      console.error("MQTT client library not found.");
      return;
    }

    if (!clientRef.current) {
      console.log("Initializing automatic MQTT connection...");
      const client = (window as any).mqtt.connect(MQTT_URL, {
        clientId: CLIENT_ID,
        username: USERNAME,
        password: PASSWORD,
        clean: true,
        reconnectPeriod: 3000,
      });

      clientRef.current = client;

      client.on("connect", () => {
        console.log("Connected to NetPIE");
        setSensorData((prev) => ({ ...prev, isConnected: true }));

        if (client.connected) {
          client.subscribe(TOPIC, { qos: 0 }, (err: any) => {
            if (err) console.error("Subscribe error:", err);
            else console.log("Subscribed to", TOPIC);
          });
        }
      });

      client.on("reconnect", () => {
        setSensorData((prev) => ({ ...prev, isConnected: false }));
        console.log("Reconnecting...");
      });

      client.on("close", () => {
        setSensorData((prev) => ({ ...prev, isConnected: false }));
        console.log("Connection closed");
      });

      client.on("message", (topic: string, message: any) => {
        if (topic !== TOPIC) return;

        try {
          const data = JSON.parse(message.toString());
          const now = new Date().toLocaleTimeString();

          setSensorData((prev) => {
            const newState: any = { updated: now };
            if (data.temp !== undefined)
              newState.temp = Number(data.temp).toFixed(2);
            if (data.hum !== undefined)
              newState.hum = Number(data.hum).toFixed(2);
            if (data.infrared !== undefined) newState.infrared = data.infrared;
            if (data.tracking !== undefined) newState.tracking = data.tracking;
            if (data.flame !== undefined)
              newState.flame = Number(data.flame) === 1 ? "FIRE!" : "Safe";
            if (data.fan !== undefined) newState.fan = Number(data.fan) === 1;
            return { ...prev, ...newState };
          });
        } catch (e) {
          console.error("JSON parse error:", e);
        }
      });
    }

    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
        clientRef.current = null;
      }
    };
  }, []);

  // ===== 3) จุด ๆ ตอนกำลัง connect =====
  useEffect(() => {
    if (!stopLoadingDots) {
      if (sensorData.isConnected) {
        setDots("");
        return;
      }
      const interval = setInterval(() => {
        setDots((prev) => (prev.length === 3 ? "" : prev + "."));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [sensorData.isConnected]);

  // ===== 4) Prepare values for SensorCards =====
  const detectionValue = validateData(sheetDetection);
  const fanValue = sensorData.fan ? true : false;
  const tempValue = validateData(sensorData.temp);
  const humValue = validateData(sensorData.hum);

  const trackingValue = validateData(sensorData.tracking);
  const flameDisplay = sensorData.flame; // "FIRE!" หรือ "Safe"

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center
        bg-[linear-gradient(45deg,_#B5728E_0%,_#DA7F7D_25%,_#EBB58A_75%,_#F4D797_100%)]"
    >
      <div
        className="backdrop-blur-2xl bg-white/30 border border-white/30 rounded-3xl
                p-10 text-white flex flex-col p-[48px] gap-[24px] items-center"
      >
        <h1 className="text-[#404040] font-bold font-inter">Smart Pudlom</h1>

        <div className="flex flex-row gap-[16px]">
          {/* ESP Control Panel */}
          <div
            className="bg-white/30 rounded-2xl font-bold font-inter text-[#404040] p-[32px]
                    flex flex-col items-center justify-between"
          >
            <div
              className="w-[150px] h-[150px] rounded-full bg-white shadow-lg flex
                        items-center justify-center overflow-hidden"
            >
              <img
                src=".\src\assets\esp32.png"
                alt="board"
                className="w-[150px] h-[150px] object-contain"
              />
            </div>

            <div className="font-bold font-inter text-[#404040] text-2xl mt-4">
              ESP 32
            </div>

            <div className="h-[160px] flex flex-col gap-6">
              <div className="flex flex-row self-start justify-center">
                <div className="font-bold font-inter text-[#404040] text-md">
                  Status:
                </div>

                <div className="h-[25px] flex flex-row bg-white/90 mx-1 px-3 gap-1 rounded-full">
                  <div
                    className={`h-4 w-4 rounded-full my-1
                                ${
                                  sensorData.isConnected
                                    ? "bg-[#22c55e]"
                                    : "bg-[#ef4444]"
                                }`}
                  ></div>

                  <div
                    className={`font-medium font-inter text-md
                                        ${
                                          sensorData.isConnected
                                            ? "text-[#22c55e]"
                                            : "text-[#ef4444]"
                                        }`}
                  >
                    {sensorData.isConnected
                      ? "Connected"
                      : `Connecting${dots}`}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col">
                  <label className="font-medium font-inter text-xs text-[#404040] mb-2">
                    Enter Temperature ({temperature} °C)
                  </label>
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() =>
                          setTemperature(boundValue(temperature - 1, 0, 100))
                        }
                        className={`${
                          isActive && mode === "Auto"
                            ? "text-[#404040] shadow-lg"
                            : "text-[#909090] shadow-sm"
                        }
                                                text-lg w-8 h-8 bg-white/90 focus:outline-none border-none rounded-xl
                                                flex items-center justify-center`}
                        disabled={!isActive && mode === "Auto"}
                      >
                        -
                      </button>

                      <input
                        type="text"
                        value={temperature}
                        onChange={(e) =>
                          setTemperature(
                            validateData(boundValue(Number(e.target.value), 0, 100))
                          )
                        }
                        disabled={!isActive}
                        min={"0"}
                        className={`w-16 h-16 text-2xl ${
                          isActive && mode === "Auto"
                            ? "text-[#404040] shadow-lg"
                            : "text-[#909090] shadow-sm"
                        }
                                                font-inter font-bold text-center bg-white/90 rounded-full outline-none`}
                      />

                      <button
                        onClick={() =>
                          setTemperature(boundValue(temperature + 1, 0, 100))
                        }
                        className={`${
                          isActive && mode === "Auto"
                            ? "text-[#404040] shadow-lg"
                            : "text-[#909090] shadow-sm"
                        }
                                                text-lg w-8 h-8 bg-white/90 focus:outline-none border-none rounded-xl
                                                flex items-center justify-center`}
                        disabled={!isActive && mode === "Auto"}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active + Mode */}
            <div className="flex flex-row gap-3 items-end">
              <div>
                <div
                  className={`text-xs font-inter text-center mb-2 transition-all ${
                    isActive ? "text-[#404040]" : "text-[#909090]"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </div>
                <button
                  onClick={() => setIsActive(!isActive)}
                  className="min-w-[100px] h-auto bg-white/90 px-8 py-2 rounded-2xl
                                font-medium text-base text-[#404040] hover:scale-105 transition-all focus:outline-none border-none shadow-lg"
                >
                  On/Off
                </button>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className={`w-[125px] h-auto bg-white/90 px-6 py-2 rounded-2xl font-medium
                                    text-base transition-all ${
                                      isActive
                                        ? "text-[#404040] shadow-lg hover:scale-105 transition-all"
                                        : "text-[#909090] shadow-sm"
                                    }
                                    flex items-center justify-between gap-2 focus:outline-none border-none`}
                  disabled={!isActive}
                >
                  {mode}
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      isActive ? "text-[#404040]" : "text-[#909090]"
                    } ${showDropdown ? "rotate-180" : ""}`}
                  />
                </button>

                {showDropdown && (
                  <div
                    className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl
                                shadow-xl overflow-hidden z-10"
                  >
                    {modes.map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setMode(m as "Auto" | "Manual");
                          setShowDropdown(false);
                        }}
                        className={`${
                          m == mode
                            ? "text-[#404040]"
                            : "text-[#909090] hover:text-[#404040]"
                        }
                                            w-full focus:outline-none border-none shadow-md bg-white hover:bg-[#EFEFEF]`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sensor Card */}
          <div
            className="min-w-[424px] bg-white/30 rounded-2xl font-bold font-inter text-[#404040]
                    p-[32px] gap-[16px] flex flex-col gap-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <SensorCard
                name="Temperature"
                value={tempValue}
                display={tempValue + " °C"}
                Icon={Thermometer}
                isActive={isActive}
              />
              <SensorCard
                name="Humidity"
                value={humValue}
                display={humValue + " %"}
                Icon={Droplets}
                isActive={isActive}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SensorCard
                name="Fan"
                value={fanValue}
                display={fanValue ? "On" : "Off"}
                Icon={Fan}
                isActive={isActive}
              />
              <SensorCard
                name="Detection"
                value={detectionValue}
                display={
                  detectionValue +
                  (detectionValue <= 1 ? " person" : " people")
                }
                Icon={Users}
                isActive={isActive}
              />
            </div>

            {/* Fire + Tracking */}
            <div className="grid grid-cols-2 gap-4">
              <SensorCard
                name="Fire"
                value={flameDisplay === "FIRE!" ? 1 : 0}
                display={flameDisplay}
                Icon={Flame}
                isActive={isActive}
              />
              <SensorCard
                name="Tracking"
                value={trackingValue}
                display={trackingValue ? "None" : "Detected"}
                Icon={Activity}
                isActive={isActive}
              />
            </div>

            {/* เลือกเพลง */}
            <div
              className="w-auto bg-white/40 rounded-2xl font-bold font-inter text-[#404040] p-[32px]
                        gap-[16px] flex flex-col items-start shadow-lg"
            >
              <div className="font-bold font-inter text-2xl text-[#404040]">
                Choose a song!
              </div>
              <span
                className={`font-normal font-inter text-base 
                                ${
                                  isActive
                                    ? "hover:underline cursor-pointer text-[#404040]"
                                    : "text-[#909090]"
                                }`}
                onClick={() => setSelectedSong("Happy Birthday")}
              >
                1. Happy Birthday
              </span>
              <span
                className={`font-normal font-inter text-base 
                                ${
                                  isActive
                                    ? "hover:underline cursor-pointer text-[#404040]"
                                    : "text-[#909090]"
                                }`}
                onClick={() => setSelectedSong("Nokia")}
              >
                2. Nokia
              </span>
              <span
                className={`font-normal font-inter text-base 
                                ${
                                  isActive
                                    ? "hover:underline cursor-pointer text-[#404040]"
                                    : "text-[#909090]"
                                }`}
                onClick={() => setSelectedSong("Merry Christmas")}
              >
                3. Merry Christmas
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
