import { useState, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ConvexError } from 'convex/values';

type Screen = 'home' | 'login' | 'register' | 'success';

interface AuthSession {
    username: string;
    displayName: string;
    familyCode: string;
    loginStreak: number;
    isFirstVisitToday: boolean;
}

interface LoginScreenProps {
    onLogin: (session: AuthSession) => void;
}

// Shared background style using the game's background.webp
const bgStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: `linear-gradient(rgba(10, 8, 24, 0.72), rgba(10, 8, 24, 0.82)), url(/assets/background.webp)`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    backgroundRepeat: 'no-repeat',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    gap: '28px',
};

// Reusable pixel-art card wrapper
function GameCard({ children, green }: { children: React.ReactNode; green?: boolean }) {
    return (
        <div style={{
            width: '100%',
            maxWidth: '380px',
            background: 'rgba(20, 16, 40, 0.92)',
            border: `2px solid ${green ? '#3a6e3a' : '#4a3878'}`,
            borderRadius: '4px',
            padding: '32px 28px',
            boxShadow: `0 0 0 1px ${green ? '#2a5e2a' : '#2c1f5c'}, 0 16px 48px rgba(0,0,0,0.6)`,
            backdropFilter: 'blur(4px)',
        }}>
            {children}
        </div>
    );
}

// PIN input — 4 separate pixel-art boxes
function PinInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

    const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !value[i] && i > 0) {
            refs[i - 1].current?.focus();
            onChange(value.slice(0, i - 1));
        }
    };

    const handleChange = (i: number, digit: string) => {
        if (!/^\d?$/.test(digit)) return;
        const arr = value.split('');
        arr[i] = digit;
        const next = arr.join('').slice(0, 4);
        onChange(next);
        if (digit && i < 3) refs[i + 1].current?.focus();
    };

    return (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {[0, 1, 2, 3].map((i) => (
                <input
                    key={i}
                    ref={refs[i]}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={value[i] || ''}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKey(i, e)}
                    style={{
                        width: '52px',
                        height: '52px',
                        textAlign: 'center',
                        fontSize: '24px',
                        fontFamily: "'VCR OSD Mono', monospace",
                        background: 'rgba(30, 20, 60, 0.9)',
                        border: '2px solid #5a4a8a',
                        borderRadius: '4px',
                        color: '#c8b4ff',
                        outline: 'none',
                        caretColor: 'transparent',
                        transition: 'border-color 0.15s',
                        boxShadow: value[i] ? '0 0 0 2px rgba(130,90,255,0.3)' : 'none',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#a080ff'; }}
                    onBlur={(e) => { e.target.style.borderColor = value[i] ? '#7060c0' : '#5a4a8a'; }}
                />
            ))}
        </div>
    );
}

// Shared text input style
function GameInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#a090c8', marginBottom: '8px', fontFamily: "'VCR OSD Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {label}
            </label>
            <input
                {...props}
                style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px',
                    background: 'rgba(30, 20, 60, 0.9)',
                    border: '2px solid #5a4a8a',
                    borderRadius: '4px',
                    color: '#e8e0ff',
                    fontFamily: "'VCR OSD Mono', monospace",
                    fontSize: '14px',
                    outline: 'none',
                    ...props.style,
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#a080ff'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#5a4a8a'; }}
            />
        </div>
    );
}

