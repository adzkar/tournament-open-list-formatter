import { useState } from "react";
import "./App.css";
import {
  copyToClipboard,
  pasteFromClipboard,
  processAndSortSkbText,
} from "./utils/string";

function App() {
  const [text, setText] = useState("");
  const [finalText, setFinalText] = useState("");

  const onProcess = () => {
    const result = processAndSortSkbText(text);
    setFinalText(result);
  };

  return (
    <div className={`bg-[var(--white)] min-h-screen`}>
      <div className="py-4 flex flex-col sm:max-w-[600px] w-[90%] mx-auto">
        <div className="text-2xl font-bold mb-4 text-center">
          Turnamen SKB Open List Formatter
        </div>
        <textarea
          className="w-full min-h-80 border-[1px] border-solid border-gray p-2"
          placeholder="Paste disini listnya"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        ></textarea>

        <div className="flex items-center justify-between space-x-2">
          <button
            className="w-full py-2 mt-2 bg-[var(--salmon-pink)] text-[var(--dark-red)] hover:text-white font-bold hover:bg-[var(--orange-red)] transition-all"
            onClick={() => {
              setText("");
              setFinalText("");
            }}
          >
            <i className="fa-solid fa-broom mr-1"></i>
            Clear
          </button>
          <button
            className="w-full py-2 mt-2 bg-[var(--salmon-pink)] text-[var(--dark-red)] hover:text-white font-bold hover:bg-[var(--orange-red)] transition-all"
            onClick={() => {
              pasteFromClipboard().then((res) => {
                setText(res);
              });
            }}
          >
            <i className="fa-solid fa-paste mr-1"></i>
            Paste
          </button>
        </div>

        <button
          className={`"w-full py-2 mt-2 bg-[var(--dark-red)] text-white font-bold hover:bg-[var(--orange-red)] transition-all ${text.length === 0 ? "opacity-70 cursor-not-allowed" : ""}`}
          disabled={text.length === 0}
          onClick={onProcess}
        >
          <i className="fa-regular fa-floppy-disk mr-1"></i>
          Proses
        </button>

        {finalText.length > 0 && (
          <>
            <div className="border-[0px] border-t-[1px] border-solid border-gray p-2 mt-6" />

            <button
              className={`"w-full py-2 mt-2 bg-[var(--dark-red)] text-white font-bold hover:bg-[var(--orange-red)] transition-all mb-4 ${text.length === 0 ? "opacity-70 cursor-not-allowed" : ""}`}
              disabled={text.length === 0}
              onClick={() => copyToClipboard(finalText)}
            >
              <i className="fa-solid fa-copy mr-1"></i>
              Copy
            </button>

            <div
              className="bg-[var(--pink-pale)] p-2 mt-6"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {finalText}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
