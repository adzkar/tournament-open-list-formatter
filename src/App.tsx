import { useState } from "react";
import "./App.css";
import {
  copyToClipboard,
  pasteFromClipboard,
  processAndSortText,
} from "./utils/string";
import { getIsSafari } from "./utils/browser";

function App() {
  const [text, setText] = useState("");
  const [finalText, setFinalText] = useState("");

  const onProcess = () => {
    const result = processAndSortText(text);
    setFinalText(result);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="py-8 flex flex-col sm:max-w-[600px] w-[90%] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="text-2xl font-bold text-center text-blue-600 mb-1">
            Turnamen Open List Formatter
          </div>
          <div className="h-px bg-blue-100 w-full" />
        </div>

        {/* Instructions */}
        <div className="text-left text-sm text-gray-500 mb-4 bg-blue-50 border-[1px] border-solid border-blue-100 rounded-lg p-3">
          Cara penggunaan:
          <ul className="list-decimal list-inside mt-1 space-y-0.5">
            <li>Paste teks list peserta dari halaman list di Turnamen.</li>
            <li>
              Klik tombol{" "}
              <span className="font-semibold text-blue-600">Proses</span>.
            </li>
            <li>Teks sudah terformat sesuai dengan aturan Turnamen.</li>
            <li>Copy teks yang sudah terformat.</li>
          </ul>
        </div>

        {/* Textarea */}
        <textarea
          className="w-full min-h-80 border-[1px] border-solid border-gray-300 rounded-lg p-3 bg-white text-black text-sm focus:outline-none focus:border-blue-400 transition-colors duration-150"
          placeholder="Paste disini listnya"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />

        {/* Secondary actions */}
        <div className="flex items-center justify-between gap-2 mt-2">
          <button
            className="w-full py-2 border-[1px] border-solid border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 bg-white transition-colors duration-150 cursor-pointer"
            onClick={() => {
              setText("");
              setFinalText("");
            }}
          >
            <i className="fa-solid fa-broom mr-1"></i>
            Clear
          </button>

          {!getIsSafari() && (
            <button
              className="w-full py-2 border-[1px] border-solid border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 bg-white transition-colors duration-150 cursor-pointer"
              onClick={() => {
                pasteFromClipboard().then((res) => {
                  setText(res ?? "");
                });
              }}
            >
              <i className="fa-solid fa-paste mr-1"></i>
              Paste
            </button>
          )}
        </div>

        {/* Primary action */}
        <button
          className={`w-full py-2 mt-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-150 cursor-pointer ${text.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={text.length === 0}
          onClick={onProcess}
        >
          <i className="fa-regular fa-floppy-disk mr-1"></i>
          Proses
        </button>

        {/* Result */}
        {finalText.length > 0 && (
          <>
            <div className="h-px bg-gray-200 mt-8 mb-4" />

            <button
              className={`w-full py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-150 mb-4 cursor-pointer ${text.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={text.length === 0}
              onClick={() => copyToClipboard(finalText)}
            >
              <i className="fa-solid fa-copy mr-1"></i>
              Copy
            </button>

            <div
              className="bg-white border-[1px] border-solid border-gray-200 rounded-lg p-3 text-sm text-black"
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