// Primary button
function GameButton({ children, onClick, disabled, type, variant = 'primary' }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'submit' | 'button';
    variant?: 'primary' | 'secondary' | 'ghost';
}) {
    const colors = {
        primary: { bg: '#5a35b0', hover: '#7048d0', border: '#7a55d0', shadow: 'rgba(90,53,176,0.4)' },
        secondary: { bg: '#1e1a38', hover: '#2c2650', border: '#4a3878', shadow: 'rgba(0,0,0,0.4)' },
        ghost: { bg: 'transparent', hover: 'rgba(255,255,255,0.05)', border: 'transparent', shadow: 'none' },
    }[variant];

    return (
        <button
            type={type || 'button'}
            disabled={disabled}
            onClick={onClick}
            style={{
                width: '100%',
                padding: '13px',
                background: disabled ? 'rgba(60,50,100,0.4)' : colors.bg,
                border: `2px solid ${disabled ? '#3a3060' : colors.border}`,
                borderRadius: '4px',
                color: disabled ? '#6a5a90' : '#e8e0ff',
                fontFamily: "'VCR OSD Mono', monospace",
                fontSize: '14px',
                fontWeight: 'bold',
                letterSpacing: '0.05em',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                boxShadow: disabled ? 'none' : `0 4px 16px ${colors.shadow}`,
                opacity: disabled ? 0.6 : 1,
            }}
            onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = colors.hover; }}
            onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = colors.bg; }}
        >
            {children}
        </button>
    );
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
    const [screen, setScreen] = useState<Screen>('home');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [loginUsername, setLoginUsername] = useState('');
    const [loginPin, setLoginPin] = useState('');

    const [regUsername, setRegUsername] = useState('');
    const [regDisplayName, setRegDisplayName] = useState('');
    const [regPin, setRegPin] = useState('');
    const [regFamilyCode, setRegFamilyCode] = useState('');

    const loginUser = useMutation(api.auth.loginUser);
    const registerUser = useMutation(api.auth.registerUser);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        if (!loginUsername.trim() || loginPin.length !== 4) return;
        setError('');
        setLoading(true);
        try {
            const result = await loginUser({ username: loginUsername.trim(), pin: loginPin });
            onLogin(result as AuthSession);
        } catch (err: any) {
            const msg = err instanceof ConvexError ? err.data : (err?.message || 'Something went wrong');
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();
        if (!regUsername.trim() || !regDisplayName.trim() || regPin.length !== 4) return;
        setError('');
        setLoading(true);
        try {
            const result = await registerUser({ username: regUsername.trim(), displayName: regDisplayName.trim(), pin: regPin });
            setRegFamilyCode((result as any).familyCode);
            setScreen('success');
        } catch (err: any) {
            const msg = err instanceof ConvexError ? err.data : (err?.message || 'Something went wrong');
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    function enterAsRegistered() {
        onLogin({ username: regUsername, displayName: regDisplayName, familyCode: regFamilyCode, loginStreak: 1, isFirstVisitToday: true });
    }

    // ── Home ─────────────────────────────────────────────────────────────────
    if (screen === 'home') {
        return (
            <div style={bgStyle}>
                {/* Stars / sparkle decoration */}
                <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
                    {['10% 15%', '85% 20%', '50% 8%', '25% 80%', '72% 75%', '60% 40%', '15% 55%', '90% 60%'].map((pos, i) => (
                        <span key={i} style={{
                            position: 'absolute', left: pos.split(' ')[0], top: pos.split(' ')[1],
                            color: '#c8b4ff', fontSize: i % 2 === 0 ? '10px' : '14px', opacity: 0.4,
                            animation: `pulse ${2 + i * 0.3}s ease-in-out infinite alternate`,
                        }}>✦</span>
                    ))}
                </div>

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px', width: '100%' }}>
                    <div style={{ textAlign: 'center' }}>
                        <h1 className="game-title" style={{ fontFamily: "'Upheaval Pro', sans-serif", fontSize: 'clamp(56px, 12vw, 96px)', margin: 0, lineHeight: 1 }}>
                            HAVEN
                        </h1>
                        <p style={{ color: '#b8a8e0', fontFamily: "'VCR OSD Mono', monospace", fontSize: '13px', marginTop: '12px', maxWidth: '300px', lineHeight: 1.7, letterSpacing: '0.04em' }}>
                            A safe, magical place where friendly companions are always ready to listen 🌿
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px' }}>
                        <GameButton onClick={() => setScreen('login')} variant="primary">
                            ✨ Enter HAVEN
                        </GameButton>
                        <GameButton onClick={() => setScreen('register')} variant="secondary">
                            🌱 I'm new here!
                        </GameButton>
                    </div>

                    <p style={{ color: '#5a4a7a', fontFamily: "'VCR OSD Mono', monospace", fontSize: '10px', letterSpacing: '0.06em', textAlign: 'center' }}>
                        HAVEN — A safe space for children to express themselves
                    </p>
                </div>

                <style>{`@keyframes pulse { from { opacity: 0.2; } to { opacity: 0.6; } }`}</style>
            </div>
        );
    }

    // ── Login ─────────────────────────────────────────────────────────────────
    if (screen === 'login') {
        return (
            <div style={bgStyle}>
                <h1 className="game-title" style={{ fontFamily: "'Upheaval Pro', sans-serif", fontSize: '52px', margin: 0 }}>HAVEN</h1>
                <GameCard>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <p style={{ fontSize: '28px', margin: '0 0 6px' }}>👋</p>
                        <h2 style={{ color: '#e8e0ff', fontFamily: "'Upheaval Pro', sans-serif", fontSize: '22px', margin: '0 0 6px' }}>Welcome Back!</h2>
                        <p style={{ color: '#7a6aa0', fontFamily: "'VCR OSD Mono', monospace", fontSize: '11px', margin: 0 }}>Enter your username and secret PIN</p>
                    </div>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <GameInput
                            label="Username"
                            type="text"
                            value={loginUsername}
                            onChange={(e) => setLoginUsername(e.target.value)}
                            placeholder="e.g. starfish99"
                            autoComplete="username"
                        />
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', color: '#a090c8', marginBottom: '10px', fontFamily: "'VCR OSD Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                Secret PIN
                            </label>
                            <PinInput value={loginPin} onChange={setLoginPin} />
                        </div>
                        {error && (
                            <p style={{ color: '#ff7070', background: 'rgba(180,40,40,0.2)', border: '1px solid rgba(180,40,40,0.4)', borderRadius: '4px', padding: '10px 14px', fontFamily: "'VCR OSD Mono', monospace", fontSize: '12px', margin: 0, textAlign: 'center' }}>
                                {error}
                            </p>
                        )}
                        <GameButton type="submit" disabled={loading || !loginUsername.trim() || loginPin.length !== 4} variant="primary">
                            {loading ? '✨ Loading...' : '✨ Enter HAVEN'}
                        </GameButton>
                    </form>
                    <div style={{ marginTop: '16px' }}>
                        <GameButton onClick={() => { setScreen('home'); setError(''); setLoginPin(''); }} variant="ghost">
                            ← Back
                        </GameButton>
                    </div>
                </GameCard>
            </div>
        );
    }

    // ── Register ─────────────────────────────────────────────────────────────
    if (screen === 'register') {
        return (
            <div style={{ ...bgStyle, justifyContent: 'flex-start', paddingTop: '40px', paddingBottom: '40px' }}>
                <h1 className="game-title" style={{ fontFamily: "'Upheaval Pro', sans-serif", fontSize: '52px', margin: 0 }}>HAVEN</h1>
                <GameCard>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <p style={{ fontSize: '28px', margin: '0 0 6px' }}>🌱</p>
                        <h2 style={{ color: '#e8e0ff', fontFamily: "'Upheaval Pro', sans-serif", fontSize: '22px', margin: '0 0 6px' }}>Join HAVEN!</h2>
                        <p style={{ color: '#7a6aa0', fontFamily: "'VCR OSD Mono', monospace", fontSize: '11px', margin: 0 }}>Create your account — takes 30 seconds</p>
                    </div>
                    <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <GameInput
                            label="Your name (shown in game)"
                            type="text"
                            value={regDisplayName}
                            onChange={(e) => setRegDisplayName(e.target.value)}
                            placeholder="e.g. Alice"
                            maxLength={20}
                        />
                        <GameInput
                            label="Username (letters, numbers, _)"
                            type="text"
                            value={regUsername}
                            onChange={(e) => setRegUsername(e.target.value.toLowerCase())}
                            placeholder="e.g. starfish99"
                            maxLength={20}
                            autoComplete="username"
                            style={{ textTransform: 'lowercase' }}
                        />
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', color: '#a090c8', marginBottom: '10px', fontFamily: "'VCR OSD Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                Choose a 4-digit PIN
                            </label>
                            <PinInput value={regPin} onChange={setRegPin} />
                            <p style={{ color: '#5a4a7a', fontFamily: "'VCR OSD Mono', monospace", fontSize: '10px', textAlign: 'center', marginTop: '8px' }}>
                                Only you (and your parent) will know this
                            </p>
                        </div>
                        {error && (
                            <p style={{ color: '#ff7070', background: 'rgba(180,40,40,0.2)', border: '1px solid rgba(180,40,40,0.4)', borderRadius: '4px', padding: '10px 14px', fontFamily: "'VCR OSD Mono', monospace", fontSize: '12px', margin: 0, textAlign: 'center' }}>
                                {error}
                            </p>
                        )}
                        <GameButton type="submit" disabled={loading || !regUsername.trim() || !regDisplayName.trim() || regPin.length !== 4} variant="primary">
                            {loading ? '🌱 Creating account...' : '🌱 Create My Account'}
                        </GameButton>
                    </form>
                    <div style={{ marginTop: '16px' }}>
                        <GameButton onClick={() => { setScreen('home'); setError(''); setRegPin(''); }} variant="ghost">
                            ← Back
                        </GameButton>
                    </div>
                </GameCard>
            </div>
        );
    }

    // ── Success / Family Code reveal ──────────────────────────────────────────
    return (
        <div style={bgStyle}>
            <h1 className="game-title" style={{ fontFamily: "'Upheaval Pro', sans-serif", fontSize: '52px', margin: 0 }}>HAVEN</h1>
            <GameCard green>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '36px', margin: '0 0 8px' }}>🎉</p>
                    <h2 style={{ color: '#e8e0ff', fontFamily: "'Upheaval Pro', sans-serif", fontSize: '20px', margin: '0 0 8px' }}>
                        Welcome, {regDisplayName}!
                    </h2>
                    <p style={{ color: '#7a6aa0', fontFamily: "'VCR OSD Mono', monospace", fontSize: '11px', margin: '0 0 24px' }}>
                        Share this code with your parent:
                    </p>

                    {/* Family code box */}
                    <div style={{
                        background: 'rgba(40, 20, 80, 0.9)',
                        border: '2px solid #7a50d0',
                        borderRadius: '4px',
                        padding: '20px',
                        marginBottom: '20px',
                        boxShadow: '0 0 20px rgba(120,80,220,0.2)',
                    }}>
                        <p style={{ color: '#a080d0', fontFamily: "'VCR OSD Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                            🔑 Your Family Code
                        </p>
                        <p style={{ color: '#ffffff', fontFamily: "'Upheaval Pro', sans-serif", fontSize: '36px', letterSpacing: '0.25em', margin: '0 0 8px' }}>
                            {regFamilyCode}
                        </p>
                        <p style={{ color: '#7a60b0', fontFamily: "'VCR OSD Mono', monospace", fontSize: '10px', margin: 0 }}>
                            Parents use this on the dashboard
                        </p>
                    </div>

                    <div style={{ background: 'rgba(20, 16, 40, 0.8)', borderRadius: '4px', padding: '14px', textAlign: 'left', marginBottom: '20px', border: '1px solid #3a2e5a' }}>
                        {['Your username: ' + regUsername, 'Give your parent the Family Code above', 'Never share your PIN with anyone!'].map((line, i) => (
                            <p key={i} style={{ color: '#b0a0d0', fontFamily: "'VCR OSD Mono', monospace", fontSize: '11px', margin: i === 0 ? 0 : '8px 0 0' }}>
                                ✅ {line}
                            </p>
                        ))}
                    </div>

                    <GameButton onClick={enterAsRegistered} variant="primary">
                        ✨ Enter HAVEN Now!
                    </GameButton>
                </div>
            </GameCard>
        </div>
    );
}
