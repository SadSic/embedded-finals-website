import { useState } from "react";
import SensorCard from "../component/SensorCard";
import { Thermometer, Droplets, Fan, Users, ChevronDown } from "lucide-react";

export default function MainPage() {

    const modes = ["Auto", "Manual"]
    
    const [showDropdown, setShowDropdown] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState("Auto");

    return <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[linear-gradient(45deg,_#B5728E_0%,_#DA7F7D_25%,_#EBB58A_75%,_#F4D797_100%)]">
        {/* Header */}
        <h1 className="text-[#404040] font-bold font-inter mb-6">Smart Pudlom</h1>

        {/* Card */}
        <div className="relative backdrop-blur-2xl bg-white/30 border border-white/20 rounded-3xl p-10 text-white
            flex flex-row p-[48px] gap-[16px]">

            {/* ESP */}
            <div className="bg-white/30 rounded-2xl font-bold font-inter text-[#404040] p-[32px] flex flex-col items-center justify-between">
                {/* Image */}
                <div className="w-[150px] h-[150px] rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden">
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
                <div className="flex flex-col self-start">
                    <div className="font-bold font-inter text-[#404040] text-md mt-4">
                        Status:
                    </div>
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
                                className="min-w-[100px] h-auto bg-white/90 px-8 py-2 rounded-2xl font-medium text-base text-[#404040] focus:outline-none border-none shadow-lg"
                            >
                                On/Off
                            </button>
                        </div>

                        {/* Dropdownlist */}
                        <div className="relative">
                            <button
                                onClick={() => setShowDropdown(!showDropdown)}
                                className={`w-[125px] h-auto bg-white/90 px-6 py-2 rounded-2xl font-medium text-base transition-all
                                    ${isActive ? "text-[#404040] shadow-lg" : "text-[#909090] shadow-sm"} flex items-center justify-between
                                    gap-2 focus:outline-none border-none`}
                                disabled={!isActive}
                                >
                                {mode}
                                <ChevronDown size={16} className={`transition-transform ${isActive ? "text-[#404040]" : "text-[#909090]"} ${showDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {showDropdown && (
                            <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-xl overflow-hidden z-10">
                                {modes.map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => {
                                            setMode(m)
                                            setShowDropdown(false);
                                        }}
                                        className={`${m == mode ? "text-[#404040]" : "text-[#909090] hover:text-[#404040]"} w-full focus:outline-none border-none shadow-md bg-white hover:bg-[#EFEFEF]`}
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
            <div className="min-w-[424px] bg-white/30 rounded-2xl font-bold font-inter text-[#404040] p-[32px] gap-[16px] flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <SensorCard name="Temperature" value={25.0 + " °C"} Icon={Thermometer}/>
                    <SensorCard name="Humidity" value={50 + " %"} Icon={Droplets}/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <SensorCard name="Fan" value="On" Icon={Fan}/>
                    <SensorCard name="Detection" value={5 + " people"} Icon={Users}/>
                </div>

                <div className="w-auto bg-white/40 rounded-2xl font-bold font-inter text-[#404040] p-[32px] gap-[16px] flex flex-col items-start shadow-lg">
                    <div className="font-bold font-inter text-2xl text-[#404040]">Choose a song!</div>
                    <span className="font-normal font-inter text-base text-[#404040] hover:underline cursor-pointer" onClick={() => console.log("1")}>1. Happy Birthday</span>
                    <span className="font-normal font-inter text-base text-[#404040] hover:underline cursor-pointer" onClick={() => console.log("2")}>2. Nokia</span>
                    <span className="font-normal font-inter text-base text-[#404040] hover:underline cursor-pointer" onClick={() => console.log("3")}>3. Merry Christmas</span>
                </div>
            </div>
        </div>
    </div>
}