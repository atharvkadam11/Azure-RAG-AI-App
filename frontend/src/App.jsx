import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Welcome back. I’m your Azure RAG Assistant — I can use your indexed knowledge when relevant and still answer general questions naturally.",
      sources: [],
    },
  ]);
  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const isDark = theme === "dark";

  const samplePrompts = [
    "What is Kubernetes?",
    "Explain Docker in easy words",
    "What is Azure Functions?",
    "What is Terraform?",
    "Summarize the uploaded document.",
  ];

  const askAI = async () => {
    if (!question.trim() || loading) return;

    const currentQuestion = question.trim();

    setMessages((prev) => [
      ...prev,
      { role: "user", text: currentQuestion },
      { role: "assistant", text: "", sources: [] },
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/ask-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: currentQuestion,
          top_k: 3,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Streaming request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let buffer = "";
      let assistantText = "";
      let assistantSources = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          const data = JSON.parse(line);

          if (data.type === "sources") {
            assistantSources = data.sources || [];
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                sources: assistantSources,
              };
              return updated;
            });
          }

          if (data.type === "token") {
            assistantText += data.content;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                text: assistantText,
              };
              return updated;
            });
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          text: "I couldn’t connect to the backend properly. Please make sure the FastAPI server is running.",
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const uploadPdf = async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadMessage("Please upload a PDF file only.");
      return;
    }

    setUploading(true);
    setUploadMessage("");
    setUploadedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      setUploadMessage(data.message || "PDF uploaded successfully.");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Your PDF **${file.name}** was uploaded successfully.\n\nYou can now ask:\n\n- Summarize the uploaded document\n- What is this PDF about?\n- Give key points from the uploaded PDF`,
          sources: [],
        },
      ]);
    } catch (error) {
      setUploadMessage(error.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    await uploadPdf(file);
    e.target.value = "";
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    await uploadPdf(file);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askAI();
    }
  };

  const pageBg = isDark
    ? "bg-[radial-gradient(circle_at_top,_#1e293b_0%,_#0f172a_35%,_#020617_100%)] text-slate-100"
    : "bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f8fafc_45%,_#e2e8f0_100%)] text-slate-900";

  const panel = isDark
    ? "border-white/10 bg-white/5 backdrop-blur-xl"
    : "border-slate-200 bg-white/70 backdrop-blur-xl";

  const subtlePanel = isDark
    ? "border-white/10 bg-black/20 backdrop-blur-xl"
    : "border-slate-200 bg-white/80 backdrop-blur-xl";

  const assistantBubble = isDark
    ? "border-white/10 bg-white/[0.06] text-slate-100 backdrop-blur-xl"
    : "border-slate-200 bg-white text-slate-800";

  const bodyText = isDark ? "text-slate-300" : "text-slate-600";
  const mutedText = isDark ? "text-slate-400" : "text-slate-500";
  const titleText = isDark ? "text-white" : "text-slate-900";

  return (
    <div className={`h-screen overflow-hidden ${pageBg}`}>
      <div className="flex h-full">
        <aside className={`hidden h-full w-80 shrink-0 border-r ${panel} lg:flex lg:flex-col`}>
          <div className={`shrink-0 border-b px-6 py-6 ${isDark ? "border-white/10" : "border-slate-200"}`}>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-500 to-sky-400 shadow-[0_12px_50px_rgba(56,189,248,0.35)]">
                <span className="text-lg font-bold text-white">AI</span>
              </div>
              <div>
                <h1 className={`text-xl font-semibold tracking-tight ${titleText}`}>Azure RAG</h1>
                <p className={`text-sm ${mutedText}`}>Premium Assistant Workspace</p>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className={`mb-4 rounded-3xl border p-4 ${subtlePanel}`}>
              <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${mutedText}`}>
                Smart workflow
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className={`rounded-2xl px-2 py-3 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                  <div className="font-semibold text-blue-500">1</div>
                  <div className={mutedText}>Retrieve</div>
                </div>
                <div className={`rounded-2xl px-2 py-3 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                  <div className="font-semibold text-cyan-500">2</div>
                  <div className={mutedText}>Reason</div>
                </div>
                <div className={`rounded-2xl px-2 py-3 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                  <div className="font-semibold text-emerald-500">3</div>
                  <div className={mutedText}>Respond</div>
                </div>
              </div>
            </div>

            <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.22em] ${mutedText}`}>
              Suggested prompts
            </p>

            <div className="space-y-3">
              {samplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setQuestion(prompt)}
                  className={`group w-full rounded-2xl border px-4 py-4 text-left text-sm transition ${
                    isDark
                      ? "border-white/10 bg-white/5 text-slate-200 hover:border-blue-400/40 hover:bg-blue-500/10"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span>{prompt}</span>
                    <span className="text-blue-500 opacity-0 transition group-hover:opacity-100">↗</span>
                  </div>
                </button>
              ))}
            </div>

            <div className={`mt-6 rounded-3xl border p-4 ${subtlePanel}`}>
              <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.22em] ${mutedText}`}>
                Upload PDF
              </p>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className={`rounded-2xl border border-dashed p-4 text-center transition ${
                  isDark
                    ? "border-white/15 bg-white/5 hover:bg-white/10"
                    : "border-slate-300 bg-white hover:bg-slate-50"
                }`}
              >
                <p className={`text-sm ${bodyText}`}>Drag and drop a PDF here</p>
                <p className={`mt-1 text-xs ${mutedText}`}>or upload from your computer</p>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition hover:opacity-95"
                >
                  {uploading ? "Uploading..." : "Choose PDF"}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {uploadedFileName && (
                  <p className={`mt-3 break-all text-xs ${mutedText}`}>
                    Selected: <span className="font-medium">{uploadedFileName}</span>
                  </p>
                )}

                {uploadMessage && (
                  <p className={`mt-3 text-xs ${uploadMessage.toLowerCase().includes("failed") || uploadMessage.toLowerCase().includes("error") ? "text-red-500" : "text-emerald-500"}`}>
                    {uploadMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className={`shrink-0 border-b ${panel}`}>
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
              <div>
                <h2 className={`text-xl font-semibold tracking-tight ${titleText}`}>
                  Premium Chat Workspace
                </h2>
                <p className={`text-sm ${mutedText}`}>
                  Professional AI UI with Azure-powered retrieval and generation
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isDark
                      ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {isDark ? "☀ Light" : "🌙 Dark"}
                </button>

                <div
                  className={`hidden items-center gap-2 rounded-full px-4 py-2 text-sm sm:flex ${
                    isDark
                      ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                      : "border border-emerald-300 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                  Connected
                </div>
              </div>
            </div>
          </header>

          <section className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 py-6 sm:px-6">
              <div className="space-y-8">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="w-full max-w-3xl">
                      <div
                        className={`rounded-[28px] border px-5 py-4 shadow-2xl ${
                          msg.role === "user"
                            ? "border-blue-400/20 bg-gradient-to-br from-blue-600 to-cyan-500 text-white"
                            : assistantBubble
                        }`}
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${
                              msg.role === "user"
                                ? "bg-white/20 text-white"
                                : isDark
                                ? "bg-slate-700 text-slate-200"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {msg.role === "user" ? "You" : "AI"}
                          </div>

                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {msg.role === "user" ? "You" : "Azure RAG Assistant"}
                            </p>
                            <p className={`text-xs ${msg.role === "user" ? "text-slate-200/80" : mutedText}`}>
                              {msg.role === "user" ? "User message" : "AI response"}
                            </p>
                          </div>

                          {msg.role === "assistant" && msg.text && (
                            <button
                              onClick={() => navigator.clipboard.writeText(msg.text)}
                              className={`rounded-full border px-3 py-1 text-xs transition ${
                                isDark
                                  ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              Copy
                            </button>
                          )}
                        </div>

                        <div className={`prose prose-sm sm:prose-base max-w-none ${isDark ? "prose-invert" : ""}`}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.text || ""}
                          </ReactMarkdown>
                        </div>
                      </div>

                      {msg.role === "assistant" && msg.text && msg.sources?.length > 0 && (
                        <div className={`mt-4 rounded-3xl border p-4 ${subtlePanel}`}>
                          <div className="mb-3 flex items-center justify-between">
                            <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedText}`}>
                              Retrieved sources
                            </p>
                            <span className={`rounded-full px-3 py-1 text-xs ${
                              isDark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"
                            }`}>
                              {msg.sources.length} found
                            </span>
                          </div>

                          <div className="space-y-3">
                            {msg.sources.map((source, i) => (
                              <div
                                key={i}
                                className={`rounded-2xl border p-4 ${
                                  isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
                                }`}
                              >
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs text-blue-500">
                                    {source.source}
                                  </span>
                                  {source.score && (
                                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-500">
                                      Score {Number(source.score).toFixed(2)}
                                    </span>
                                  )}
                                </div>

                                <p className={`text-sm leading-6 ${bodyText}`}>{source.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className={`w-full max-w-3xl rounded-[28px] border px-5 py-4 shadow-2xl ${assistantBubble}`}>
                      <div className="mb-3 flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${
                          isDark ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-700"
                        }`}>
                          AI
                        </div>
                        <div>
                          <p className="text-sm font-medium">Azure RAG Assistant</p>
                          <p className={`text-xs ${mutedText}`}>Generating response</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]"></span>
                        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:-0.15s]"></span>
                        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-sky-300"></span>
                        <span className={`ml-2 text-sm ${mutedText}`}>Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </section>

          <footer className={`shrink-0 border-t ${panel}`}>
            <div className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6">
              <div className={`rounded-[30px] border p-3 shadow-[0_20px_80px_rgba(0,0,0,0.18)] ${subtlePanel}`}>
                <div className="flex items-end gap-3">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message your premium assistant..."
                    rows={1}
                    className={`max-h-40 min-h-[60px] flex-1 resize-none rounded-2xl bg-transparent px-4 py-4 outline-none ${
                      isDark ? "text-slate-100 placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400"
                    }`}
                  />

                  <button
                    onClick={askAI}
                    disabled={loading || !question.trim()}
                    className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 font-medium text-white shadow-lg shadow-blue-600/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>

                <div className={`mt-2 flex items-center justify-between px-2 text-xs ${mutedText}`}>
                  <span>
                    Press <span className="font-semibold">Enter</span> to send
                  </span>
                  <span>
                    <span className="font-semibold">Shift + Enter</span> for newline
                  </span>
                </div>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}