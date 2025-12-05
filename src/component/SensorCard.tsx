import { type LucideIcon } from "lucide-react";

export default function SensorCard({name, value, Icon, isActive}:
    {name: String, value: String, Icon: LucideIcon, isActive: Boolean}) {
    return <div className="h-[102px] w-[172px] bg-white/40 rounded-2xl p-[16px] flex flex-col items-start
                shadow-lg">
        <div className="flex items-center gap-2">
            <Icon className='w-6 h-6' />
            <span className="font-normal font-inter text-base text-[#404040]">{name}</span>
        </div>

        <div className={`font-bold font-inter text-2xl "text-[#404040]" px-2 mt-4`}>
            {isActive ? value : "-"}
        </div>
    </div>
}