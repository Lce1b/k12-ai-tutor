"use client";

interface GradeSelectorProps {
  grade: string;
  onGradeChange: (grade: string) => void;
}

const GRADES = [
  { id: "primary_low", label: "小学低年级", icon: "🌱", desc: "1-3年级" },
  { id: "primary_high", label: "小学高年级", icon: "🌿", desc: "4-6年级" },
  { id: "middle", label: "初中", icon: "🌳", desc: "7-9年级" },
  { id: "high", label: "高中", icon: "🌲", desc: "10-12年级" },
];

export default function GradeSelector({ grade, onGradeChange }: GradeSelectorProps) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
        年级选择
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {GRADES.map((g) => {
          const isActive = grade === g.id;
          return (
            <button
              key={g.id}
              onClick={() => onGradeChange(g.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl text-xs transition-all ${
                isActive
                  ? "bg-edu-primary text-white shadow-md shadow-blue-200 dark:shadow-blue-900/30 scale-[1.02]"
                  : "bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600"
              }`}
            >
              <span className="text-lg">{g.icon}</span>
              <span className="font-medium whitespace-nowrap">{g.label}</span>
              <span className={`text-[10px] ${isActive ? "text-blue-100" : "text-slate-400 dark:text-slate-500"}`}>
                {g.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
