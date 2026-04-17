import { useState } from 'react';
import Game from './components/Game.tsx';
import { ToastContainer } from 'react-toastify';
import helpImg from '../assets/help.svg';
import ReactModal from 'react-modal';
import MusicButton from './components/buttons/MusicButton.tsx';
import Button from './components/buttons/Button.tsx';
import InteractButton from './components/buttons/InteractButton.tsx';
import LoginScreen from './components/LoginScreen.tsx';
import { MAX_HUMAN_PLAYERS } from '../convex/constants.ts';

interface AuthSession {
  username: string;
  displayName: string;
  familyCode: string;
  loginStreak: number;
  isFirstVisitToday: boolean;
}

// Restore session from localStorage so refresh doesn't log you out
function getSavedSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem('haven_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Home() {
  const [session, setSession] = useState<AuthSession | null>(getSavedSession);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [showStreak, setShowStreak] = useState(false);

  function handleLogin(s: AuthSession) {
    localStorage.setItem('haven_session', JSON.stringify(s));
    // Stable clientToken = username so agent memories persist across sessions
    localStorage.setItem('haven_client_token', s.username);
    localStorage.setItem('haven_player_name', s.displayName);
    setSession(s);
    if (s.isFirstVisitToday && s.loginStreak > 1) setShowStreak(true);
  }

  function handleLogout() {
    localStorage.removeItem('haven_session');
    setSession(null);
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between font-body game-background">
      <ReactModal
        isOpen={helpModalOpen}
        onRequestClose={() => setHelpModalOpen(false)}
        style={modalStyles}
        contentLabel="Help modal"
        ariaHideApp={false}
      >
        <div className="font-body">
          <h1 className="text-center text-6xl font-bold font-display game-title">Welcome to HAVEN</h1>
          <p className="mt-4">
            HAVEN is a safe, friendly space where you can talk to caring companions
            who are always ready to listen and help.
          </p>
          <h2 className="text-4xl mt-4">How to Play</h2>
          <p className="mt-2">
            Click and drag to move around the town. Click on any companion to see who they are.
          </p>
          <h2 className="text-4xl mt-4">Talking to Friends</h2>
          <p className="mt-2">
            Click the <strong>"Interact"</strong> button below to join the town! Your character will
            appear on the map. Click on any companion and then click <strong>"Start conversation"</strong>
            to begin chatting — or wait a couple of minutes for a companion to walk up to you! 💜
          </p>
          <p className="mt-4">
            You can talk about anything — how your day went, things that make you
            happy or worried, or just have fun! Your friends here always have time for you.
          </p>
          <p className="mt-4 text-sm opacity-70">
            HAVEN supports {MAX_HUMAN_PLAYERS} visitors at a time.
          </p>
        </div>
      </ReactModal>

      {/* Streak toast */}
      {showStreak && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-purple-900 border border-purple-500 rounded-2xl px-6 py-4 text-white text-center shadow-2xl cursor-pointer"
          onClick={() => setShowStreak(false)}
        >
          <p className="text-2xl">🔥</p>
          <p className="font-bold">{session.loginStreak} day streak!</p>
          <p className="text-sm text-purple-300">Keep coming back, {session.displayName}!</p>
        </div>
      )}

      <div className="w-full lg:h-screen min-h-screen relative isolate overflow-hidden shadow-2xl flex flex-col justify-start">
        <div className="relative flex items-center justify-center px-4 pt-4 h-24 sm:h-32 mb-4">
          <h1 className="text-5xl sm:text-8xl lg:text-9xl font-bold font-display leading-none tracking-wide game-title z-10 text-center">
            HAVEN
          </h1>
          {/* User info + logout */}
          <div className="absolute top-4 right-4 text-right text-xs text-gray-400 flex flex-col items-end gap-1 z-20">
            <span className="text-white font-bold">{session.displayName}</span>
            <span className="text-gray-500">@{session.username}</span>
            {session.loginStreak > 1 && <span className="text-purple-400">🔥 {session.loginStreak} day streak</span>}
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-400 transition-colors text-xs mt-1 bg-transparent"
            >
              Log out
            </button>
          </div>
        </div>

        <div className="max-w-xs md:max-w-xl lg:max-w-none mx-auto text-center text-base sm:text-xl md:text-2xl text-white leading-tight shadow-solid px-4">
          A safe space where friendly companions listen, chat and care.
        </div>

        <Game />

        <footer className="justify-end bottom-0 left-0 w-full flex items-center mt-1 gap-3 p-4 flex-wrap pointer-events-none">
          <div className="flex gap-4 flex-grow pointer-events-none">
            <MusicButton />
            <InteractButton />
            <Button imgUrl={helpImg} onClick={() => setHelpModalOpen(true)}>
              Help
            </Button>
          </div>
        </footer>
        <ToastContainer position="bottom-right" autoClose={2000} closeOnClick theme="dark" />
      </div>
    </main>
  );
}

const modalStyles = {
  overlay: { backgroundColor: 'rgb(0, 0, 0, 75%)', zIndex: 12 },
  content: {
    top: '50%', left: '50%', right: 'auto', bottom: 'auto',
    marginRight: '-50%', transform: 'translate(-50%, -50%)',
    maxWidth: '50%', border: '10px solid rgb(23, 20, 33)',
    borderRadius: '0', background: 'rgb(35, 38, 58)',
    color: 'white', fontFamily: '"Upheaval Pro", "sans-serif"',
  },
};
