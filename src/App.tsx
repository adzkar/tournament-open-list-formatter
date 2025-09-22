import { useState } from "react";
import "./App.css";

function App() {
  const [text, setText] = useState("");

  return (
    <div className={`bg-[var(--white)] min-h-screen`}>
      <div className="py-4 flex flex-col sm:max-w-[600px] w-[90%] mx-auto">
        <div className="text-2xl font-bold mb-4 text-center">
          Turnamen SKB Open List Formatter
        </div>
        <textarea
          className="w-full min-h-64 border-[1px] border-solid border-gray p-2"
          placeholder="Paste disini listnya"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        ></textarea>

        <div className="flex items-center justify-between space-x-2">
          <button className="w-full py-2 mt-2 bg-[var(--salmon-pink)] text-[var(--dark-red)] hover:text-white font-bold hover:bg-[var(--orange-red)] transition-all">
            Clear
          </button>
          <button className="w-full py-2 mt-2 bg-[var(--salmon-pink)] text-[var(--dark-red)] hover:text-white font-bold hover:bg-[var(--orange-red)] transition-all">
            Paste
          </button>
        </div>

        <button
          className="w-full py-2 mt-2 bg-[var(--dark-red)] text-white font-bold hover:bg-[var(--orange-red)] transition-all"
          disabled={text.length === 0}
        >
          Proses
        </button>
      </div>
    </div>
  );
}

export default App;
