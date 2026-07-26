import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import RatMascot from "./RatMascot.jsx";

const GREETING =
  "Hi, I'm Rat! Show me a look from your try-ons and ask what I think — fit, colors, contrast, anything. I'll always be kind about it.";

const QUICK_PROMPTS = ["Does this fit my body type?", "Do the colors work together?", "How's the contrast on me?"];

// Floating chat launcher + panel, fixed to the bottom-right corner of
// whichever page renders it. `context` (optional) is the try-on result the
// user is currently asking about — set by a parent page via an "Ask Rat"
// button so Rat can look at that specific photo. `focusToken` is a value
// that changes every time the parent wants to force the panel open (e.g.
// after the user clicks "Ask Rat about this look").
export default function RatChatWidget({ context = null, focusToken = 0 }) {
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mascotState, setMascotState] = useState("idle");
  const listRef = useRef(null);
  const talkTimeout = useRef(null);

  useEffect(() => {
    api
      .getChatConfig()
      .then((c) => setConfigured(c.configured))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (focusToken) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusToken]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "rat", text: GREETING }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy]);

  useEffect(() => () => clearTimeout(talkTimeout.current), []);

  async function send(text) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const history = messages;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setBusy(true);
    setMascotState("thinking");

    try {
      const { reply } = await api.sendChatMessage({
        message: trimmed,
        history,
        tryon_result_id: context?.id || null,
      });
      setMessages((prev) => [...prev, { role: "rat", text: reply }]);
      setMascotState("talking");
      talkTimeout.current = setTimeout(() => setMascotState("idle"), 1400);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "rat", text: "Oops, I got a little tongue-tied — mind trying again?" }]);
      setMascotState("idle");
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="rat-chat">
      {open && (
        <div className="rat-chat__panel">
          <div className="rat-chat__header">
            <RatMascot state={mascotState} className="rat-chat__header-mascot" />
            <div className="rat-chat__header-text">
              <strong>Rat</strong>
              <p>Your kind style sidekick</p>
            </div>
            <button type="button" className="rat-chat__close" onClick={() => setOpen(false)} aria-label="Close chat">
              ×
            </button>
          </div>

          {context && <div className="rat-chat__context">Talking about: <strong>{context.label}</strong></div>}

          {!configured && (
            <p className="rat-chat__notice">
              My chat brain isn't set up yet — ask the app owner to add a Gemini API key.
            </p>
          )}

          <div className="rat-chat__messages" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`rat-chat__bubble rat-chat__bubble--${m.role}`}>
                {m.text}
              </div>
            ))}
            {busy && <div className="rat-chat__bubble rat-chat__bubble--rat rat-chat__bubble--typing">···</div>}
          </div>

          <div className="rat-chat__quick">
            {QUICK_PROMPTS.map((q) => (
              <button type="button" key={q} onClick={() => send(q)} disabled={busy}>
                {q}
              </button>
            ))}
          </div>

          <form className="rat-chat__input-row" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Ask Rat about your outfit…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" disabled={busy || !input.trim()}>Send</button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="rat-chat__launcher"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat with Rat" : "Chat with Rat"}
      >
        <RatMascot state={open ? "wave" : "idle"} />
      </button>
    </div>
  );
}
