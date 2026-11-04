/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { CustomPlayer } from "@/features/lms/custom-player";
import { LessonPlayerProvider, useLessonPlayer } from "@/features/lms/player-context";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const play = jest.fn().mockResolvedValue(undefined);
const pause = jest.fn();

beforeAll(() => {
  Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: play });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", { configurable: true, value: pause });
  Object.defineProperty(HTMLMediaElement.prototype, "load", { configurable: true, value: jest.fn() });
});
beforeEach(() => { play.mockClear(); pause.mockClear(); localStorage.clear(); global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as never; });

const props: React.ComponentProps<typeof CustomPlayer> = { src: "https://cdn.example.com/a.mp4", mime: "video/mp4", captions: [], title: "Intro", lessonId: "l1", startAt: 0, track: false };

function setup(extra = {}) {
  const utils = render(<LessonPlayerProvider><CustomPlayer {...props} {...extra} /></LessonPlayerProvider>);
  const region = screen.getByRole("region", { name: /video player: intro/i });
  const video = utils.container.querySelector("video") as HTMLVideoElement;
  Object.defineProperty(video, "duration", { configurable: true, value: 600 });
  Object.defineProperty(video, "paused", { configurable: true, value: true, writable: true });
  return { ...utils, region, video };
}

describe("CustomPlayer", () => {
  it("renders the video with its source and the main controls", () => {
    const { video } = setup();
    expect(video.querySelector("source")?.getAttribute("src")).toBe("https://cdn.example.com/a.mp4");
    for (const name of [/play \(k\)/i, /back 10 seconds/i, /forward 10 seconds/i, /mute \(m\)/i, /playback speed/i, /fullscreen \(f\)/i, /^seek$/i, /volume/i]) {
      expect(screen.getAllByLabelText(name).length).toBeGreaterThan(0);
    }
  });

  it("plays and pauses from the keyboard", () => {
    const { region } = setup();
    fireEvent.keyDown(region, { key: " " });
    expect(play).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(region, { key: "k" });
    expect(play).toHaveBeenCalledTimes(2);
  });

  it("seeks with the arrow keys and j/l", () => {
    const { region, video } = setup();
    video.currentTime = 100;
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(video.currentTime).toBe(105);
    fireEvent.keyDown(region, { key: "l" });
    expect(video.currentTime).toBe(115);
    fireEvent.keyDown(region, { key: "j" });
    expect(video.currentTime).toBe(105);
    fireEvent.keyDown(region, { key: "5" });
    expect(video.currentTime).toBe(300);
    fireEvent.keyDown(region, { key: "Home" });
    expect(video.currentTime).toBe(0);
  });

  it("never seeks outside the video", () => {
    const { region, video } = setup();
    video.currentTime = 2;
    fireEvent.keyDown(region, { key: "j" });
    expect(video.currentTime).toBe(0);
    video.currentTime = 598;
    fireEvent.keyDown(region, { key: "l" });
    expect(video.currentTime).toBe(600);
  });

  it("changes and remembers the playback speed", () => {
    const { region, video } = setup();
    fireEvent.keyDown(region, { key: ">" });
    expect(video.playbackRate).toBe(1.25);
    expect(JSON.parse(localStorage.getItem("swl-player-prefs")!).rate).toBe(1.25);
    fireEvent.keyDown(region, { key: "<" });
    fireEvent.keyDown(region, { key: "<" });
    expect(video.playbackRate).toBe(0.75);
  });

  it("opens the speed menu and picks a speed", () => {
    const { video } = setup();
    fireEvent.click(screen.getByLabelText(/playback speed/i));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "2×" }));
    expect(video.playbackRate).toBe(2);
  });

  it("mutes with m", () => {
    const { region, video } = setup();
    fireEvent.keyDown(region, { key: "m" });
    expect(video.muted).toBe(true);
  });

  it("resumes where the learner left off and offers to start over", () => {
    const { video } = setup({ startAt: 125 });
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(125);
    expect(screen.getByText(/resumed at 2:05/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /start over/i }));
    expect(video.currentTime).toBe(0);
  });

  it("does not resume when barely started", () => {
    const { video } = setup({ startAt: 3 });
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(0);
    expect(screen.queryByText(/resumed at/i)).not.toBeInTheDocument();
  });

  it("only saves progress for tracked (enrolled) viewers", () => {
    const { video } = setup({ track: true });
    fireEvent.loadedMetadata(video);
    fireEvent.pause(video);
    expect(global.fetch).toHaveBeenCalledWith("/api/learn/lessons/l1/position", expect.objectContaining({ method: "POST" }));
  });

  it("sends nothing when progress isn't tracked", () => {
    const { video } = setup({ track: false });
    fireEvent.pause(video);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("offers an up-next screen when the video ends", () => {
    const { video } = setup({ next: { href: "/learn/watch/c/2", title: "Lesson two" } });
    fireEvent.ended(video);
    expect(screen.getByText("Lesson two")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play now/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText("Lesson two")).not.toBeInTheDocument();
  });

  it("lists captions and remembers the choice", () => {
    const { region } = setup({ captions: [{ label: "English", lang: "en", url: "https://cdn.example.com/en.vtt" }, { label: "Tamil", lang: "ta", url: "https://cdn.example.com/ta.vtt" }] });
    fireEvent.click(screen.getByLabelText(/captions \(c\)/i));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Tamil" }));
    expect(JSON.parse(localStorage.getItem("swl-player-prefs")!).captions).toBe("ta");
    fireEvent.keyDown(region, { key: "c" });
    expect(JSON.parse(localStorage.getItem("swl-player-prefs")!).captions).toBeNull();
  });

  it("shows a retry when the video fails to load", () => {
    const { video } = setup();
    fireEvent.error(video);
    expect(screen.getByText(/couldn't be loaded/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(screen.queryByText(/couldn't be loaded/i)).not.toBeInTheDocument();
  });

  it("shows the viewer watermark when given one", () => {
    setup({ watermark: "learner@example.com" });
    expect(screen.getByText("learner@example.com")).toBeInTheDocument();
  });

  it("lets other components read the playhead and seek", () => {
    function Probe() {
      const p = useLessonPlayer();
      return <button onClick={() => p.seek(42)}>jump {String(p.currentTime())}</button>;
    }
    const { video } = (() => {
      const utils = render(<LessonPlayerProvider><CustomPlayer {...props} /><Probe /></LessonPlayerProvider>);
      const v = utils.container.querySelector("video") as HTMLVideoElement;
      Object.defineProperty(v, "duration", { configurable: true, value: 600 });
      return { video: v };
    })();
    fireEvent.click(screen.getByRole("button", { name: /^jump/ }));
    expect(video.currentTime).toBe(42);
  });
});
