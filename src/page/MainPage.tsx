import { useEffect, useState } from "react";
import SensorCard from "../component/SensorCard";
import { Thermometer, Droplets, Fan, Users, ChevronDown } from "lucide-react";

const CLIENT_ID = "22353c82-e331-4fef-9285-9a5e2d96301a";   // Client ID ของ Device_1
const USERNAME  = "8wV47wmmzgRF8Bsqnmeooa3NEgAiRNjp";       // Token ของ Device_1
const PASSWORD  = "b4xJ9ipYic88gyfMaX7NmiYJ5Ek6coiN";       // Secret ของ Device_1 หรือ "" ถ้าไม่ใช้

const TOPIC = "@msg/room1/sensor";
const MQTT_URL = "wss://mqtt.netpie.io:443/mqtt"

interface SensorDataType {
    temp: number | string;
    hum: number | string;
    mic: number | string;
    tracking: number | string;
    flame: number | string;
    fan: number | string;
    updated: string;
    isConnected: boolean;
}

const stopLoadingDots = true

export default function MainPage() {

    const modes = ["Auto", "Manual"]
    
    const [showDropdown, setShowDropdown] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState("Auto");

    const [sensorData, setSensorData] = useState<SensorDataType>({
        temp: "--",
        hum: "--",
        mic: "--",
        tracking: "--",
        flame: "--",
        fan: "--",
        updated: "-",
        isConnected: false,
    });

    const [dots, setDots] = useState("");

    useEffect(() => {
        if (typeof (window as any).mqtt === 'undefined') {
            console.error("MQTT client library not found. Please ensure mqtt.min.js is loaded.");
            return;
        }

        const client = (window as any).mqtt.connect(MQTT_URL, {
            clientId:  CLIENT_ID,
            username:  USERNAME,
            password:  PASSWORD,
            clean: true,
            reconnectPeriod: 3000,
        });

        // --- Connection Handlers ---
        client.on("connect", () => {
            console.log("Connected to NetPIE");
            setSensorData(prev => ({ ...prev, isConnected: true }));
            
            client.subscribe(TOPIC, { qos: 0 }, (err: any) => {
                if (err) console.error("Subscribe error:", err);
                else console.log("Subscribed to", TOPIC);
            });
        });

        client.on("reconnect", () => {
            setSensorData(prev => ({ ...prev, isConnected: false }));
            console.log("Reconnecting...");
        });

        client.on("close", () => {
            setSensorData(prev => ({ ...prev, isConnected: false }));
            console.log("Connection closed");
        });

        client.on("error", (err: any) => {
            console.error("MQTT Error:", err);
        });

        // --- Message Handler ---
        client.on("message", (topic: string, message: any) => {
            // console.log("Message:", topic, message.toString());
            
            try {
                const data = JSON.parse(message.toString());
                const now = new Date().toLocaleTimeString();
                
                setSensorData(prev => {
                    const newState: Partial<SensorDataType> = { updated: now };

                    if (typeof data.temp !== "undefined") newState.temp = Number(data.temp).toFixed(2);
                    if (typeof data.hum !== "undefined") newState.hum = Number(data.hum).toFixed(2);
                    
                    // Simple pass-through for other sensors (matching consumer.js logic)
                    if (typeof data.mic !== "undefined") newState.mic = data.mic;
                    if (typeof data.tracking !== "undefined") newState.tracking = data.tracking;

                    // Flame status mapping (assuming 1=FIRE, 0=Safe)
                    if (typeof data.flame !== "undefined") {
                        const hasFire = Number(data.flame) === 1;
                        newState.flame = hasFire ? "FIRE!" : "Safe";
                    }

                    // Fan status mapping (assuming 1=ON, 0=OFF)
                    if (typeof data.fan !== "undefined") {
                        const fanOn = Number(data.fan) === 1;
                        newState.fan = fanOn ? "ON" : "OFF";
                    }
                    
                    return { ...prev, ...newState };
                });
            } catch (e) {
                console.error("JSON parse error:", e);
            }
        });

        return () => {
            client.end();
            console.log("MQTT client disconnected on component unmount.");
        };
    }, []);

    useEffect(() => {
        if(!stopLoadingDots) {
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

    const detectionValue = sensorData.tracking === "1" ? 1 : 0;
    const fanValue = sensorData.fan === "ON";
    const tempValue = typeof sensorData.temp === 'number' ? sensorData.temp : parseFloat(sensorData.temp.toString() || '0');
    const humValue = typeof sensorData.hum === 'number' ? sensorData.hum : parseFloat(sensorData.hum.toString() || '0');

    return <div className="min-h-screen w-full flex flex-col items-center justify-center
        bg-[linear-gradient(45deg,_#B5728E_0%,_#DA7F7D_25%,_#EBB58A_75%,_#F4D797_100%)]">
        {/* Header */}
        <h1 className="text-[#404040] font-bold font-inter mb-6">Smart Pudlom</h1>

        {/* Card */}
        <div className="relative backdrop-blur-2xl bg-white/30 border border-white/20 rounded-3xl
            p-10 text-white flex flex-row p-[48px] gap-[16px]">

            {/* ESP */}
            <div className="bg-white/30 rounded-2xl font-bold font-inter text-[#404040] p-[32px]
                flex flex-col items-center justify-between">
                {/* Image */}
                <div className="w-[150px] h-[150px] rounded-full bg-white shadow-lg flex
                    items-center justify-center overflow-hidden">
                    <img
                        src=".\src\assets\esp32.png"
                        alt="board"
                        className="w-[150px] h-[150px] object-contain"
                    />
                </div>

                {/* Name */}
                <div className="font-bold font-inter text-[#404040] text-2xl mt-4">
                    ESP 32
                </div>
                
                {/* Status */}
                <div className="px-2 h-[160px] flex flex-row self-start justify-center mt-4">
                    <div className="font-bold font-inter text-[#404040] text-md">
                        Status: 
                    </div>

                    <div className={`h-4 w-4 rounded-full my-1 mx-2
                    ${sensorData.isConnected ? "bg-[#22c55e]" : "bg-[#ef4444]"}`}></div>

                    <div className={`font-medium font-inter text-md
                            ${sensorData.isConnected ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                        {sensorData.isConnected ? "Connected" : `Connecting${dots}`}
                    </div>
                    {/* <div className="text-xs text-[#909090] mt-1">Updated: {sensorData.updated}</div> */}
                </div>
                
                    

                    {/* Buttons */}
                    <div className="flex flex-row gap-3 items-end">
                        <div>
                            {/* On/Off Status */}
                            <div className={`text-xs font-inter text-center mb-2 transition-all ${isActive ? "text-[#404040]" : "text-[#909090]"}`}>
                                {isActive ? 'Active' : 'Inactive'}
                            </div>

                            {/* On/Off Button */}
                            <button
                                onClick={() => setIsActive(!isActive)}
                                className="min-w-[100px] h-auto bg-white/90 px-8 py-2 rounded-2xl
                                font-medium text-base text-[#404040] hover:scale-105 transition-all focus:outline-none border-none shadow-lg"
                            >
                                On/Off
                            </button>
                        </div>

                        {/* Dropdownlist */}
                        <div className="relative">
                            <button
                                onClick={() => setShowDropdown(!showDropdown)}
                                className={`w-[125px] h-auto bg-white/90 px-6 py-2 rounded-2xl font-medium
                                    text-base transition-all ${isActive ? "text-[#404040] shadow-lg hover:scale-105 transition-all" : "text-[#909090] shadow-sm"}
                                    flex items-center justify-between gap-2 focus:outline-none border-none`}
                                disabled={!isActive}
                                >
                                {mode}
                                <ChevronDown size={16} className={`transition-transform ${isActive ? "text-[#404040]" : "text-[#909090]"} ${showDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {showDropdown && (
                            <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl
                                shadow-xl overflow-hidden z-10">
                                {modes.map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => {
                                            setMode(m)
                                            setShowDropdown(false);
                                        }}
                                        className={`${m == mode ? "text-[#404040]" : "text-[#909090] hover:text-[#404040]"}
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
            <div className="min-w-[424px] bg-white/30 rounded-2xl font-bold font-inter text-[#404040]
                p-[32px] gap-[16px] flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <SensorCard name="Temperature" value={tempValue} display={tempValue + " °C"} Icon={Thermometer} isActive={isActive}/>
                    <SensorCard name="Humidity" value={humValue} display={humValue + " %"} Icon={Droplets} isActive={isActive}/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <SensorCard name="Fan" value={fanValue} display={fanValue ? "On" : "Off"} Icon={Fan} isActive={isActive}/>
                    <SensorCard name="Detection" value={detectionValue} display={detectionValue + (detectionValue === 1 ? " person" : " people")} Icon={Users} isActive={isActive}/>
                </div>

                <div className="w-auto bg-white/40 rounded-2xl font-bold font-inter text-[#404040] p-[32px]
                    gap-[16px] flex flex-col items-start shadow-lg">
                    <div className="font-bold font-inter text-2xl text-[#404040]">Choose a song!</div>
                    <span className={`font-normal font-inter text-base 
                            ${isActive ? "hover:underline cursor-pointer text-[#404040" : "text-[#909090]"}`}
                            onClick={() => console.log("1")}>
                        1. Happy Birthday
                    </span>
                    <span className={`font-normal font-inter text-base 
                            ${isActive ? "hover:underline cursor-pointer text-[#404040" : "text-[#909090]"}`}
                            onClick={() => console.log("2")}>
                        2. Nokia
                    </span>
                    <span className={`font-normal font-inter text-base 
                            ${isActive ? "hover:underline cursor-pointer text-[#404040" : "text-[#909090]"}`}
                            onClick={() => console.log("3")}>
                        3. Merry Christmas
                    </span>
                </div>
            </div>
        </div>
    </div>
}