import { useEffect, useRef, useState } from "react";

interface UseTypewriterOptions {
  strings: string[];
  speed?: {
    typingSpeed?: number;
    deletingSpeed?: number;
    pauseAfterWord?: number;
    pauseAfterDelete?: number;
  };
}

export default function useTypewriter({
  strings,
  speed: {
    typingSpeed = 110,
    deletingSpeed = 60,
    pauseAfterWord = 140,
    pauseAfterDelete = 400,
  } = {},
}: UseTypewriterOptions) {
  const [text, setText] = useState<string>("");
  const state = useRef({ i: 0, charIdx: 0, deleting: false });

  useEffect(() => {
    let timer: number;

    function tick() {
      const { i, charIdx, deleting } = state.current;
      const current = strings[i];

      if (!deleting) {
        const next = charIdx + 1;
        setText(current.slice(0, next));
        state.current.charIdx = next;

        if (next === current.length) {
          state.current.deleting = true;
          timer = setTimeout(tick, pauseAfterWord);
          return;
        }
      } else {
        const next = charIdx - 1;
        setText(current.slice(0, next));
        state.current.charIdx = next;

        if (next === 0) {
          state.current.deleting = false;
          state.current.i = (i + 1) % strings.length;
          timer = setTimeout(tick, pauseAfterDelete);
          return;
        }
      }

      timer = setTimeout(
        tick,
        state.current.deleting ? deletingSpeed : typingSpeed,
      );
    }

    timer = setTimeout(tick, typingSpeed);
    return () => clearTimeout(timer);
  }, [strings, typingSpeed, deletingSpeed, pauseAfterWord, pauseAfterDelete]);

  return text;
}
