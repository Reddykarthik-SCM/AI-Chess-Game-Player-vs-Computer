import React, { useEffect, useRef } from 'react';

interface MoveHistoryProps {
  history: string[];
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ history }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  // Group moves into pairs (White, Black)
  const movePairs = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      white: history[i],
      black: history[i + 1] || '',
      number: Math.floor(i / 2) + 1,
    });
  }

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 flex flex-col h-full max-h-[300px] md:max-h-full overflow-hidden">
      <div className="p-3 bg-slate-900 border-b border-slate-700 font-bold text-slate-200 sticky top-0">
        Match History
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
        <table className="w-full text-sm text-left text-slate-300">
          <thead className="text-xs uppercase bg-slate-800 text-slate-400 sticky top-0">
            <tr>
              <th className="px-2 py-1 w-12">#</th>
              <th className="px-2 py-1">White</th>
              <th className="px-2 py-1">Black</th>
            </tr>
          </thead>
          <tbody>
            {movePairs.map((pair) => (
              <tr key={pair.number} className="odd:bg-slate-800/50 even:bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                <td className="px-2 py-1 text-slate-500 font-mono">{pair.number}.</td>
                <td className="px-2 py-1 font-medium text-white">{pair.white}</td>
                <td className="px-2 py-1 font-medium text-slate-300">{pair.black}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={3} className="px-2 py-4 text-center text-slate-500 italic">
                  Game start
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};